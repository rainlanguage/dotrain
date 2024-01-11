// #![allow(non_snake_case)]

use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use rain_meta::types::authoring::v1::AuthoringMeta;
use super::{
    raindocument::RAIN_DOCUMENT_CONSTANTS,
    super::{
        error::Error,
        types::{ast::*, patterns::*},
    },
    line_number, inclusive_parse, fill_in, exclusive_parse, tracked_trim, to_u256,
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, PartialEq)]
enum NamespaceSearchResult<'a> {
    Binding(&'a Binding),
    ContextAlias(&'a ContextAlias),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct Parens {
    open: Vec<usize>,
    close: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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
            // error: None,
        }
    }
}

/// Data structure (parse tree) of a Rainlang text
///
/// RainlangDocument represents the parse tree of a Rainlang text which is used by the
/// RainDocument and for providing LSP services.
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    wasm_bindgen,
    derive(Tsify)
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

    pub(crate) fn default() -> Self {
        RainlangDocument {
            text: String::new(),
            ast: vec![],
            problems: vec![],
            comments: vec![],
            error: None,
            ignore_undefined_authoring_meta: false,
            state: RainlangState {
                nodes: vec![],
                aliases: vec![],
                parens: Parens {
                    open: vec![],
                    close: vec![],
                },
                depth: 0,
            },
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
        let illegal_chars = inclusive_parse(&document, &ILLEGAL_CHAR, 0);
        if !illegal_chars.is_empty() {
            self.problems.push(Problem {
                msg: format!("illegal character: {}", illegal_chars[0].0),
                position: [illegal_chars[0].1[0], illegal_chars[0].1[0]],
                code: ErrorCode::IllegalChar,
            });
            return Ok(());
        } else {
            for v in inclusive_parse(&document, &COMMENT_PATTERN, 0).iter() {
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
        reserved_keys.extend(authoring_meta.0.iter().map(|v| v.word.clone()));
        reserved_keys.extend(RAIN_DOCUMENT_CONSTANTS.iter().map(|v| v.0.to_owned()));

        for (i, src) in src_items.iter().enumerate() {
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

            // parse and cache the sub-expressions
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
                        for item in lhs_items.iter() {
                            self.state.aliases.push(Alias {
                                name: item.0.clone(),
                                position: item.1,
                                lhs_alias: None,
                            });
                            if !LHS_PATTERN.is_match(&item.0) {
                                self.problems.push(Problem {
                                    msg: format!("invalid LHS alias: {}", item.0),
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
                    // error if sub expressions is empty
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
                    if let Some(c) = exp.chars().next() {
                        if !c.is_whitespace() && c != ',' && c != ')' {
                            self.problems.push(Problem {
                                msg: "expected to be separated by space".to_owned(),
                                position: [cursor, cursor + 1],
                                code: ErrorCode::ExpectedSpace,
                            });
                        }
                    }
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
        pos: usize,
        op: &mut Opcode,
        namespace: &Namespace,
    ) -> usize {
        let mut remaining = exp.len();
        if let Some(operand_close_index) = exp.find('>') {
            let slices = exp[1..].split_at(operand_close_index - 1);
            remaining = operand_close_index + 1;
            let operand_args = inclusive_parse(slices.0, &ANY_PATTERN, pos + 1);
            op.operand_args = Some(OperandArg {
                position: [pos, pos + slices.0.len() + 2],
                args: vec![],
            });
            for v in operand_args.iter() {
                if OPERAND_ARG_PATTERN.is_match(&v.0) {
                    let is_quote = v.0.starts_with('\'');
                    if is_quote {
                        let quote = &v.0[1..];
                        if quote.contains('.') {
                            if let Some(ns) = self.search_name(quote, v.1[0], true, namespace) {
                                match ns {
                                    NamespaceSearchResult::Binding(b) => {
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
                                                if let Some(_p) = b.problems.iter().find(|v| {
                                                    v.code == ErrorCode::CircularDependency
                                                }) {
                                                    self.problems.push(Problem {
                                                        msg:
                                                            "quoted binding has circular dependency"
                                                                .to_owned(),
                                                        position: v.1,
                                                        code: ErrorCode::CircularDependency,
                                                    });
                                                }
                                            }
                                        };
                                    }
                                    _ => {
                                        self.problems.push(Problem {
                                            msg: format!(
                                                "invalid quote: {}, only bindings can be quoted",
                                                quote
                                            ),
                                            position: v.1,
                                            code: ErrorCode::InvalidQuote,
                                        });
                                    }
                                };
                            } else {
                                self.problems.push(Problem {
                                    msg: format!("undefined quote: {}", quote),
                                    position: v.1,
                                    code: ErrorCode::UndefinedQuote,
                                });
                            }
                        } else if let Some(namespace_item) = namespace.get(quote) {
                            if let NamespaceItem::Node(node) = namespace_item {
                                match &node.element {
                                    NamespaceNodeElement::Binding(b) => {
                                        match &b.item {
                                            BindingItem::Elided(e) => {
                                                self.problems.push(Problem {
                                                    msg: e.msg.to_owned(),
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
                                                if let Some(_p) = b.problems.iter().find(|&v| {
                                                    v.code == ErrorCode::CircularDependency
                                                }) {
                                                    self.problems.push(Problem {
                                                        msg:
                                                            "quoted binding has circular dependency"
                                                                .to_owned(),
                                                        position: v.1,
                                                        code: ErrorCode::CircularDependency,
                                                    });
                                                }
                                            }
                                        };
                                    }
                                    _ => {
                                        self.problems.push(Problem {
                                            msg: format!(
                                                "invalid quote: {}, only bindings can be quoted",
                                                quote
                                            ),
                                            position: v.1,
                                            code: ErrorCode::InvalidQuote,
                                        });
                                    }
                                };
                            } else {
                                self.problems.push(Problem {
                                    msg: format!(
                                        "invalid quote: {}, only bindings can be quoted",
                                        quote
                                    ),
                                    position: v.1,
                                    code: ErrorCode::InvalidQuote,
                                });
                            }
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
                position: [pos, pos + exp.len()],
                code: ErrorCode::ExpectedClosingAngleBracket,
            });
            op.operand_args = Some(OperandArg {
                position: [pos, pos + exp.len()],
                args: vec![],
            });
        }
        remaining
    }

    /// parses an upcoming word to the corresponding AST node
    fn process_next(
        &mut self,
        text: &str,
        entry: usize,
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
        let next_pos = [entry, entry + next.len()];

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
                is_ctx: None,
                operand_args: None,
                lhs_alias: None,
            };
            if next.is_empty() {
                self.problems.push(Problem {
                    msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis".to_owned(),
                    position: next_pos,
                    code: ErrorCode::ExpectedOpcode
                });
            }
            if next.contains('.') {
                if let Some(ns_item) = self.search_name(next, entry, true, namespace) {
                    match ns_item {
                        NamespaceSearchResult::ContextAlias(c) => {
                            op.opcode.description = c.description.clone();
                            op.is_ctx = Some((c.column, c.row));
                        }
                        NamespaceSearchResult::Binding(b) => {
                            let n = b.name.clone();
                            self.problems.push(Problem {
                                msg: format!("{} is not an opcode", n),
                                position: next_pos,
                                code: ErrorCode::ExpectedOpcode,
                            });
                        }
                    }
                } else if !self.ignore_undefined_authoring_meta {
                    self.problems.push(Problem {
                        msg: format!("unknown opcode: {}", next),
                        position: next_pos,
                        code: ErrorCode::UndefinedOpcode,
                    });
                }
            } else if next.is_empty() {
                // @TODO - improve problems
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
                    self.process_operand(remaining, entry + next.len(), &mut op, namespace);
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
            if let Some(namespace_item) = self.search_name(next, entry, true, namespace) {
                match namespace_item {
                    NamespaceSearchResult::Binding(b) => match &b.item {
                        BindingItem::Constant(c) => {
                            let value = c.value.to_owned();
                            self.update_state(Node::Value(Value {
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
                    },
                    other => {
                        let msg = match other {
                            NamespaceSearchResult::ContextAlias(_c) => {
                                format!("invalid reference to context alias: {}", next)
                            }
                            NamespaceSearchResult::Binding(_b) => String::new(),
                        };
                        self.problems.push(Problem {
                            msg,
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
            self.update_state(Node::Value(Value {
                value: next.to_owned(),
                position: next_pos,
                lhs_alias: None,
                id: None,
            }))?;
        } else if WORD_PATTERN.is_match(next) {
            if let Some(c) = RAIN_DOCUMENT_CONSTANTS.iter().find(|&&v| v.0 == next) {
                self.update_state(Node::Value(Value {
                    value: c.1.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                    id: Some(next.to_owned()),
                }))?;
            } else if self.state.aliases.iter().any(|v| v.name == next) {
                self.problems.push(Problem {
                    msg: "cannot reference self".to_owned(),
                    position: next_pos,
                    code: ErrorCode::InvalidSelfReference,
                });
                self.update_state(Node::Alias(Alias {
                    name: next.to_owned(),
                    position: next_pos,
                    lhs_alias: None,
                }))?;
            } else if self.ast[self.ast.len() - 1]
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
                                self.update_state(Node::Value(Value {
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
                        NamespaceNodeElement::ContextAlias(_c) => {
                            self.problems.push(Problem {
                                msg: format!("invalid reference to context alias: {}", next),
                                position: next_pos,
                                code: ErrorCode::InvalidReference,
                            });
                            self.update_state(Node::Alias(Alias {
                                name: next.to_owned(),
                                position: next_pos,
                                lhs_alias: None,
                            }))?;
                        }
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
    #[allow(clippy::while_let_on_iterator)]
    fn search_name<'a>(
        &'a mut self,
        query: &str,
        offset: usize,
        report_problems: bool,
        namespace: &'a Namespace,
    ) -> Option<NamespaceSearchResult> {
        let mut names = exclusive_parse(query, &NAMESPACE_SEGMENT_PATTERN, offset, true);
        if query.starts_with('.') {
            names = names[1..].to_vec()
        }
        if names.len() > 32 {
            if report_problems {
                self.problems.push(Problem {
                    msg: "namespace too depp".to_owned(),
                    position: [offset, offset + query.len()],
                    code: ErrorCode::DeepNamespace,
                });
            }
            return None;
        }
        if names[names.len() - 1].0.is_empty() {
            if report_problems {
                self.problems.push(Problem {
                    msg: "expected to end with a node".to_owned(),
                    position: names[names.len() - 1].1,
                    code: ErrorCode::UnexpectedNamespacePath,
                });
            }
            return None;
        }
        let mut is_invalid = false;
        for invalid_segment in names.iter().filter(|v| !WORD_PATTERN.is_match(&v.0)) {
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

        if let Some(namespace_item) = namespace.get(&names[0].0) {
            let mut result = namespace_item;
            let mut iter = names[1..].iter();
            while let Some(segment) = iter.next() {
                match result {
                    NamespaceItem::Namespace(ns) => {
                        if let Some(namespace_item) = ns.get(&segment.0) {
                            result = namespace_item;
                        } else {
                            if report_problems {
                                self.problems.push(Problem {
                                    msg: format!("namespace has no member {}", segment.0),
                                    position: segment.1,
                                    code: ErrorCode::UndefinedNamespaceMember,
                                });
                            }
                            return None;
                        }
                    }
                    _ => {
                        if report_problems {
                            self.problems.push(Problem {
                                msg: format!("namespace has no member {}", segment.0),
                                position: segment.1,
                                code: ErrorCode::UndefinedNamespaceMember,
                            });
                        }
                        return None;
                    }
                }
            }
            match result {
                NamespaceItem::Namespace(_ns) => {
                    if report_problems {
                        self.problems.push(Problem {
                            msg: format!(
                                "expected to end with a node, {} is a namespace",
                                names[names.len() - 1].0
                            ),
                            position: [offset, offset + query.len()],
                            code: ErrorCode::UnexpectedNamespacePath,
                        });
                    }
                    None
                }
                NamespaceItem::Node(node) => match &node.element {
                    NamespaceNodeElement::Binding(e) => {
                        return Some(NamespaceSearchResult::Binding(e))
                    }
                    NamespaceNodeElement::ContextAlias(e) => {
                        return Some(NamespaceSearchResult::ContextAlias(e))
                    }
                    NamespaceNodeElement::Dispair(_) => None,
                },
            }
        } else {
            if report_problems {
                // if !is_opcode || !self.ignore_uam {
                self.problems.push(Problem {
                    msg: format!("namespace has no member {}", names[0].0),
                    position: names[0].1,
                    code: ErrorCode::UndefinedNamespaceMember,
                });
                // }
            }
            None
        }
    }
}
