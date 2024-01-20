//! All data types of RainDocument/RainlangDocument parse tree

use std::collections::HashMap;
use super::super::error::ErrorCode;
use serde::{Serialize, Deserialize};
use rain_meta::{NPE2Deployer, types::authoring::v1::AuthoringMeta};
use super::super::parser::{rainlangdocument::RainlangDocument, raindocument::RainDocument};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;

/// Type for start and end indexes of an ast node in a text, inclusive at start and exclusive at the end
#[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify::declare)]
pub type Offsets = [usize; 2];

/// Type for result of matches found in a text
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ParsedItem(pub String, pub Offsets);

/// Type for encountered problem within the text
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

/// Type for AST Value node
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

/// Type for AST Opcode node
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
    pub inputs: Vec<Node>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub lhs_alias: Option<Vec<Alias>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[cfg_attr(any(feature = "js-api", target_family = "wasm"), tsify(optional))]
    pub operand_args: Option<OperandArg>,
}

/// Type for AST Alias node
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

/// Type of a parsed comment
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
    pub groups: Vec<(ParsedItem, Option<ParsedItem>)>,
}

/// Type of an import meta sequence
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
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "IRainDocument", optional)
    )]
    pub dotrain: Option<RainDocument>,
}

/// Type of import statements specified in a RainDocument
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
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
    Literal(Literal),
    Opcode(Opcode),
    Alias(Alias),
}

impl Node {
    pub fn position(&self) -> Offsets {
        match self {
            Node::Literal(v) => v.position,
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
    Exp(RainlangDocument),
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

/// Type of an RainDocument namespace leaf element
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum NamespaceLeafElement {
    Binding(Binding),
    Dispair(DispairImportItem),
}

/// Type for a namespace leaf
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct NamespaceLeaf {
    pub hash: String,
    pub import_index: isize,
    pub element: NamespaceLeafElement,
}

impl NamespaceLeaf {
    pub fn is_binding(&self) -> bool {
        matches!(self.element, NamespaceLeafElement::Binding(_))
    }

    pub fn unwrap_binding(&self) -> &Binding {
        match &self.element {
            NamespaceLeafElement::Binding(b) => b,
            _ => panic!("not a binding"),
        }
    }

    pub fn is_dispair(&self) -> bool {
        matches!(self.element, NamespaceLeafElement::Dispair(_))
    }

    pub fn unwrap_dispair(&self) -> &DispairImportItem {
        match &self.element {
            NamespaceLeafElement::Dispair(d) => d,
            _ => panic!("not a dispair import"),
        }
    }

    pub fn is_elided_binding(&self) -> bool {
        match &self.element {
            NamespaceLeafElement::Binding(b) => {
                matches!(b.item, BindingItem::Elided(_))
            }
            _ => false,
        }
    }

    pub fn unwrap_elided_binding(&self) -> &String {
        match &self.element {
            NamespaceLeafElement::Binding(b) => {
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
            NamespaceLeafElement::Binding(b) => {
                matches!(b.item, BindingItem::Constant(_))
            }
            _ => false,
        }
    }

    pub fn unwrap_constant_binding(&self) -> &String {
        match &self.element {
            NamespaceLeafElement::Binding(b) => {
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
            NamespaceLeafElement::Binding(b) => {
                matches!(b.item, BindingItem::Exp(_))
            }
            _ => false,
        }
    }

    pub fn unwrap_exp_binding(&self) -> &RainlangDocument {
        match &self.element {
            NamespaceLeafElement::Binding(b) => {
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

/// RainDocument's individual namespace item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub enum NamespaceItem {
    Leaf(NamespaceLeaf),
    Node(Namespace),
}

impl NamespaceItem {
    pub fn is_leaf(&self) -> bool {
        match self {
            NamespaceItem::Leaf(_) => true,
            NamespaceItem::Node(_) => false,
        }
    }

    pub fn unwrap_leaf(&self) -> &NamespaceLeaf {
        match self {
            NamespaceItem::Leaf(node) => node,
            NamespaceItem::Node(_) => panic!("not a leaf"),
        }
    }

    pub fn unwrap_node(&self) -> &Namespace {
        match self {
            NamespaceItem::Leaf(_) => panic!("not a node"),
            NamespaceItem::Node(ns) => ns,
        }
    }

    pub fn is_binding(&self) -> bool {
        if let NamespaceItem::Leaf(n) = self {
            matches!(n.element, NamespaceLeafElement::Binding(_))
        } else {
            false
        }
    }

    pub fn unwrap_binding(&self) -> &Binding {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => b,
                _ => panic!("not a binding"),
            }
        } else {
            panic!("not a binding")
        }
    }

    pub fn is_dispair(&self) -> bool {
        if let NamespaceItem::Leaf(n) = self {
            matches!(n.element, NamespaceLeafElement::Dispair(_))
        } else {
            false
        }
    }

    pub fn unwrap_dispair(&self) -> &DispairImportItem {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Dispair(d) => d,
                _ => panic!("not a dispair"),
            }
        } else {
            panic!("not a dispair")
        }
    }

    pub fn is_elided_binding(&self) -> bool {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => matches!(&b.item, BindingItem::Elided(_)),
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_elided_binding(&self) -> &String {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => match &b.item {
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
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => matches!(&b.item, BindingItem::Constant(_)),
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_constant_binding(&self) -> &String {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => match &b.item {
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
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => matches!(&b.item, BindingItem::Exp(_)),
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn unwrap_exp_binding(&self) -> &RainlangDocument {
        if let NamespaceItem::Leaf(n) = self {
            match &n.element {
                NamespaceLeafElement::Binding(b) => match &b.item {
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
