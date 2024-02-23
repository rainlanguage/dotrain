use rain_metadata::types::authoring::v1::AuthoringMeta;
use crate::search_binding_ref;

use super::*;
use super::super::{
    super::{
        error::{Error, ErrorCode},
        types::patterns::*,
    },
    inclusive_parse, fill_in, exclusive_parse, tracked_trim, to_u256,
};

impl RainlangDocument {
    /// The main workhorse that parses the text to build the parse tree and collect problems
    pub(super) fn _parse(
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
        let pragmas = inclusive_parse(&document, &PRAGMA_PATTERN, 0)
            .iter()
            .map(|v| {
                if v.0 == PRAGMA_KEYWORD {
                    v.clone()
                } else {
                    let mut pos = v.1;
                    if v.0.starts_with([' ', '\n', '\t', '\r']) {
                        pos[0] += 1;
                    }
                    if v.0.ends_with([' ', '\n', '\t', '\r']) {
                        pos[1] -= 1;
                    }
                    ParsedItem(PRAGMA_KEYWORD.to_owned(), pos)
                }
            })
            .collect::<Vec<ParsedItem>>();
        for (i, parsed_pragma) in pragmas.iter().enumerate() {
            let start = parsed_pragma.1[1];
            let end = if i == pragmas.len() - 1 {
                document.len()
            } else {
                pragmas[i + 1].1[0]
            };

            let mut items = vec![];
            let range_text = &document[start..end];
            if let Some(range_items) = self.parse_range(range_text, start, false) {
                let iter = range_items.iter().enumerate();
                for (j, range_item) in iter {
                    if !LITERAL_PATTERN.is_match(&range_item.0) {
                        if let Some(binding) = search_binding_ref(&range_item.0, namespace) {
                            if let BindingItem::Literal(literal) = &binding.item {
                                items.push((range_item.clone(), Some(literal.value.clone())));
                            } else {
                                self.problems.push(
                                    ErrorCode::InvalidReferenceLiteral
                                        .to_problem(vec![], range_item.1),
                                );
                                items.push((range_item.clone(), None));
                            }
                        } else {
                            if i == pragmas.len() - 1 {
                                break;
                            }
                            items.push((range_item.clone(), None));
                            self.problems.push(
                                ErrorCode::UndefinedIdentifier
                                    .to_problem(vec![&range_item.0], range_item.1),
                            );
                        }
                    } else {
                        items.push((range_item.clone(), None));
                    }
                }
            } else {
                self.problems
                    .push(ErrorCode::ExpectedLiteral.to_problem(vec![], parsed_pragma.1));
            }

            if items.is_empty() {
                self.problems
                    .push(ErrorCode::ExpectedLiteral.to_problem(vec![], parsed_pragma.1));
                fill_in(&mut document, parsed_pragma.1)?;
            } else {
                fill_in(
                    &mut document,
                    [parsed_pragma.1[0], items[items.len() - 1].0 .1[1]],
                )?;
            };

            self.pragmas.push((parsed_pragma.clone(), items));
        }
        if self.pragmas.len() > 1 {
            for pragma_statement in &self.pragmas[1..] {
                if pragma_statement.1.is_empty() {
                    self.problems.push(
                        ErrorCode::UnexpectedPragma.to_problem(vec![], pragma_statement.0 .1),
                    );
                } else {
                    self.problems.push(ErrorCode::UnexpectedPragma.to_problem(
                        vec![],
                        [
                            pragma_statement.0 .1[0],
                            pragma_statement.1[pragma_statement.1.len() - 1].0 .1[1],
                        ],
                    ));
                }
            }
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

        Ok(())
    }

    /// resets the parse state
    pub(super) fn reset_state(&mut self) {
        self.state.depth = 0;
        self.state.nodes.clear();
        self.state.aliases.clear();
        self.state.parens.open.clear();
        self.state.parens.close.clear();
    }

    /// Method to update the parse state
    pub(super) fn update_state(&mut self, node: Node) -> Result<(), Error> {
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
    pub(super) fn process_rhs(
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
    pub(super) fn process_opcode(&mut self) -> Result<(), Error> {
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
    pub(super) fn process_operand(
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
            let operand_args = self
                .parse_range(slices.0, cursor + 1, true)
                .unwrap_or_default();
            op.operand_args = Some(OperandArg {
                position: [cursor, cursor + slices.0.len() + 2],
                args: vec![],
            });
            let mut operand_args_items = vec![];
            for v in operand_args {
                if OPERAND_ARG_PATTERN.is_match(&v.0) {
                    if LITERAL_PATTERN.is_match(&v.0) {
                        operand_args_items.push(OperandArgItem {
                            value: Some(v.0.clone()),
                            name: "operand arg".to_owned(),
                            position: v.1,
                            description: String::new(),
                            binding_id: None,
                        });
                    } else {
                        let is_quote = v.0.starts_with('\'');
                        let (name, offset) = if is_quote {
                            (&v.0[1..], v.1[0] + 1)
                        } else {
                            (v.0.as_str(), v.1[0])
                        };
                        let mut is_quote_binding = false;
                        let mut value = None;
                        if let Some(b) = self.search_namespace(name, offset, namespace) {
                            match &b.item {
                                BindingItem::Elided(e) => {
                                    let msg = e.msg.clone();
                                    self.problems.push(
                                        ErrorCode::ElidedBinding.to_problem(vec![name, &msg], v.1),
                                    );
                                }
                                BindingItem::Literal(l) => {
                                    if is_quote {
                                        self.problems.push(
                                            ErrorCode::InvalidLiteralQuote
                                                .to_problem(vec![name], v.1),
                                        );
                                    } else {
                                        value = Some(l.value.clone());
                                    }
                                }
                                BindingItem::Quote(_q) => {
                                    is_quote_binding = true;
                                    let problems: Vec<Problem> = b
                                        .problems
                                        .iter()
                                        .map(|p| Problem {
                                            msg: p.msg.clone(),
                                            position: v.1,
                                            code: p.code,
                                        })
                                        .collect();
                                    self.problems.extend(problems);
                                    self.dependencies.push(name.to_owned());
                                }
                                BindingItem::Exp(_e) => {
                                    if is_quote {
                                        self.dependencies.push(name.to_owned());
                                    } else {
                                        self.problems.push(
                                            ErrorCode::InvalidReferenceAll
                                                .to_problem(vec![name], v.1),
                                        );
                                    }
                                }
                            };
                        } else if is_quote {
                            self.problems
                                .push(ErrorCode::UndefinedQuote.to_problem(vec![name], v.1));
                        } else {
                            self.problems
                                .push(ErrorCode::UndefinedIdentifier.to_problem(vec![name], v.1));
                        }
                        operand_args_items.push(OperandArgItem {
                            value,
                            name: "operand arg".to_owned(),
                            position: v.1,
                            description: String::new(),
                            binding_id: Some((v.0.clone(), is_quote_binding)),
                        });
                    }
                } else {
                    self.problems
                        .push(ErrorCode::InvalidOperandArg.to_problem(vec![&v.0], v.1));
                }
            }
            op.operand_args.as_mut().unwrap().args = operand_args_items;
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

    pub(super) fn parse_range(
        &mut self,
        text: &str,
        offset: usize,
        validate: bool,
    ) -> Option<Vec<ParsedItem>> {
        let mut result = vec![];
        let mut parsed_items = inclusive_parse(text, &ANY_PATTERN, 0);
        let mut iter = parsed_items.iter_mut();
        while let Some(item) = iter.next() {
            if item.0.starts_with('"') && (item.0 == "\"" || !item.0.ends_with('"')) {
                let start = item.1[0];
                let mut end = text.len();
                let mut has_no_end = true;
                #[allow(clippy::while_let_on_iterator)]
                while let Some(end_item) = iter.next() {
                    if end_item.0.ends_with('"') {
                        has_no_end = false;
                        end = end_item.1[1];
                        break;
                    }
                }
                let pos = [start + offset, end + offset];
                if has_no_end && validate {
                    self.problems
                        .push(ErrorCode::UnexpectedStringLiteralEnd.to_problem(vec![], pos));
                    return None;
                }
                result.push(ParsedItem(text[start..end].to_owned(), pos))
            } else if item.0.starts_with('[') && (item.0 == "]" || !item.0.ends_with(']')) {
                let start = item.1[0];
                let mut end = text.len();
                let mut has_no_end = true;
                #[allow(clippy::while_let_on_iterator)]
                while let Some(end_item) = iter.next() {
                    if end_item.0.ends_with(']') {
                        has_no_end = false;
                        end = end_item.1[1];
                        break;
                    }
                }
                let pos = [start + offset, end + offset];
                if has_no_end && validate {
                    self.problems
                        .push(ErrorCode::UnexpectedSubParserEnd.to_problem(vec![], pos));
                    return None;
                }
                result.push(ParsedItem(text[start..end].to_owned(), pos))
            } else {
                result.push(ParsedItem(
                    item.0.to_owned(),
                    [item.1[0] + offset, item.1[1] + offset],
                ))
            }
        }
        if result.is_empty() {
            None
        } else {
            Some(result)
        }
    }

    /// parses an upcoming word to the corresponding AST node
    pub(super) fn consume(
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

        if next.starts_with('"') && (next == "\"" || !next.ends_with('"')) {
            match remaining.find('"') {
                Some(string_literal_end) => {
                    let consumed = string_literal_end + next.len() + 1;
                    self.update_state(Node::Literal(Literal {
                        value: exp[0..consumed].to_owned(),
                        position: [cursor, cursor + consumed],
                        lhs_alias: None,
                        id: None,
                    }))?;
                    return Ok(consumed);
                }
                None => {
                    self.problems.push(
                        ErrorCode::UnexpectedStringLiteralEnd
                            .to_problem(vec![], [cursor, cursor + exp.len()]),
                    );
                    self.update_state(Node::Literal(Literal {
                        value: exp.to_owned(),
                        position: [cursor, cursor + exp.len()],
                        lhs_alias: None,
                        id: None,
                    }))?;
                    return Ok(exp.len());
                }
            }
        }
        if next.starts_with('[') && (next == "]" || !next.ends_with(']')) {
            match remaining.find(']') {
                Some(sub_parser_end) => {
                    let consumed = sub_parser_end + next.len() + 1;
                    self.update_state(Node::Literal(Literal {
                        value: exp[0..consumed].to_owned(),
                        position: [cursor, cursor + consumed],
                        lhs_alias: None,
                        id: None,
                    }))?;
                    return Ok(consumed);
                }
                None => {
                    self.problems.push(
                        ErrorCode::UnexpectedSubParserEnd
                            .to_problem(vec![], [cursor, cursor + exp.len()]),
                    );
                    self.update_state(Node::Literal(Literal {
                        value: exp.to_owned(),
                        position: [cursor, cursor + exp.len()],
                        lhs_alias: None,
                        id: None,
                    }))?;
                    return Ok(exp.len());
                }
            }
        }
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
                    BindingItem::Literal(c) => {
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
                            .push(ErrorCode::ElidedBinding.to_problem(vec![next, &msg], next_pos));
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                    BindingItem::Exp(_e) => {
                        self.problems.push(
                            ErrorCode::InvalidReferenceLiteral.to_problem(vec![next], next_pos),
                        );
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                    BindingItem::Quote(_q) => {
                        self.problems.push(
                            ErrorCode::InvalidReferenceLiteral.to_problem(vec![next], next_pos),
                        );
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
        } else if STRING_LITERAL_PATTERN.is_match(next) || SUB_PARSER_LITERAL_PATTERN.is_match(next)
        {
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
                        BindingItem::Literal(c) => {
                            self.update_state(Node::Literal(Literal {
                                value: c.value.clone(),
                                position: next_pos,
                                lhs_alias: None,
                                id: Some(next.to_owned()),
                            }))?;
                        }
                        BindingItem::Elided(e) => {
                            self.problems.push(
                                ErrorCode::ElidedBinding.to_problem(vec![next, &e.msg], next_pos),
                            );
                            self.update_state(Node::Alias(Alias {
                                name: next.to_owned(),
                                position: next_pos,
                                lhs_alias: None,
                            }))?;
                        }
                        BindingItem::Exp(_e) => {
                            self.problems.push(
                                ErrorCode::InvalidReferenceLiteral.to_problem(vec![next], next_pos),
                            );
                            self.update_state(Node::Alias(Alias {
                                name: next.to_owned(),
                                position: next_pos,
                                lhs_alias: None,
                            }))?;
                        }
                        BindingItem::Quote(_q) => {
                            self.problems.push(
                                ErrorCode::InvalidReferenceLiteral.to_problem(vec![next], next_pos),
                            );
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
    pub(super) fn search_namespace<'a>(
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
