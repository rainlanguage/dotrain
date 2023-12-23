// #![allow(non_snake_case)]

use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use super::{
    ErrorCode,
    super::parser::{rainlang::RainlangDocument, raindocument::RainDocument},
};
use rain_meta::{
    NPE2Deployer,
    types::{authoring::v1::AuthoringMeta, interpreter_caller::v1::InterpreterCallerMeta},
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

/// Type for start and end indexes of an ast node in a text, inclusive at start and exclusive at the end
#[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify::declare)]
pub type Offsets = [usize; 2];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
/// Type for result of matches found in a String
pub struct ParsedItem(pub String, pub Offsets);

/// Type for Rainlang/RainDocument problem
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Problem {
    pub msg: String,
    pub position: Offsets,
    pub code: ErrorCode,
}

/// Type Rainlang AST Value node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Value {
    pub value: String,
    pub position: Offsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub lhs_alias: Option<Vec<Alias>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct OpcodeDetails {
    pub name: String,
    pub description: String,
    pub position: Offsets,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct OperandArgItem {
    pub value: String,
    pub name: String,
    pub position: Offsets,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct OperandArg {
    pub position: Offsets,
    pub args: Vec<OperandArgItem>,
}

/// Type for Rainlang AST Opcode node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Opcode {
    pub opcode: OpcodeDetails,
    pub operand: Option<u8>,
    pub output: Option<u8>,
    pub position: Offsets,
    pub parens: Offsets,
    pub parameters: Vec<Node>,
    pub is_ctx: Option<(u8, Option<u8>)>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub lhs_alias: Option<Vec<Alias>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub operand_args: Option<OperandArg>,
}

/// Type for Rainlang/RainDocument alias
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Alias {
    pub name: String,
    pub position: Offsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub lhs_alias: Option<Vec<Alias>>,
}

/// Type for Rainlang/RainDocument comments
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Comment {
    pub comment: String,
    pub position: Offsets,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
#[serde(rename_all = "camelCase")]
pub struct DispairImportItem {
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "string")
    )]
    pub constructor_meta_hash: String,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub constructor_meta_bytes: Vec<u8>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub parser: Vec<u8>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub store: Vec<u8>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub interpreter: Vec<u8>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub bytecode: Vec<u8>,
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "IAuthoringMeta | undefined")
    )]
    pub authoring_meta: Option<AuthoringMeta>,
}

impl From<NPE2Deployer> for DispairImportItem {
    fn from(value: NPE2Deployer) -> Self {
        DispairImportItem {
            constructor_meta_hash: value.meta_hash,
            constructor_meta_bytes: value.meta_bytes,
            parser: value.parser,
            store: value.store,
            interpreter: value.interpreter,
            bytecode: value.bytecode,
            authoring_meta: value.authoring_meta,
        }
    }
}

impl From<DispairImportItem> for NPE2Deployer {
    fn from(value: DispairImportItem) -> Self {
        NPE2Deployer {
            meta_hash: value.constructor_meta_hash,
            meta_bytes: value.constructor_meta_bytes,
            bytecode: value.bytecode,
            parser: value.parser,
            store: value.store,
            interpreter: value.interpreter,
            authoring_meta: value.authoring_meta,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ImportSequence {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub dispair: Option<DispairImportItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub ctxmeta: Option<Vec<ContextAlias>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "IRainDocument", optional)
    )]
    pub dotrain: Option<RainDocument>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ImportConfiguration {
    pub problems: Vec<Problem>,
    pub pairs: Vec<(ParsedItem, Option<ParsedItem>)>,
}

/// Type of import statements specified in a RainDocument
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
// #[wasm_bindgen]
pub struct Import {
    pub name: String,
    pub name_position: Offsets,
    pub hash: String,
    pub hash_position: Offsets,
    pub position: Offsets,
    pub problems: Vec<Problem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub configuration: Option<ImportConfiguration>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub sequence: Option<ImportSequence>,
}

/// Type of an AST node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum Node {
    Value(Value),
    Opcode(Opcode),
    Alias(Alias),
}

