use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use rain_meta::types::authoring::v1::AuthoringMeta;
use super::{
    super::{
        error::Error,
        types::{ast::*, patterns::*},
    },
    line_number, inclusive_parse, fill_in, exclusive_parse, tracked_trim, to_u256,
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;

#[derive(Debug, Clone, PartialEq)]
struct Parens {
    open: Vec<usize>,
    close: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq)]
struct RainlangState {
    nodes: Vec<Node>,
    aliases: Vec<Alias>,
    parens: Parens,
    depth: usize,
}

impl Default for RainlangState {
    fn default() -> Self {
        RainlangState {
            nodes: vec![],
            aliases: vec![],
            parens: Parens {
                open: vec![],
                close: vec![],
            },
            depth: 0,
        }
    }
}

/// Data structure (parse tree) of a Rainlang text
///
/// RainlangDocument represents the parse tree of a Rainlang text which is used by the
/// RainDocument and for providing LSP services.
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(rename(serialize = "IRainlangDocument"))]
pub struct RainlangDocument {
    pub(crate) text: String,
    pub(crate) ast: Vec<RainlangSource>,
    pub(crate) problems: Vec<Problem>,
    pub(crate) comments: Vec<Comment>,
    pub(crate) error: Option<String>,
    pub(crate) ignore_undefined_authoring_meta: bool,
    #[serde(skip)]
    state: RainlangState,
}

