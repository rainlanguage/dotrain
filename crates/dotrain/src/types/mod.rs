//! All data types of RainDocument/RainlangDocument parse tree and RegExp patterns used in parsing process

pub mod ast;
pub mod patterns;

#[cfg(feature = "js-api")]
mod impls;
