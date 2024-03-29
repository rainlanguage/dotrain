use super::types::ast::{Offsets, Problem};
use serde_repr::{Serialize_repr, Deserialize_repr};

#[cfg(feature = "js-api")]
use tsify::Tsify;
#[cfg(feature = "js-api")]
use wasm_bindgen::prelude::*;

/// All Error codes of RainlangDocument/RainDocument problem and LSP Diagnostics
#[derive(Debug, Clone, PartialEq, Copy, Serialize_repr, Deserialize_repr)]
#[cfg_attr(feature = "js-api", wasm_bindgen)]
#[repr(i32)]
pub enum ErrorCode {
    IllegalChar = 0,
    RuntimeError = 1,
    CircularDependency = 2,
    NoFrontMatterSplitter = 3,
    DeepImport = 4,
    DeepNamespace = 5,
    DeepQuote = 6,
    ElidedBinding = 7,
    NoneTopLevelImport = 8,
    NativeParserError = 9,
    InconsumableMeta = 10,
    OccupiedNamespace = 11,
    OddLenHex = 12,
    CollidingNamespaceNodes = 13,
    DepsResolvingFailed = 14,
    CorruptMeta = 15,

    UndefinedWord = 0x101,
    UndefinedImport = 0x103,
    UndefinedQuote = 0x104,
    UndefinedNamespaceMember = 0x105,
    UndefinedIdentifier = 0x106,

    InvalidWordPattern = 0x201,
    InvalidExpression = 0x202,
    InvalidNamespaceReference = 0x203,
    InvalidEmptyLine = 0x204,
    InvalidHash = 0x205,
    InvalidReferenceLiteral = 0x206,
    InvalidRainDocument = 0x207,
    InvalidImport = 0x208,
    InvalidEmptyBinding = 0x209,
    InvalidLiteralQuote = 0x210,
    InvalidOperandArg = 0x211,
    InvalidSuppliedRebindings = 0x212,
    InvalidReferenceAll = 0x213,

    UnexpectedToken = 0x301,
    UnexpectedClosingParen = 0x302,
    UnexpectedNamespacePath = 0x303,
    UnexpectedRebinding = 0x304,
    UnexpectedClosingAngleParen = 0x305,
    UnexpectedEndOfComment = 0x306,
    UnexpectedComment = 0x307,
    UnexpectedPragma = 0x308,
    UnexpectedRename = 0x309,
    UnexpectedStringLiteralEnd = 0x310,
    UnexpectedSubParserEnd = 0x311,

    ExpectedOpcode = 0x401,
    ExpectedRename = 0x402,
    ExpectedElisionOrRebinding = 0x403,
    ExpectedClosingParen = 0x404,
    ExpectedOpeningParen = 0x405,
    ExpectedClosingAngleBracket = 0x406,
    ExpectedHexLiteral = 0x407,
    ExpectedSemi = 0x408,
    ExpectedLiteral = 0x409,

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
    pub fn to_i32(self) -> i32 {
        self as i32
    }

