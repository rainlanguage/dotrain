use serde::{Serialize, Deserialize};
use rain_metadata::types::authoring::v1::AuthoringMeta;
use super::{
    super::{
        error::{Error, ErrorCode},
        types::{ast::*, patterns::*},
    },
    line_number, inclusive_parse, fill_in, exclusive_parse, tracked_trim, to_u256,
};

#[cfg(feature = "js-api")]
use tsify::Tsify;

#[derive(Debug, Clone, PartialEq, Default)]
struct Parens {
    open: Vec<usize>,
    close: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Default)]
struct RainlangState {
    nodes: Vec<Node>,
    aliases: Vec<Alias>,
    parens: Parens,
    depth: usize,
}

/// Data structure (parse tree) of a Rainlang text
///
/// RainlangDocument represents the parse tree of a Rainlang text which is used by the
/// RainDocument and for providing LSP services.
#[cfg_attr(feature = "js-api", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RainlangDocument {
    pub(crate) text: String,
    pub(crate) ast: Vec<RainlangSource>,
    pub(crate) problems: Vec<Problem>,
    pub(crate) comments: Vec<Comment>,
    pub(crate) error: Option<String>,
    #[serde(skip)]
    state: RainlangState,
}

impl RainlangDocument {
    /// The error msg if parsing had resulted in an runtime error
    pub fn runtime_error(&self) -> Option<String> {
        self.error.clone()
    }

    /// This instance's text
    pub fn text(&self) -> &String {
        &self.text
    }

    /// This instance's parse tree (AST)
    pub fn ast(&self) -> &Vec<RainlangSource> {
        &self.ast
    }

    /// This instance's problems
    pub fn problems(&self) -> &Vec<Problem> {
        &self.problems
    }

    /// This instance's comments
    pub fn comments(&self) -> &Vec<Comment> {
        &self.comments
    }
}

impl RainlangDocument {
    /// Creates a new instance
    pub(crate) fn create(
        text: String,
        namespace: &Namespace,
        authoring_meta: Option<&AuthoringMeta>,
    ) -> RainlangDocument {
        let mut rainlang_doc = RainlangDocument {
            text,
            ast: vec![],
            problems: vec![],
            comments: vec![],
            error: None,
            state: RainlangState::default(),
        };
        rainlang_doc.parse(namespace, authoring_meta.unwrap_or(&AuthoringMeta(vec![])));
        rainlang_doc
    }

    pub(crate) fn new() -> Self {
        RainlangDocument {
            text: String::new(),
            ast: vec![],
            problems: vec![],
            comments: vec![],
            error: None,
            state: RainlangState::default(),
        }
    }

    fn parse(&mut self, namespace: &Namespace, authoring_meta: &AuthoringMeta) {
        if let Err(e) = self._parse(namespace, authoring_meta) {
            self.error = Some(e.to_string());
            self.problems
                .push(ErrorCode::RuntimeError.to_problem(vec![&e.to_string()], [0, 0]));
        };
    }

