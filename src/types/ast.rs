//! All data types of RainDocument/Rainlang parse tree

use super::super::error::Error;
use serde::{Serialize, Deserialize};
use serde_repr::{Serialize_repr, Deserialize_repr};

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
    UndefinedNamespaceMember = 0x308,

    ExpectedOpcode = 0x401,
    ExpectedSpace = 0x402,
    ExpectedElisionOrRebinding = 0x403,
    ExpectedClosingParen = 0x404,
    ExpectedOpeningParen = 0x405,
    ExpectedClosingAngleBracket = 0x406,
    ExpectedName = 0x407,
    ExpectedSemi = 0x408,
    ExpectedHash = 0x409,
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