    pub fn to_problem(self, msg_items: Vec<&str>, position: Offsets) -> Problem {
        let msg = match self {
            Self::IllegalChar => format!("illegal character: {}", msg_items[0]),
            Self::RuntimeError => msg_items[0].to_owned(),
            Self::CircularDependency => "circular dependency".to_owned(),
            Self::DeepImport => "import too deep".to_owned(),
            Self::DeepNamespace => "namespace path too deep".to_owned(),
            Self::DeepQuote => "quote too deep".to_owned(),
            Self::ElidedBinding => format!("elided binding '{}': {}", msg_items[0], msg_items[1]),
            Self::InconsumableMeta => "import contains inconsumable meta".to_owned(),
            Self::OccupiedNamespace => "cannot import into an occupied namespace".to_owned(),
            Self::CollidingNamespaceNodes => "namespace nodes colliding".to_owned(),
            Self::OddLenHex => "odd length hex literal".to_owned(),
            Self::NoneTopLevelImport => "imports can only be stated at top level".to_owned(),
            Self::NativeParserError => msg_items[0].to_owned(),
            Self::DepsResolvingFailed => "failed to resolve dependencies".to_owned(),
            Self::NoFrontMatterSplitter => "cannot find front matter splitter".to_owned(),
            Self::CorruptMeta => "corrupt meta".to_owned(),

            Self::UndefinedWord => format!("undefined word: {}", msg_items[0]),
            Self::UndefinedImport => format!("cannot find any settlement for import: {}", msg_items[0]),
            Self::UndefinedQuote => format!("undefined quote: {}", msg_items[0]),
            Self::UndefinedIdentifier => format!("undefined identifier: {}", msg_items[0]),
            Self::UndefinedNamespaceMember => format!("namespace has no member: {}", msg_items[0]),

            Self::InvalidWordPattern => format!("invalid word pattern: {}", msg_items[0]),
            Self::InvalidExpression => "invalid expression line".to_owned(),
            Self::InvalidHash => "invalid hash, must be 32 bytes".to_owned(),
            Self::InvalidImport => "expected a valid name or hash".to_owned(),
            Self::InvalidEmptyBinding => "invalid empty expression".to_owned(),
            Self::InvalidEmptyLine => "invalid empty expression line".to_owned(),
            Self::InvalidLiteralQuote => format!("invalid quote: {}, cannot quote literals", msg_items[0]),
            Self::InvalidOperandArg => format!("invalid argument pattern: {}", msg_items[0]),
            Self::InvalidReferenceLiteral => format!("invalid reference to binding: {}, only literal bindings can be referenced", msg_items[0]),
            Self::InvalidRainDocument => "imported rain document contains top level errors".to_owned(),
            Self::InvalidNamespaceReference => format!("expected a node, {} is a namespace", msg_items[0]),
            Self::InvalidSuppliedRebindings => format!("invalid supplied rebinding: {}", msg_items[0]),
            Self::InvalidReferenceAll => format!("invalid reference to binding: {}, only literal or quote bindings can be referenced", msg_items[0]),

            Self::UnexpectedToken => "unexpected token".to_owned(),
            Self::UnexpectedClosingParen => "unexpected \")\"".to_owned(),
            Self::UnexpectedNamespacePath => "unexpected path, must end with a node".to_owned(),
            Self::UnexpectedRebinding => "unexpected rebinding".to_owned(),
            Self::UnexpectedClosingAngleParen => "unexpected \">\"".to_owned(),
            Self::UnexpectedEndOfComment => "unexpected end of comment".to_owned(),
            Self::UnexpectedComment => "unexpected comment".to_owned(),
            Self::UnexpectedPragma => "unexpected pragma, expected only one statement at top".to_owned(),
            Self::UnexpectedRename => format!("unexpected rename, name '{}' already taken", msg_items[0]),
            Self::UnexpectedStringLiteralEnd => "unexpected end of string literal".to_owned(),
            Self::UnexpectedSubParserEnd => "unexpected end of sub parser syntax".to_owned(),

            Self::ExpectedOpcode => "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis".to_owned(),
            Self::ExpectedElisionOrRebinding => "expected rebinding or elision".to_owned(),
            Self::ExpectedClosingParen => "expected \")\"".to_owned(),
            Self::ExpectedOpeningParen => "expected \"(\"".to_owned(),
            Self::ExpectedClosingAngleBracket => "expected \">\"".to_owned(),
            Self::ExpectedSemi => "expected to end with semi".to_owned(),
            Self::ExpectedHexLiteral => "expected to be followed by a hex literal".to_owned(),
            Self::ExpectedRename => "expected to be renamed".to_owned(),
            Self::ExpectedLiteral => "expected to be followed by a literal".to_owned(),

            Self::MismatchRHS => String::new(),
            Self::MismatchLHS => String::new(),
            Self::MismatchOperandArgs => String::new(),

            Self::OutOfRangeInputs => String::new(),
            Self::OutOfRangeOperandArgs => String::new(),
            Self::OutOfRangeValue => "value out of range".to_owned(),

            Self::DuplicateAlias => format!("duplicate alias: {}", msg_items[0]),
            Self::DuplicateIdentifier => "duplicate identifier".to_owned(),
            Self::DuplicateImportStatement => "duplicate import statement".to_owned(),
            Self::DuplicateImport => "duplicate import".to_owned(),
        };
        Problem {
            msg,
            position,
            code: self,
        }
    }
}

impl TryFrom<i32> for ErrorCode {
    type Error = Error;
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        Ok(serde_json::from_str::<ErrorCode>(&value.to_string())?)
    }
}

/// Covers all errors variants of this library's methods and functions returns
#[derive(Debug)]
pub enum Error {
    FailedToParse,
    OutOfCharBoundry,
    StateUpdateFailed,
    InvalidNumbericValue,
    InvalidOverride(String),
    SerdeJsonError(serde_json::Error),
    ParseIntError(std::num::ParseIntError),
    UintParseError(alloy_primitives::ruint::ParseError),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::OutOfCharBoundry => f.write_str("position is not within char boundry"),
            Error::StateUpdateFailed => f.write_str("failed to update parse state"),
            Error::FailedToParse => f.write_str("failed to parse, something went wrong"),
            Error::InvalidNumbericValue => {
                f.write_str("does not follow rain numeric pattern and range")
            }
            Error::InvalidOverride(v) => write!(f, "{}", v),
            Error::SerdeJsonError(v) => write!(f, "{}", v),
            Error::UintParseError(v) => write!(f, "{}", v),
            Error::ParseIntError(v) => write!(f, "{}", v),
        }
    }
}

impl std::error::Error for Error {}

impl From<serde_json::Error> for Error {
    fn from(value: serde_json::Error) -> Self {
        Error::SerdeJsonError(value)
    }
}

impl From<String> for Error {
    fn from(value: String) -> Self {
        Error::InvalidOverride(value)
    }
}

impl From<alloy_primitives::ruint::ParseError> for Error {
    fn from(value: alloy_primitives::ruint::ParseError) -> Self {
        Error::UintParseError(value)
    }
}

impl From<std::num::ParseIntError> for Error {
    fn from(value: std::num::ParseIntError) -> Self {
        Error::ParseIntError(value)
    }
}

/// Returned by RainDocument composing process if it failed
#[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "js-api", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
pub enum ComposeError {
    Reject(String),
    Problems(Vec<Problem>),
}

impl std::fmt::Display for ComposeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Problems(v) => write!(f, "{:?}", v),
            Self::Reject(v) => f.write_str(v),
        }
    }
}

impl std::error::Error for ComposeError {}

#[cfg(feature = "js-api")]
impl From<ComposeError> for JsValue {
    fn from(value: ComposeError) -> Self {
        serde_wasm_bindgen::to_value(&value).unwrap_or(JsValue::NULL)
    }
}