    /// The main workhorse that parses the text to build the parse tree and collect problems
    fn _parse(
        &mut self,
        namespace: &Namespace,
        authoring_meta: &AuthoringMeta,
    ) -> Result<(), Error> {
        self.reset_state();
        self.ast.clear();
        self.problems.clear();
        self.comments.clear();
        self.error = None;
        let mut document = self.text.clone();

        // check for illegal characters
        // ends the parsing if an illegal char is found
        let illegal_chars = inclusive_parse(&document, &ILLEGAL_CHAR, 0);
        if !illegal_chars.is_empty() {
            self.problems.push(ErrorCode::IllegalChar.to_problem(
                vec![&illegal_chars[0].0],
                [illegal_chars[0].1[0], illegal_chars[0].1[0]],
            ));
            return Ok(());
        };

        // parse and take out comments
        for parsed_comment in inclusive_parse(&document, &COMMENT_PATTERN, 0) {
            if !parsed_comment.0.ends_with("*/") {
                self.problems
                    .push(ErrorCode::UnexpectedEndOfComment.to_problem(vec![], parsed_comment.1));
            }
            self.comments.push(Comment {
                comment: parsed_comment.0.clone(),
                position: parsed_comment.1,
            });
            fill_in(&mut document, parsed_comment.1)?;
        }

        // parse and take out pragma definitions
        // currently not part of ast
        for parsed_pragma in inclusive_parse(&document, &PRAGMA_PATTERN, 0) {
            // if not followed by a hex literal
            if !PRAGMA_END_PATTERN.is_match(&parsed_pragma.0) {
                self.problems
                    .push(ErrorCode::ExpectedHexLiteral.to_problem(vec![], parsed_pragma.1));
            }
            // if not at top, ie checking for a ":" before the pragma definition
            if document[..parsed_pragma.1[0]].contains(':') {
                self.problems
                    .push(ErrorCode::UnexpectedPragma.to_problem(vec![], parsed_pragma.1));
            }
            fill_in(&mut document, parsed_pragma.1)?;
        }

        let mut src_items: Vec<String> = vec![];
        let mut src_items_pos: Vec<Offsets> = vec![];

        // begin parsing expression sources and cache them
        let mut parsed_sources = exclusive_parse(&document, &SOURCE_PATTERN, 0, true);
        if parsed_sources[parsed_sources.len() - 1].0.trim().is_empty() {
            parsed_sources.pop();
        } else {
            let p = parsed_sources[parsed_sources.len() - 1].1[1];
            self.problems
                .push(ErrorCode::ExpectedSemi.to_problem(vec![], [p, p + 1]));
        }
        for v in parsed_sources {
            let trimmed = tracked_trim(&v.0);
            if trimmed.0.is_empty() {
                self.problems.push(
                    ErrorCode::InvalidEmptyBinding
                        .to_problem(vec![], [v.1[1] - trimmed.2, v.1[1] - trimmed.2]),
                );
            } else {
                src_items.push(trimmed.0.to_owned());
                src_items_pos.push([v.1[0] + trimmed.1, v.1[1] - trimmed.2]);
            }
        }

        // reserved keywords + authoring meta words + root namespace occupied keys
        let mut reserved_keys = vec![];
        reserved_keys.extend(KEYWORDS.iter().map(|v| v.to_string()));
        reserved_keys.extend(namespace.keys().cloned());

        for (i, src) in src_items.iter().enumerate() {
            // reserved keys + parsed lhs items of this srouce
            let mut occupied_keys = reserved_keys.clone();

            let mut ends_diff: Vec<usize> = vec![];
            let mut sub_src_items: Vec<String> = vec![];
            let mut sub_src_items_pos: Vec<Offsets> = vec![];
            self.ast.push(RainlangSource {
                lines: vec![],
                position: src_items_pos[i],
            });

            // parse and cache the sub-sources
            exclusive_parse(src, &SUB_SOURCE_PATTERN, src_items_pos[i][0], true)
                .iter()
                .for_each(|v| {
                    let trimmed = tracked_trim(&v.0);
                    sub_src_items.push(trimmed.0.to_owned());
                    sub_src_items_pos.push([v.1[0] + trimmed.1, v.1[1] - trimmed.2]);
                    ends_diff.push(trimmed.2);
                });

            for (j, sub_src) in sub_src_items.iter().enumerate() {
                self.reset_state();
                let cursor_offset = sub_src_items_pos[j][0];
                if !self.ast[i].lines.is_empty() {
                    // add parsed lhs words to the occupied keys
                    occupied_keys.extend(self.ast[i].lines[j - 1].aliases.iter().filter_map(|v| {
                        if v.name != "_" {
                            Some(v.name.clone())
                        } else {
                            None
                        }
                    }))
                }
                if let Some((lhs, rhs)) = sub_src.split_once(':') {
                    // check for invalid comments
                    for cm in &self.comments {
                        if cm.position[0] > cursor_offset
                            && cm.position[0] < sub_src_items_pos[j][1] + ends_diff[j]
                        {
                            self.problems
                                .push(ErrorCode::UnexpectedComment.to_problem(vec![], cm.position));
                        }
                    }
                    // parse LHS
                    if !lhs.is_empty() {
                        let lhs_items = inclusive_parse(lhs, &ANY_PATTERN, cursor_offset);
                        for item in lhs_items {
                            self.state.aliases.push(Alias {
                                name: item.0.clone(),
                                position: item.1,
                                lhs_alias: None,
                            });
                            if !LHS_PATTERN.is_match(&item.0) {
                                self.problems.push(
                                    ErrorCode::InvalidWordPattern.to_problem(vec![&item.0], item.1),
                                );
                            }
                            if occupied_keys.contains(&item.0) {
                                self.problems.push(
                                    ErrorCode::DuplicateAlias.to_problem(vec![&item.0], item.1),
                                );
                            }
                        }
                    }

                    // parse RHS
                    self.process_rhs(
                        rhs,
                        cursor_offset + sub_src.len(),
                        namespace,
                        authoring_meta, // resolveQuotes
                    )?;
                } else {
                    // error if sub source is empty
                    if sub_src.is_empty() || sub_src.trim().is_empty() {
                        self.problems.push(
                            ErrorCode::InvalidEmptyLine.to_problem(vec![], sub_src_items_pos[j]),
                        );
                    } else {
                        self.problems.push(
                            ErrorCode::InvalidExpression.to_problem(vec![], sub_src_items_pos[j]),
                        );
                    }
                };

                // uppdate AST
                self.ast[i].lines.push(RainlangLine {
                    nodes: self.state.nodes.drain(..).collect(),
                    aliases: self.state.aliases.drain(..).collect(),
                    position: sub_src_items_pos[j],
                });
            }
        }

        // ignore next line lint
        for v in self.comments.iter() {
            if lint_patterns::IGNORE_NEXT_LINE.is_match(&v.comment) {
                if let Some(line) = self.ast.iter().flat_map(|e| &e.lines).find(|&e| {
                    line_number(&self.text, e.position[0])
                        == line_number(&self.text, v.position[1]) + 1
                }) {
                    self.problems.retain(|e| {
                        !(e.position[0] >= line.position[0] && e.position[1] <= line.position[1])
                    })
                }
            }
        }
        Ok(())
    }

