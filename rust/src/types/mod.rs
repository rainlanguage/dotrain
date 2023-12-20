// #![allow(non_snake_case)]

use serde_repr::{Serialize_repr, Deserialize_repr};
use serde::{Serialize, Deserialize, Serializer, Deserializer};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use tsify::Tsify;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

pub mod ast;
pub mod patterns;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
mod impls;

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
    type Error = anyhow::Error;
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        Ok(serde_json::from_str::<ErrorCode>(&value.to_string())
            .or(Err(anyhow::anyhow!("unknown error code")))?)
    }
}

/// Type of valid parsed expression, consumable for deploying the expression
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    any(feature = "js-api", target_family = "wasm"),
    derive(Tsify),
    tsify(into_wasm_abi, from_wasm_abi)
)]
pub struct ExpressionConfig {
    /// Bytecode verbatim.
    #[serde(
        serialize_with = "serialize_bytecode",
        deserialize_with = "deserialize_bytecode"
    )]
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "string")
    )]
    pub bytecode: Vec<u8>,
    /// Constants verbatim.
    #[cfg_attr(
        any(feature = "js-api", target_family = "wasm"),
        tsify(type = "string[]")
    )]
    pub constants: Vec<alloy_primitives::U256>,
}

fn serialize_bytecode<S: Serializer>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error> {
    let hex_string = alloy_primitives::hex::encode_prefixed(bytes);
    serializer.serialize_str(&hex_string)
}

fn deserialize_bytecode<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Vec<u8>, D::Error> {
    struct ExpConfVisitor;
    impl<'de> serde::de::Visitor<'de> for ExpConfVisitor {
        type Value = Vec<u8>;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a hex string or bytes")
        }

        fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<Self::Value, E> {
            alloy_primitives::hex::decode(value).map_err(serde::de::Error::custom)
        }
        fn visit_borrowed_str<E: serde::de::Error>(
            self,
            value: &'de str,
        ) -> Result<Self::Value, E> {
            alloy_primitives::hex::decode(value).map_err(serde::de::Error::custom)
        }
        fn visit_string<E: serde::de::Error>(self, value: String) -> Result<Self::Value, E> {
            alloy_primitives::hex::decode(value).map_err(serde::de::Error::custom)
        }

        fn visit_bytes<E: serde::de::Error>(self, value: &[u8]) -> Result<Self::Value, E> {
            Ok(value.to_vec())
        }
        fn visit_borrowed_bytes<E: serde::de::Error>(
            self,
            value: &'de [u8],
        ) -> Result<Self::Value, E> {
            Ok(value.to_vec())
        }
        fn visit_byte_buf<E: serde::de::Error>(self, value: Vec<u8>) -> Result<Self::Value, E> {
            Ok(value)
        }
    }
    deserializer.deserialize_any(ExpConfVisitor)
}