impl Node {
    pub fn position(&self) -> Offsets {
        match self {
            Node::Value(v) => v.position,
            Node::Opcode(op) => op.position,
            Node::Alias(a) => a.position,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct RainlangLine {
    pub nodes: Vec<Node>,
    pub position: Offsets,
    pub aliases: Vec<Alias>,
}

/// Type of a Rainlang AST
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct RainlangSource {
    pub lines: Vec<RainlangLine>,
    pub position: Offsets,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct RainlangAST(Vec<RainlangSource>);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ElidedBindingItem {
    pub msg: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ConstantBindingItem {
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum BindingItem {
    Elided(ElidedBindingItem),
    Constant(ConstantBindingItem),
    Exp(
        #[cfg_attr(
            any(feature = "js-api", target_family = "wasm"),
            tsify(type = "IRainlangDocument")
        )]
        RainlangDocument,
    ),
}
/// Type for a binding (named expressions)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct Binding {
    pub name: String,
    pub name_position: Offsets,
    pub content: String,
    pub content_position: Offsets,
    pub position: Offsets,
    pub problems: Vec<Problem>,
    pub dependencies: Vec<String>,
    pub item: BindingItem,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum NamespaceNodeElement {
    Binding(Binding),
    ContextAlias(ContextAlias),
    Dispair(DispairImportItem),
}

/// Type for a namespace node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct NamespaceNode {
    pub hash: String,
    pub import_index: isize,
    pub element: NamespaceNodeElement,
}

impl NamespaceNode {
    // pub fn is_word(&self) -> bool {
    //     match self.element {
    //         NamespaceNodeElement::Word(_) => true,
    //         _ => false
    //     }
    // }

    // pub fn unwrap_word(&self) -> &AuthoringMetaItem {
    //     match &self.element {
    //         NamespaceNodeElement::Word(w) => w,
    //         _ => panic!("not a word")
    //     }
    // }

    pub fn is_binding(&self) -> bool {
        match self.element {
            NamespaceNodeElement::Binding(_) => true,
            _ => false,
        }
    }

    pub fn unwrap_binding(&self) -> &Binding {
        match &self.element {
            NamespaceNodeElement::Binding(b) => b,
            _ => panic!("not a binding"),
        }
    }

    pub fn is_context_alias(&self) -> bool {
        match self.element {
            NamespaceNodeElement::ContextAlias(_) => true,
            _ => false,
        }
    }

    pub fn unwrap_context_alias(&self) -> &ContextAlias {
        match &self.element {
            NamespaceNodeElement::ContextAlias(c) => c,
            _ => panic!("not a context alias"),
        }
    }

    pub fn is_dispair(&self) -> bool {
        match self.element {
            NamespaceNodeElement::Dispair(_) => true,
            _ => false,
        }
    }

    pub fn unwrap_dispair(&self) -> &DispairImportItem {
        match &self.element {
            NamespaceNodeElement::Dispair(d) => d,
            _ => panic!("not a dispair import"),
        }
    }

    pub fn is_elided_binding(&self) -> bool {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Elided(_) = b.item {
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    pub fn unwrap_elided_binding(&self) -> &String {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Elided(e) = &b.item {
                    &e.msg
                } else {
                    panic!("not an elided binding")
                }
            }
            _ => panic!("not an elided binding"),
        }
    }

    pub fn is_constant_binding(&self) -> bool {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Constant(_) = b.item {
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    pub fn unwrap_constant_binding(&self) -> &String {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Constant(c) = &b.item {
                    &c.value
                } else {
                    panic!("not a constant binding")
                }
            }
            _ => panic!("not a constant binding"),
        }
    }

    pub fn is_exp_binding(&self) -> bool {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Exp(_) = b.item {
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    pub fn unwrap_exp_binding(&self) -> &RainlangDocument {
        match &self.element {
            NamespaceNodeElement::Binding(b) => {
                if let BindingItem::Exp(e) = &b.item {
                    e
                } else {
                    panic!("not an exp binding")
                }
            }
            _ => panic!("not an exp binding"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum NamespaceItem {
    Node(NamespaceNode),
    Namespace(Namespace),
}

impl NamespaceItem {
    pub fn is_node(&self) -> bool {
        match self {
            NamespaceItem::Node(_) => true,
            NamespaceItem::Namespace(_) => false,
        }
    }

    pub fn unwrap_node(&self) -> &NamespaceNode {
        match self {
            NamespaceItem::Node(node) => node,
            NamespaceItem::Namespace(_) => panic!("not a namespace node"),
        }
    }

    pub fn unwrap_namespace(&self) -> &Namespace {
        match self {
            NamespaceItem::Node(_) => panic!("not a namespace"),
            NamespaceItem::Namespace(ns) => ns,
        }
    }

    // pub fn is_word(&self) -> bool {
    //     if let NamespaceItem::Node(n) = self {
    //         match n.element {
    //             NamespaceNodeElement::Word(_) => true,
    //             _ => false
    //         }
    //     } else {
    //         false
    //     }
    // }

    // pub fn unwrap_word(&self) -> &AuthoringMetaItem {
    //     if let NamespaceItem::Node(n) = self {
    //         match &n.element {
    //             NamespaceNodeElement::Word(w) => w,
    //             _ => panic!("not a word")
    //         }
    //     } else {
    //         panic!("not a word")
    //     }
    // }

    pub fn is_binding(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match n.element {
                NamespaceNodeElement::Binding(_) => true,
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_binding(&self) -> &Binding {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => b,
                _ => panic!("not a binding"),
            }
        } else {
            panic!("not a binding")
        }
    }

    pub fn is_context_alias(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match n.element {
                NamespaceNodeElement::ContextAlias(_) => true,
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_context_alias(&self) -> &ContextAlias {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::ContextAlias(c) => c,
                _ => panic!("not a context alias"),
            }
        } else {
            panic!("not a context alias")
        }
    }

    pub fn is_dispair(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match n.element {
                NamespaceNodeElement::Dispair(_) => true,
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_dispair(&self) -> &DispairImportItem {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Dispair(d) => d,
                _ => panic!("not a dispair import"),
            }
        } else {
            panic!("not a dispair import")
        }
    }

    pub fn is_elided_binding(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Elided(_) => true,
                    _ => false,
                },
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_elided_binding(&self) -> &String {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Elided(e) => &e.msg,
                    _ => panic!("not an elided binding"),
                },
                _ => panic!("not an elided binding"),
            }
        } else {
            panic!("not an elided binding")
        }
    }

    pub fn is_constant_binding(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Constant(_) => true,
                    _ => false,
                },
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_constant_binding(&self) -> &String {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Constant(c) => &c.value,
                    _ => panic!("not a constant binding"),
                },
                _ => panic!("not a constant binding"),
            }
        } else {
            panic!("not a constant binding")
        }
    }

    pub fn is_exp_binding(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Exp(_) => true,
                    _ => false,
                },
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_exp_binding(&self) -> &RainlangDocument {
        if let NamespaceItem::Node(n) = self {
            match &n.element {
                NamespaceNodeElement::Binding(b) => match &b.item {
                    BindingItem::Exp(e) => &e,
                    _ => panic!("not an exp binding"),
                },
                _ => panic!("not an exp binding"),
            }
        } else {
            panic!("not an exp binding")
        }
    }
}

/// Type for a namespace in dotrain
#[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify::declare)]
pub type Namespace = HashMap<String, NamespaceItem>;

/// Type for context aliases from a contract caller meta
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ContextAlias {
    pub name: String,
    pub description: String,
    pub column: u8,
    pub row: Option<u8>,
}

impl ContextAlias {
    pub fn from_caller_meta(meta: InterpreterCallerMeta) -> anyhow::Result<Vec<ContextAlias>> {
        let mut ctxs: Vec<ContextAlias> = vec![];
        for method in meta.methods {
            for exp in method.expressions {
                for (i, col) in exp.context_columns.iter().enumerate() {
                    let ctx_coll = ContextAlias {
                        name: if let Some(a) = &col.alias {
                            a.value.clone()
                        } else {
                            String::new()
                        },
                        description: col.desc.value.clone(),
                        column: i as u8,
                        row: None,
                    };
                    let mut ok = true;
                    if !ctxs.iter().any(|v| *v == ctx_coll) {
                        ok = true;
                    }
                    if ctxs.iter().any(|v| v.name == ctx_coll.name) {
                        return Err(anyhow::anyhow!("includes duplicates!"));
                    }
                    if ok {
                        ctxs.push(ctx_coll);
                    }
                    for (j, cell) in col.cells.iter().enumerate() {
                        let ctx_cell = ContextAlias {
                            name: if let Some(a) = &cell.alias {
                                a.value.clone()
                            } else {
                                String::new()
                            },
                            column: i as u8,
                            row: Some(j as u8),
                            description: cell.desc.value.clone(),
                        };
                        let mut _ok = true;
                        if !ctxs.iter().any(|v| *v == ctx_cell) {
                            _ok = true;
                        }
                        if ctxs.iter().any(|v| v.name == ctx_cell.name) {
                            return Err(anyhow::anyhow!("includes duplicates!"));
                        }
                        if _ok {
                            ctxs.push(ctx_cell);
                        }
                    }
                }
            }
        }
        Ok(ctxs)
    }
}