    /// resets the parse state
    fn reset_state(&mut self) {
        self.state.depth = 0;
        self.state.nodes.clear();
        self.state.aliases.clear();
        self.state.parens.open.clear();
        self.state.parens.close.clear();
    }

    /// Method to update the parse state
    fn update_state(&mut self, node: Node) -> Result<(), Error> {
        let mut nodes = &mut self.state.nodes;
        for _ in 0..self.state.depth {
            let len = nodes.len();
            match &mut nodes[len - 1] {
                Node::Opcode(v) => nodes = &mut v.inputs,
                _ => return Err(Error::StateUpdateFailed),
            }
        }
        nodes.push(node);
        Ok(())
    }

    /// Consumes items (separated by defnied boundries) in the text
    fn process_rhs(
        &mut self,
        text: &str,
        offset: usize,
        namespace: &Namespace,
        authoring_meta: &AuthoringMeta,
    ) -> Result<(), Error> {
        let mut exp = text;
        while !exp.is_empty() {
            let cursor = offset - exp.len();
            match exp.chars().next().unwrap() {
                char if char.is_whitespace() => {
                    exp = exp.split_at(1).1;
                }
                '>' => {
                    self.problems.push(
                        ErrorCode::UnexpectedClosingAngleParen
                            .to_problem(vec![], [cursor, cursor + 1]),
                    );
                    exp = exp.split_at(1).1;
                }
                ')' => {
                    if !self.state.parens.open.is_empty() {
                        self.state.parens.close.push(cursor + 1);
                        self.process_opcode()?;
                        self.state.depth -= 1;
                    } else {
                        self.problems.push(
                            ErrorCode::UnexpectedClosingParen
                                .to_problem(vec![], [cursor, cursor + 1]),
                        );
                    }
                    exp = exp.split_at(1).1;
                }
                _ => {
                    let consumed = self.consume(exp, cursor, namespace, authoring_meta)?;
                    exp = exp.split_at(consumed).1;
                }
            }
        }
        Ok(())
    }

