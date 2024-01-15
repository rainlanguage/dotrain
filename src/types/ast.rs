//! All data types of RainDocument/RainlangDocument parse tree

use std::collections::HashMap;
use super::super::error::Error;
use serde::{Serialize, Deserialize};
use serde_repr::{Serialize_repr, Deserialize_repr};
use super::super::parser::rainlangdocument::RainlangDocument;
use rain_meta::{
    NPE2Deployer,
    types::{authoring::v1::AuthoringMeta, interpreter_caller::v1::InterpreterCallerMeta},
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

/// Error codes of Rainlang/RainDocument problem and LSP Diagnostics
#[derive(Debug, Clone, PartialEq, Copy, Serialize_repr, Deserialize_repr)]
#[repr(i32)]
#[cfg_attr(any(feature = "js-api", target_family = "wasm"), wasm_bindgen)]
pub enum ErrorCode {
    IllegalChar = 0,
    RuntimeError = 1,
    CircularDependency = 2,
    UnresolvableDependencies = 3,
    DeepImport = 4,
    DeepNamespace = 5,
    CorruptMeta = 6,
    ElidedBinding = 7,
    SingletonWords = 8,
    MultipleWords = 9,
    SingleWordModify = 10,
    InconsumableMeta = 11,
    NamespaceOccupied = 12,

    UndefinedWord = 0x101,
    UndefinedAuthoringMeta = 0x102,
    UndefinedMeta = 0x103,
    UndefinedQuote = 0x104,
    UndefinedOpcode = 0x105,
    UndefinedIdentifier = 0x106,
    UndefinedDeployer = 0x107,
    UndefinedNamespaceMember = 0x108,

    InvalidWordPattern = 0x201,
    InvalidExpression = 0x202,
    InvalidNestedNode = 0x203,
    InvalidSelfReference = 0x204,
    InvalidHash = 0x205,
    InvalidImport = 0x208,
    InvalidEmptyBinding = 0x209,
    InvalidBindingIdentifier = 0x210,
    InvalidQuote = 0x211,
    InvalidOperandArg = 0x212,
    InvalidReference = 0x213,
    InvalidRainDocument = 0x214,

    UnexpectedToken = 0x301,
    UnexpectedClosingParen = 0x302,
    UnexpectedNamespacePath = 0x303,
    UnexpectedRebinding = 0x304,
    UnexpectedClosingAngleParen = 0x305,
    UnexpectedEndOfComment = 0x306,
    UnexpectedComment = 0x307,
    UnexpectedPragma = 0x308,

    ExpectedOpcode = 0x401,
    ExpectedSpace = 0x402,
    ExpectedElisionOrRebinding = 0x403,
    ExpectedClosingParen = 0x404,
    ExpectedOpeningParen = 0x405,
    ExpectedClosingAngleBracket = 0x406,
    ExpectedName = 0x407,
    ExpectedSemi = 0x408,
    ExpectedHexLiteral = 0x409,
    ExpectedOperandArgs = 0x410,
    ExpectedRename = 0x411,

    MismatchRHS = 0x501,
    MismatchLHS = 0x502,
    MismatchOperandArgs = 0x503,

    OutOfRangeInputs = 0x601,
    OutOfRangeOperandArgs = 0x602,
    OutOfRangeValue = 0x603,

    DuplicateAlias = 0x701,
    DuplicateIdentifier = 0x702,
    DuplicateImportStatement = 0x703,
    DuplicateImport = 0x704,
}

impl ErrorCode {
    pub fn to_i32(&self) -> i32 {
        *self as i32
    }
}

impl TryFrom<i32> for ErrorCode {
    type Error = Error;
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        Ok(serde_json::from_str::<ErrorCode>(&value.to_string())?)
    }
}

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
pub struct Literal {
    pub value: String,
    pub position: Offsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub lhs_alias: Option<Vec<Alias>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub id: Option<String>,
}

/// Type of an opcode's descriptive details
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

/// Type of an individual opcode's operand arguments
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

/// Type of an opcode's all operand arguments segment
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

/// Type of an imported DISpair
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
        tsify(type = "Uint8Array")
    )]
    #[serde(with = "serde_bytes")]
    pub constructor_meta_hash: Vec<u8>,
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

/// Type of an import configurations (renames/rebindings)
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

/// Type of an AST node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum Node {
    Value(Literal),
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

/// Type of a Rainlang Line (delimited by ",")
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

/// Type of a Rainlang Source (delimited by ";")
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

/// Type of a Rainlang parse tree
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct RainlangAST(Vec<RainlangSource>);

/// Type of a elided binding
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ElidedBindingItem {
    pub msg: String,
}

/// Type of a constant binding
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ConstantBindingItem {
    pub value: String,
}

/// Type of an expression binding
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

/// Type of an RainDocument namespace node element
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
    pub fn is_binding(&self) -> bool {
        matches!(self.element, NamespaceNodeElement::Binding(_))
    }

    pub fn unwrap_binding(&self) -> &Binding {
        match &self.element {
            NamespaceNodeElement::Binding(b) => b,
            _ => panic!("not a binding"),
        }
    }

    pub fn is_context_alias(&self) -> bool {
        matches!(self.element, NamespaceNodeElement::ContextAlias(_))
    }

    pub fn unwrap_context_alias(&self) -> &ContextAlias {
        match &self.element {
            NamespaceNodeElement::ContextAlias(c) => c,
            _ => panic!("not a context alias"),
        }
    }

    pub fn is_dispair(&self) -> bool {
        matches!(self.element, NamespaceNodeElement::Dispair(_))
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
                matches!(b.item, BindingItem::Elided(_))
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
                matches!(b.item, BindingItem::Constant(_))
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
                matches!(b.item, BindingItem::Exp(_))
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

/// An RainDocument's individual namespace item
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

    pub fn is_binding(&self) -> bool {
        if let NamespaceItem::Node(n) = self {
            matches!(n.element, NamespaceNodeElement::Binding(_))
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
            matches!(n.element, NamespaceNodeElement::ContextAlias(_))
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
            matches!(n.element, NamespaceNodeElement::Dispair(_))
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
                NamespaceNodeElement::Binding(b) => matches!(&b.item, BindingItem::Elided(_)),
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
                NamespaceNodeElement::Binding(b) => matches!(&b.item, BindingItem::Constant(_)),
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
                NamespaceNodeElement::Binding(b) => matches!(&b.item, BindingItem::Exp(_)),
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
                    BindingItem::Exp(e) => e,
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
    pub fn from_caller_meta(meta: InterpreterCallerMeta) -> Result<Vec<ContextAlias>, Error> {
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
                        return Err(Error::DuplicateContextAliases);
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
                            return Err(Error::DuplicateContextAliases);
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