impl RainlangDocument {
    /// The error msg if parsing had resulted in an error
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
        authoring_meta: Option<&AuthoringMeta>,
        namespace: Option<&Namespace>,
    ) -> RainlangDocument {
        let mut ns = &HashMap::new();
        if let Some(v) = namespace {
            ns = v;
        }
        let mut am = &AuthoringMeta(vec![]);
        let ignore_undefined_authoring_meta = if let Some(v) = authoring_meta {
            am = v;
            false
        } else {
            true
        };
        let mut rl = RainlangDocument {
            text,
            ast: vec![],
            problems: vec![],
            comments: vec![],
            error: None,
            ignore_undefined_authoring_meta,
            state: RainlangState::default(),
        };
        rl.parse(ns, am);
        rl
    }

    pub(crate) fn new() -> Self {
        RainlangDocument {
            text: String::new(),
            ast: vec![],
            problems: vec![],
            comments: vec![],
            error: None,
            ignore_undefined_authoring_meta: false,
            state: RainlangState::default(),
        }
    }

    fn parse(&mut self, namespace: &Namespace, authoring_meta: &AuthoringMeta) {
        match self._parse(namespace, authoring_meta) {
            Ok(()) => (),
            Err(e) => {
                self.error = Some(e.to_string());
                self.problems.push(Problem {
                    msg: e.to_string(),
                    position: [0, 0],
                    code: ErrorCode::RuntimeError,
                })
            }
        };
    }

    /// The main workhorse of Rainlang which parses the words used in an
    /// expression and is responsible for building the parse tree and collect problems
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
            self.problems.push(Problem {
                msg: format!("illegal character: {}", illegal_chars[0].0),
                position: [illegal_chars[0].1[0], illegal_chars[0].1[0]],
                code: ErrorCode::IllegalChar,
            });
            return Ok(());
        };

        // parse and take out comments
        for v in inclusive_parse(&document, &COMMENT_PATTERN, 0) {
            if !v.0.ends_with("*/") {
                self.problems.push(Problem {
                    msg: "unexpected end of comment".to_owned(),
                    position: v.1,
                    code: ErrorCode::UnexpectedEndOfComment,
                });
            }
            self.comments.push(Comment {
                comment: v.0.clone(),
                position: v.1,
            });
            fill_in(&mut document, v.1)?;
        }

        // parse and take out pragma definitions
        // currently not part of ast
        let end_pattern = regex::Regex::new(r"0x[0-9a-fA-F]*(\s|$)").unwrap();
        for v in inclusive_parse(&document, &PRAGMA_PATTERN, 0) {
            if !end_pattern.is_match(&v.0) {
                self.problems.push(Problem {
                    msg: "expected to be followed by a hex literal".to_owned(),
                    position: v.1,
                    code: ErrorCode::ExpectedHexLiteral,
                });
            }
            if document[..v.1[0]].contains(':') {
                self.problems.push(Problem {
                    msg: "unexpected pragma, must be at top".to_owned(),
                    position: v.1,
                    code: ErrorCode::UnexpectedPragma,
                });
            }
            fill_in(&mut document, v.1)?;
        }

        let mut src_items: Vec<String> = vec![];
        let mut src_items_pos: Vec<Offsets> = vec![];

        // begin parsing expression sources and cache them
        let mut parsed_sources = exclusive_parse(&document, &SOURCE_PATTERN, 0, true);
        if parsed_sources[parsed_sources.len() - 1].0.trim().is_empty() {
            parsed_sources.pop();
        } else {
            let p = parsed_sources[parsed_sources.len() - 1].1[1];
            self.problems.push(Problem {
                msg: "expected to end with semi".to_owned(),
                position: [p, p + 1],
                code: ErrorCode::ExpectedSemi,
            });
        }
        for v in parsed_sources {
            let trimmed = tracked_trim(&v.0);
            if trimmed.0.is_empty() {
                self.problems.push(Problem {
                    msg: "invalid empty expression".to_owned(),
                    position: [v.1[1] - trimmed.2, v.1[1] - trimmed.2],
                    code: ErrorCode::InvalidEmptyBinding,
                });
            } else {
                src_items.push(trimmed.0.to_owned());
                src_items_pos.push([v.1[0] + trimmed.1, v.1[1] - trimmed.2]);
            }
        }

        let mut reserved_keys = vec![];
        // reserved keywords
        reserved_keys.extend(KEYWORDS.iter().map(|v| v.to_string()));
        // authoring meta words
        reserved_keys.extend(authoring_meta.0.iter().map(|v| v.word.clone()));

        for (i, src) in src_items.iter().enumerate() {
            // reserved keys + root namespace occupied keys
            let mut occupied_keys = vec![];
            occupied_keys.extend(reserved_keys.iter().cloned());
            occupied_keys.extend(namespace.keys().cloned());

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
                            self.problems.push(Problem {
                                msg: "unexpected comment".to_owned(),
                                position: cm.position,
                                code: ErrorCode::UnexpectedComment,
                            });
                        }
                    }
                    // begin parsing LHS
                    if !lhs.is_empty() {
                        let lhs_items = inclusive_parse(lhs, &ANY_PATTERN, cursor_offset);
                        for item in lhs_items {
                            self.state.aliases.push(Alias {
                                name: item.0.clone(),
                                position: item.1,
                                lhs_alias: None,
                            });
                            if !LHS_PATTERN.is_match(&item.0) {
                                self.problems.push(Problem {
                                    msg: format!("invalid word pattern: {}", item.0),
                                    position: item.1,
                                    code: ErrorCode::InvalidWordPattern,
                                });
                            }
                            if occupied_keys.contains(&item.0) {
                                self.problems.push(Problem {
                                    msg: format!("duplicate alias: ${}", item.0),
                                    position: item.1,
                                    code: ErrorCode::DuplicateAlias,
                                });
                            }
                        }
                    }

                    // parsing RHS
                    self.consume(
                        rhs,
                        cursor_offset + sub_src.len(),
                        namespace,
                        authoring_meta, // resolveQuotes
                    )?;
                } else {
                    // error if sub source is empty
                    if sub_src.is_empty() || sub_src.trim().is_empty() {
                        self.problems.push(Problem {
                            msg: "invalid empty expression line".to_owned(),
                            position: sub_src_items_pos[j],
                            code: ErrorCode::InvalidEmptyBinding,
                        });
                    } else {
                        self.problems.push(Problem {
                            msg: "invalid expression line".to_owned(),
                            position: sub_src_items_pos[j],
                            code: ErrorCode::InvalidExpression,
                        });
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

        // ignore next line problems
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
                Node::Opcode(v) => nodes = &mut v.parameters,
                _ => return Err(Error::StateUpdateFailed),
            }
        }
        nodes.push(node);
        Ok(())
    }

    /// Consumes items (separated by defnied boundries) in an text
    fn consume(
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
                    self.problems.push(Problem {
                        msg: "unexpected \">\"".to_owned(),
                        position: [cursor, cursor + 1],
                        code: ErrorCode::UnexpectedClosingAngleParen,
                    });
                    exp = exp.split_at(1).1;
                }
                ')' => {
                    if !self.state.parens.open.is_empty() {
                        self.state.parens.close.push(cursor + 1);
                        self.process_opcode()?;
                        self.state.depth -= 1;
                    } else {
                        self.problems.push(Problem {
                            msg: "unexpected \")\"".to_owned(),
                            position: [cursor, cursor + 1],
                            code: ErrorCode::UnexpectedClosingParen,
                        });
                    }
                    exp = exp.split_at(1).1;
                }
                _ => {
                    let consumed = self.process_next(exp, cursor, namespace, authoring_meta)?;
                    exp = exp.split_at(consumed).1;
                }
            }
        }
        Ok(())
    }

    /// resolves the Opcode AST type once its respective closing paren has been consumed
    fn process_opcode(&mut self) -> Result<(), Error> {
        self.state.parens.open.pop();
        let end_position = self.state.parens.close.pop().ok_or(Error::FailedToParse)?;

        let mut nodes = &mut self.state.nodes;
        for _ in 0..self.state.depth - 1 {
            let len = nodes.len();
            match &mut nodes[len - 1] {
                Node::Opcode(v) => nodes = &mut v.parameters,
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
                        if let Some(b) = self.search_name(quote, v.1[0], namespace) {
                            match &b.item {
                                BindingItem::Elided(e) => {
                                    let msg = e.msg.to_owned();
                                    self.problems.push(Problem {
                                        msg,
                                        position: v.1,
                                        code: ErrorCode::ElidedBinding,
                                    });
                                }
                                BindingItem::Constant(_c) => {
                                    self.problems.push(Problem {
                                        msg: format!(
                                            "invalid quote: {}, cannot quote constants",
                                            quote
                                        ),
                                        position: v.1,
                                        code: ErrorCode::InvalidQuote,
                                    });
                                }
                                _ => {
                                    if let Some(_p) = b
                                        .problems
                                        .iter()
                                        .find(|v| v.code == ErrorCode::CircularDependency)
                                    {
                                        self.problems.push(Problem {
                                            msg: "quoted binding has circular dependency"
                                                .to_owned(),
                                            position: v.1,
                                            code: ErrorCode::CircularDependency,
                                        });
                                    }
                                }
                            };
                        } else {
                            self.problems.push(Problem {
                                msg: format!("undefined quote: {}", quote),
                                position: v.1,
                                code: ErrorCode::UndefinedQuote,
                            });
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
                    self.problems.push(Problem {
                        msg: format!("invalid argument pattern: {}", v.0),
                        position: v.1,
                        code: ErrorCode::InvalidOperandArg,
                    });
                }
            }
        } else {
            self.problems.push(Problem {
                msg: "expected \">\"".to_owned(),
                position: [cursor, cursor + exp.len()],
                code: ErrorCode::ExpectedClosingAngleBracket,
            });
            op.operand_args = Some(OperandArg {
                position: [cursor, cursor + exp.len()],
                args: vec![],
            });
        }
        remaining
    }

    /// parses an upcoming word to the corresponding AST node
    fn process_next(
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
                parameters: vec![],
                operand_args: None,
                lhs_alias: None,
            };
            if next.is_empty() {
                self.problems.push(Problem {
                    msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis".to_owned(),
                    position: next_pos,
                    code: ErrorCode::ExpectedOpcode
                });
            } else if !WORD_PATTERN.is_match(next) {
                self.problems.push(Problem {
                    msg: format!("invalid word pattern: {}", next),
                    position: next_pos,
                    code: ErrorCode::InvalidWordPattern,
                });
            } else if let Some(word) = authoring_meta.0.iter().find(|&v| v.word.as_str() == next) {
                op.opcode.description = word.description.clone();
            } else if !self.ignore_undefined_authoring_meta {
                self.problems.push(Problem {
                    msg: format!("unknown opcode: {}", next),
                    position: next_pos,
                    code: ErrorCode::UndefinedOpcode,
                });
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
                self.problems.push(Problem {
                    msg: "expected \")\"".to_owned(),
                    position: [next_pos[0], pos + 1],
                    code: ErrorCode::ExpectedClosingParen,
                });
            } else {
                self.problems.push(Problem {
                    msg: "expected \"(\"".to_owned(),
                    position: next_pos,
                    code: ErrorCode::ExpectedOpeningParen,
                });
            }
        } else if next.contains('.') {
            if let Some(b) = self.search_name(next, cursor, namespace) {
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
                        let msg = e.msg.to_owned();
                        self.problems.push(Problem {
                            msg,
                            position: next_pos,
                            code: ErrorCode::ElidedBinding,
                        });
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                    BindingItem::Exp(_e) => {
                        self.problems.push(Problem {
                            msg: format!("invalid reference to binding: {}, only contant bindings can be referenced", next),
                            position: next_pos,
                            code: ErrorCode::InvalidReference
                        });
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
            if to_u256(next).is_err() {
                self.problems.push(Problem {
                    msg: "value out of range".to_owned(),
                    position: next_pos,
                    code: ErrorCode::OutOfRangeValue,
                });
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
                    NamespaceItem::Node(node) => match &node.element {
                        NamespaceNodeElement::Binding(b) => match &b.item {
                            BindingItem::Constant(c) => {
                                self.update_state(Node::Literal(Literal {
                                    value: c.value.clone(),
                                    position: next_pos,
                                    lhs_alias: None,
                                    id: Some(next.to_owned()),
                                }))?;
                            }
                            BindingItem::Elided(e) => {
                                self.problems.push(Problem {
                                    msg: e.msg.clone(),
                                    position: next_pos,
                                    code: ErrorCode::ElidedBinding,
                                });
                                self.update_state(Node::Alias(Alias {
                                    name: next.to_owned(),
                                    position: next_pos,
                                    lhs_alias: None,
                                }))?;
                            }
                            BindingItem::Exp(_e) => {
                                self.problems.push(Problem {
                                    msg: format!("invalid reference to binding: {}, only contant bindings can be referenced", next),
                                    position: next_pos,
                                    code: ErrorCode::InvalidReference
                                });
                                self.update_state(Node::Alias(Alias {
                                    name: next.to_owned(),
                                    position: next_pos,
                                    lhs_alias: None,
                                }))?;
                            }
                        },
                        NamespaceNodeElement::Dispair(_) => {
                            self.problems.push(Problem {
                                msg: format!("invalid reference: {}", next),
                                position: next_pos,
                                code: ErrorCode::InvalidReference,
                            });
                        }
                    },
                    NamespaceItem::Namespace(_ns) => {
                        self.problems.push(Problem {
                            msg: format!("invalid reference to namespace: {}", next),
                            position: next_pos,
                            code: ErrorCode::InvalidReference,
                        });
                        self.update_state(Node::Alias(Alias {
                            name: next.to_owned(),
                            position: next_pos,
                            lhs_alias: None,
                        }))?;
                    }
                }
            } else {
                self.problems.push(Problem {
                    msg: format!("undefined word: {}", next),
                    position: next_pos,
                    code: ErrorCode::UndefinedWord,
                });
                self.update_state(Node::Alias(Alias {
                    name: next.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                }))?;
            }
        } else {
            self.problems.push(Problem {
                msg: format!("{} is not a valid rainlang word", next),
                position: next_pos,
                code: ErrorCode::InvalidWordPattern,
            });
            self.update_state(Node::Alias(Alias {
                name: next.to_owned(),
                position: next_pos,
                lhs_alias: None,
            }))?;
        }
        Ok(offset)
    }

    /// Search in namespaces for a name
    fn search_name<'a>(
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
            self.problems.push(Problem {
                msg: "namespace too depp".to_owned(),
                position: [offset, offset + query.len()],
                code: ErrorCode::DeepNamespace,
            });
            return None;
        }
        if segments[segments.len() - 1].0.is_empty() {
            self.problems.push(Problem {
                msg: "expected to end with a node".to_owned(),
                position: segments[segments.len() - 1].1,
                code: ErrorCode::UnexpectedNamespacePath,
            });
            return None;
        }
        let mut is_invalid = false;
        for invalid_segment in segments.iter().filter(|v| !WORD_PATTERN.is_match(&v.0)) {
            self.problems.push(Problem {
                msg: "invalid word pattern".to_owned(),
                position: invalid_segment.1,
                code: ErrorCode::InvalidWordPattern,
            });
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
                    NamespaceItem::Namespace(ns) => {
                        if let Some(namespace_item) = ns.get(&segment.0) {
                            result = namespace_item;
                        } else {
                            self.problems.push(Problem {
                                msg: format!("namespace has no member {}", segment.0),
                                position: segment.1,
                                code: ErrorCode::UndefinedNamespaceMember,
                            });
                            return None;
                        }
                    }
                    _ => {
                        self.problems.push(Problem {
                            msg: format!("namespace has no member {}", segment.0),
                            position: segment.1,
                            code: ErrorCode::UndefinedNamespaceMember,
                        });
                        return None;
                    }
                }
            }
            match result {
                NamespaceItem::Namespace(_ns) => {
                    self.problems.push(Problem {
                        msg: format!(
                            "expected to end with a node, {} is a namespace",
                            segments[segments.len() - 1].0
                        ),
                        position: [offset, offset + query.len()],
                        code: ErrorCode::UnexpectedNamespacePath,
                    });
                    None
                }
                NamespaceItem::Node(node) => match &node.element {
                    NamespaceNodeElement::Binding(e) => Some(e),
                    NamespaceNodeElement::Dispair(_) => None,
                },
            }
        } else {
            self.problems.push(Problem {
                msg: format!("namespace has no member {}", segments[0].0),
                position: segments[0].1,
                code: ErrorCode::UndefinedNamespaceMember,
            });
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use rain_meta::types::authoring::v1::AuthoringMetaItem;

    use super::*;

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
            parameters: vec![
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
            parameters: vec![
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
            parameters: vec![],
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
            parameters: vec![],
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

        Ok(())
    }

    #[test]
    fn test_process_next_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let namespace = HashMap::new();
        let authoring_meta = AuthoringMeta(vec![AuthoringMetaItem {
            word: "opcode".to_owned(),
            operand_parser_offset: 0,
            description: String::new(),
        }]);
        let text = "opcode<12 56>(";

        let consumed_count = rl.process_next(text, 10, &namespace, &authoring_meta)?;
        let expected_state_nodes = vec![Node::Opcode(Opcode {
            opcode: OpcodeDetails {
                name: "opcode".to_owned(),
                description: String::new(),
                position: [10, 16],
            },
            operand: None,
            output: None,
            position: [10, 0],
            parens: [23, 0],
            parameters: vec![],
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

        Ok(())
    }

    #[test]
    fn test_search_namespace_method() -> anyhow::Result<()> {
        let mut rl = RainlangDocument::new();
        let mut main_namespace: Namespace = HashMap::new();
        let mut deep_namespace: Namespace = HashMap::new();
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
        let deep_node = NamespaceItem::Node(NamespaceNode {
            hash: "some-hash".to_owned(),
            import_index: 1,
            element: NamespaceNodeElement::Binding(binding.clone()),
        });
        deep_namespace.insert("binding-name".to_string(), deep_node.clone());
        main_namespace.insert(
            "deep-namespace".to_string(),
            NamespaceItem::Namespace(deep_namespace),
        );

        let result1 = rl.search_name(".deep-namespace.binding-name", 0, &main_namespace);
        assert_eq!(Some(&binding), result1);

        let result2 = rl.search_name("deep-namespace.other-binding-name", 0, &main_namespace);
        assert_eq!(None, result2);

        Ok(())
    }
}