    /// resolves the Opcode AST type once its corresponding closing paren has been consumed
    fn process_opcode(&mut self) -> Result<(), Error> {
        self.state.parens.open.pop();
        let end_position = self.state.parens.close.pop().ok_or(Error::FailedToParse)?;

        let mut nodes = &mut self.state.nodes;
        for _ in 0..self.state.depth - 1 {
            let len = nodes.len();
            match &mut nodes[len - 1] {
                Node::Opcode(v) => nodes = &mut v.inputs,
                _ => return Err(Error::StateUpdateFailed),
            }
        }

        let len = nodes.len();
        if let Node::Opcode(node) = &mut nodes[len - 1] {
            node.position[1] = end_position + 1;
            node.parens[1] = end_position;
            self.problems.retain(|v| {
                v.msg != "expected \")\""
                    || v.position[0] != node.opcode.position[0]
                    || v.position[1] != node.parens[0] + 1
            });
            Ok(())
        } else {
            Err(Error::FailedToParse)
        }
    }

    /// handles operand arguments
    fn process_operand(
        &mut self,
        exp: &str,
        cursor: usize,
        op: &mut Opcode,
        namespace: &Namespace,
    ) -> usize {
        let mut remaining = exp.len();
        if let Some(operand_close_index) = exp.find('>') {
            let slices = exp[1..].split_at(operand_close_index - 1);
            remaining = operand_close_index + 1;
            let operand_args = inclusive_parse(slices.0, &ANY_PATTERN, cursor + 1);
            op.operand_args = Some(OperandArg {
                position: [cursor, cursor + slices.0.len() + 2],
                args: vec![],
            });
            for v in operand_args {
                if OPERAND_ARG_PATTERN.is_match(&v.0) {
                    let is_quote = v.0.starts_with('\'');
                    if is_quote {
                        let quote = &v.0[1..];
                        if let Some(b) = self.search_namespace(quote, v.1[0], namespace) {
                            match &b.item {
                                BindingItem::Elided(e) => {
                                    let msg = e.msg.clone();
                                    self.problems
                                        .push(ErrorCode::ElidedBinding.to_problem(vec![&msg], v.1));
                                }
                                BindingItem::Constant(_c) => {
                                    self.problems
                                        .push(ErrorCode::InvalidQuote.to_problem(vec![quote], v.1));
                                }
                                _ => {
                                    if b.problems
                                        .iter()
                                        .any(|v| v.code == ErrorCode::CircularDependency)
                                    {
                                        self.problems.push(
                                            ErrorCode::CircularDependencyQuote
                                                .to_problem(vec![], v.1),
                                        );
                                    }
                                }
                            };
                        } else {
                            self.problems
                                .push(ErrorCode::UndefinedQuote.to_problem(vec![quote], v.1));
                        }
                    }
                    op.operand_args.as_mut().unwrap().args.push(OperandArgItem {
                        value: if is_quote {
                            v.0[1..].to_string()
                        } else {
                            v.0.clone()
                        },
                        name: "operand arg".to_owned(),
                        position: v.1,
                        description: String::new(),
                    });
                } else {
                    self.problems
                        .push(ErrorCode::InvalidOperandArg.to_problem(vec![&v.0], v.1));
                }
            }
        } else {
            self.problems.push(
                ErrorCode::ExpectedClosingAngleBracket
                    .to_problem(vec![], [cursor, cursor + exp.len()]),
            );
            op.operand_args = Some(OperandArg {
                position: [cursor, cursor + exp.len()],
                args: vec![],
            });
        }
        remaining
    }

    /// parses an upcoming word to the corresponding AST node
    fn consume(
        &mut self,
        text: &str,
        cursor: usize,
        namespace: &Namespace,
        authoring_meta: &AuthoringMeta,
    ) -> Result<usize, Error> {
        let exp = text;
        let (next, mut remaining, mut offset) =
            match exp.find(['(', ')', '<', '>', ' ', '\t', '\r', '\n']) {
                Some(v) => {
                    let slices = exp.split_at(v);
                    (slices.0, slices.1, v)
                }
                None => (exp, "", exp.len()),
            };
        let next_pos = [cursor, cursor + next.len()];

        if remaining.starts_with(['(', '<']) {
            let mut op = Opcode {
                opcode: OpcodeDetails {
                    name: next.to_owned(),
                    description: String::new(),
                    position: next_pos,
                },
                operand: None,
                output: None,
                position: [next_pos[0], 0],
                parens: [1, 0],
                inputs: vec![],
                operand_args: None,
                lhs_alias: None,
            };
            if next.is_empty() {
                self.problems
                    .push(ErrorCode::ExpectedOpcode.to_problem(vec![], next_pos));
            } else if !WORD_PATTERN.is_match(next) {
                self.problems
                    .push(ErrorCode::InvalidWordPattern.to_problem(vec![next], next_pos));
            } else if let Some(word) = authoring_meta.0.iter().find(|&v| v.word.as_str() == next) {
                op.opcode.description = word.description.clone();
            }

            if remaining.starts_with('<') {
                let consumed =
                    self.process_operand(remaining, cursor + next.len(), &mut op, namespace);
                offset += consumed;
                remaining = &remaining[consumed..];
            }
            if remaining.starts_with('(') {
                let pos = {
                    if let Some(operand_arg) = &op.operand_args {
                        operand_arg.position[1]
                    } else {
                        next_pos[1]
                    }
                };
                offset += 1;
                self.state.parens.open.push(pos);
                op.parens[0] = pos;
                self.update_state(Node::Opcode(op))?;
                self.state.depth += 1;
                self.problems.push(
                    ErrorCode::ExpectedClosingParen.to_problem(vec![], [next_pos[0], pos + 1]),
                );
            } else {
                self.problems
                    .push(ErrorCode::ExpectedOpeningParen.to_problem(vec![], next_pos));
            }
        } else if next.contains('.') {
            if let Some(b) = self.search_namespace(next, cursor, namespace) {
                match &b.item {
                    BindingItem::Constant(c) => {
                        let value = c.value.to_owned();
                        self.update_state(Node::Literal(Literal {
                            id: Some(next.to_owned()),
                            value,
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                    BindingItem::Elided(e) => {
                        let msg = e.msg.clone();
                        self.problems
                            .push(ErrorCode::ElidedBinding.to_problem(vec![&msg], next_pos));
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                    BindingItem::Exp(_e) => {
                        self.problems
                            .push(ErrorCode::InvalidReference.to_problem(vec![next], next_pos));
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                };
            } else {
                self.update_state(Node::Alias(Alias {
                    name: next.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                }))?;
            }
        } else if NUMERIC_PATTERN.is_match(next) {
            if HEX_PATTERN.is_match(next) && next.len() % 2 == 1 {
                self.problems
                    .push(ErrorCode::OddLenHex.to_problem(vec![], next_pos));
            }
            if to_u256(next).is_err() {
                self.problems
                    .push(ErrorCode::OutOfRangeValue.to_problem(vec![], next_pos));
            }
            self.update_state(Node::Literal(Literal {
                value: next.to_owned(),
                position: next_pos,
                lhs_alias: None,
                id: None,
            }))?;
        } else if STRING_LITERAL_PATTERN.is_match(next) || SUB_PARSER_PATTERN.is_match(next) {
            self.update_state(Node::Literal(Literal {
                value: next.to_owned(),
                position: next_pos,
                lhs_alias: None,
                id: None,
            }))?;
        } else if WORD_PATTERN.is_match(next) {
            if self.ast[self.ast.len() - 1]
                .lines
                .iter()
                .any(|v| v.aliases.iter().any(|e| e.name == next))
            {
                self.update_state(Node::Alias(Alias {
                    name: next.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                }))?;
            } else if let Some(ns_type) = namespace.get(next) {
                match ns_type {
                    NamespaceItem::Leaf(leaf) => match &leaf.element.item {
                        BindingItem::Constant(c) => {
                            self.update_state(Node::Literal(Literal {
                                value: c.value.clone(),
                                position: next_pos,
                                lhs_alias: None,
                                id: Some(next.to_owned()),
                            }))?;
                        }
                        BindingItem::Elided(e) => {
                            self.problems
                                .push(ErrorCode::ElidedBinding.to_problem(vec![&e.msg], next_pos));
                            self.update_state(Node::Alias(Alias {
                                name: next.to_owned(),
                                position: next_pos,
                                lhs_alias: None,
                            }))?;
                        }
                        BindingItem::Exp(_e) => {
                            self.problems
                                .push(ErrorCode::InvalidReference.to_problem(vec![next], next_pos));
                            self.update_state(Node::Alias(Alias {
                                name: next.to_owned(),
                                position: next_pos,
                                lhs_alias: None,
                            }))?;
                        }
                    },
                    NamespaceItem::Node(_node) => {
                        self.problems.push(
                            ErrorCode::InvalidNamespaceReference.to_problem(vec![next], next_pos),
                        );
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                }
            } else {
                self.problems
                    .push(ErrorCode::UndefinedWord.to_problem(vec![next], next_pos));
                self.update_state(Node::Alias(Alias {
                    name: next.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                }))?;
            }
        } else {
            self.problems
                .push(ErrorCode::InvalidWordPattern.to_problem(vec![next], next_pos));
            self.update_state(Node::Alias(Alias {
                name: next.to_owned(),
                position: next_pos,
                lhs_alias: None,
            }))?;
        }
        Ok(offset)
    }

    /// Search in namespaces for a name
    fn search_namespace<'a>(
        &'a mut self,
        query: &str,
        offset: usize,
        namespace: &'a Namespace,
    ) -> Option<&'a Binding> {
        let mut segments: &[ParsedItem] =
            &exclusive_parse(query, &NAMESPACE_SEGMENT_PATTERN, offset, true);
        if query.starts_with('.') {
            segments = &segments[1..];
        }
        if segments.len() > 32 {
            self.problems
                .push(ErrorCode::DeepNamespace.to_problem(vec![], [offset, offset + query.len()]));
            return None;
        }
        if segments[segments.len() - 1].0.is_empty() {
            self.problems.push(
                ErrorCode::UnexpectedNamespacePath
                    .to_problem(vec![], segments[segments.len() - 1].1),
            );
            return None;
        }
        let mut is_invalid = false;
        for invalid_segment in segments.iter().filter(|v| !WORD_PATTERN.is_match(&v.0)) {
            self.problems.push(
                ErrorCode::InvalidWordPattern
                    .to_problem(vec![&invalid_segment.0], invalid_segment.1),
            );
            is_invalid = true;
        }
        if is_invalid {
            return None;
        }

        if let Some(namespace_item) = namespace.get(&segments[0].0) {
            let mut result = namespace_item;
            let iter = segments[1..].iter();
            for segment in iter {
                match result {
                    NamespaceItem::Node(node) => {
                        if let Some(namespace_item) = node.get(&segment.0) {
                            result = namespace_item;
                        } else {
                            self.problems.push(
                                ErrorCode::UndefinedNamespaceMember
                                    .to_problem(vec![&segment.0], segment.1),
                            );
                            return None;
                        }
                    }
                    _ => {
                        self.problems.push(
                            ErrorCode::UndefinedNamespaceMember
                                .to_problem(vec![&segment.0], segment.1),
                        );
                        return None;
                    }
                }
            }
            match result {
                NamespaceItem::Node(_node) => {
                    self.problems
                        .push(ErrorCode::InvalidNamespaceReference.to_problem(
                            vec![&segments[segments.len() - 1].0],
                            [offset, offset + query.len()],
                        ));
                    None
                }
                NamespaceItem::Leaf(leaf) => Some(&leaf.element),
            }
        } else {
            self.problems.push(
                ErrorCode::UndefinedNamespaceMember.to_problem(vec![&segments[0].0], segments[0].1),
            );
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use rain_metadata::types::authoring::v1::AuthoringMetaItem;

    #[test]
    fn test_process_opcode_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        rl.state.depth = 1;
        rl.state.parens.close = vec![13];
        let value_node = Node::Literal(Literal {
            value: "12".to_owned(),
            position: [3, 4],
            lhs_alias: None,
            id: None,
        });
        let op_node = Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "add".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [8, 0],
            inputs: vec![
                Node::Literal(Literal {
                    value: "1".to_owned(),
                    position: [9, 10],
                    lhs_alias: None,
                    id: None,
                }),
                Node::Literal(Literal {
                    value: "2".to_owned(),
                    position: [11, 12],
                    lhs_alias: None,
                    id: None,
                }),
            ],
            lhs_alias: None,
            operand_args: None,
        });
        rl.state.nodes = vec![value_node.clone(), op_node];
        rl.process_opcode()?;

        let expected_op_node = Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "add".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 14],
            parens: [8, 13],
            inputs: vec![
                Node::Literal(Literal {
                    value: "1".to_owned(),
                    position: [9, 10],
                    lhs_alias: None,
                    id: None,
                }),
                Node::Literal(Literal {
                    value: "2".to_owned(),
                    position: [11, 12],
                    lhs_alias: None,
                    id: None,
                }),
            ],
            lhs_alias: None,
            operand_args: None,
        });
        let expected_state = RainlangState {
            nodes: vec![value_node, expected_op_node],
            depth: 1,
            ..Default::default()
        };
        assert_eq!(rl.state, expected_state);

        Ok(())
    }

    #[test]
    fn test_process_operand_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let namespace = HashMap::new();
        let exp = "<12 56>";
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 8, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [8, 15],
                args: vec![
                    OperandArgItem {
                        value: "12".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [9, 11],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "56".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [12, 14],
                        description: String::new(),
                    },
                ],
            }),
        };
        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        let exp = "<0xa5>";
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 8, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [8, 14],
                args: vec![OperandArgItem {
                    value: "0xa5".to_owned(),
                    name: "operand arg".to_owned(),
                    position: [9, 13],
                    description: String::new(),
                }],
            }),
        };
        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        let exp = "<1\n0xf2\n69   32>";
        let mut op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        };

        let consumed_count = rl.process_operand(exp, 15, &mut op, &namespace);
        let expected_op = Opcode {
            opcode: OpcodeDetails {
                name: "opc".to_owned(),
                description: String::new(),
                position: [5, 8],
            },
            operand: None,
            output: None,
            position: [5, 0],
            parens: [0, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [15, 31],
                args: vec![
                    OperandArgItem {
                        value: "1".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [16, 17],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "0xf2".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [18, 22],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "69".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [23, 25],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "32".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [28, 30],
                        description: String::new(),
                    },
                ],
            }),
        };
        assert_eq!(consumed_count, exp.len());
        assert_eq!(op, expected_op);

        Ok(())
    }

    #[test]
    fn test_consume_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let namespace = HashMap::new();
        let authoring_meta = AuthoringMeta(vec![
            AuthoringMetaItem {
                word: "opcode".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
            AuthoringMetaItem {
                word: "another-opcode".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
            AuthoringMetaItem {
                word: "another-opcode-2".to_owned(),
                operand_parser_offset: 0,
                description: String::new(),
            },
        ]);

        let text = "opcode<12 56>(";
        let consumed_count = rl.consume(text, 10, &namespace, &authoring_meta)?;
        let mut expected_state_nodes = vec![Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [10, 16],
            },
            operand: None,
            output: None,
            position: [10, 0],
            parens: [23, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [16, 23],
                args: vec![
                    OperandArgItem {
                        value: "12".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [17, 19],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "56".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [20, 22],
                        description: String::new(),
                    },
                ],
            }),
        })];
        assert_eq!(consumed_count, text.len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        let text = "another-opcode(12 0x123abced)";
        rl.state.depth -= 1;
        let consumed_count = rl.consume(text, 24, &namespace, &authoring_meta)?;
        expected_state_nodes.push(Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "another-opcode".to_owned(),
                description: String::new(),
                position: [24, 38],
            },
            operand: None,
            output: None,
            position: [24, 0],
            parens: [38, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: None,
        }));
        assert_eq!(consumed_count, "another-opcode(".len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        let text = "another-opcode-2<\n  0x1f\n  87>(\n  0xabcef1234\n)";
        rl.state.depth -= 1;
        let consumed_count = rl.consume(text, 77, &namespace, &authoring_meta)?;
        expected_state_nodes.push(Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "another-opcode-2".to_owned(),
                description: String::new(),
                position: [77, 93],
            },
            operand: None,
            output: None,
            position: [77, 0],
            parens: [107, 0],
            inputs: vec![],
            lhs_alias: None,
            operand_args: Some(OperandArg {
                position: [93, 107],
                args: vec![
                    OperandArgItem {
                        value: "0x1f".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [97, 101],
                        description: String::new(),
                    },
                    OperandArgItem {
                        value: "87".to_owned(),
                        name: "operand arg".to_owned(),
                        position: [104, 106],
                        description: String::new(),
                    },
                ],
            }),
        }));
        assert_eq!(consumed_count, "another-opcode-2<\n  0x1f\n  87>(".len());
        assert_eq!(rl.state.nodes, expected_state_nodes);

        Ok(())
    }

    #[test]
    fn test_search_namespace_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let mut main_namespace: Namespace = HashMap::new();
        let mut deep_namespace: Namespace = HashMap::new();
        let mut deeper_namespace: Namespace = HashMap::new();

        let deeper_binding = Binding {
            name: "deeper-binding-name".to_owned(),
            name_position: [2, 2],
            content: String::new(),
            content_position: [4, 4],
            position: [1, 2],
            problems: vec![],
            dependencies: vec![],
            item: BindingItem::Elided(ElidedBindingItem {
                msg: "elided binding".to_string(),
            }),
        };
        let deeper_leaf = NamespaceItem::Leaf(NamespaceLeaf {
            hash: "some-hash".to_owned(),
            import_index: 2,
            element: deeper_binding.clone(),
        });

        let binding = Binding {
            name: "binding-name".to_owned(),
            name_position: [1, 1],
            content: String::new(),
            content_position: [1, 2],
            position: [1, 2],
            problems: vec![],
            dependencies: vec![],
            item: BindingItem::Constant(ConstantBindingItem {
                value: "1234".to_owned(),
            }),
        };
        let deep_leaf = NamespaceItem::Leaf(NamespaceLeaf {
            hash: "some-other-hash".to_owned(),
            import_index: 1,
            element: binding.clone(),
        });

        deeper_namespace.insert("deeper-binding-name".to_string(), deeper_leaf.clone());
        deep_namespace.insert("binding-name".to_string(), deep_leaf.clone());
        deep_namespace.insert(
            "deeper-namespace".to_string(),
            NamespaceItem::Node(deeper_namespace),
        );
        main_namespace.insert(
            "deep-namespace".to_string(),
            NamespaceItem::Node(deep_namespace),
        );

        let result = rl.search_namespace(
            "deep-namespace.deeper-namespace.deeper-binding-name",
            0,
            &main_namespace,
        );
        assert_eq!(Some(&deeper_binding), result);

        let result = rl.search_namespace(".deep-namespace.binding-name", 0, &main_namespace);
        assert_eq!(Some(&binding), result);

        let result = rl.search_namespace("deep-namespace.other-binding-name", 0, &main_namespace);
        assert_eq!(None, result);

        let result = rl.search_namespace(
            "deep-namespace.deeper-namespace.other-binding-name",
            0,
            &main_namespace,
        );
        assert_eq!(None, result);

        Ok(())
    }
}
