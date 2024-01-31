#![doc(
    html_logo_url = "https://raw.githubusercontent.com/rainlanguage/rainlang-vscode/master/docs/images/rain-logo-icon.svg",
    html_favicon_url = "https://raw.githubusercontent.com/rainlanguage/rainlang-vscode/master/docs/images/rain-logo-icon.svg"
)]
//! .rain to rainlang composer written in rust and made available for NodeJs and broswers through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)
//! in Typescript/Javascript.
//! - Dotrain specs can be found [here](https://github.com/rainprotocol/specs/blob/main/dotrain.md)
//! - Rainlang specs can be found [here](https://github.com/rainprotocol/specs/blob/main/rainlang.md)
//!
//! The primary goal of the Rain language is to make smart contract development accessible
//! for as many people as possible. This is fundamentally grounded in our belief that accessibility
//! is the difference between theoretical and practical decentralisation. There are many people
//! who would like to participate in authoring and auditing crypto code but currently cannot.
//! When someone wants/needs to do something but cannot, then they delegate to someone who can,
//! this is by definition centralisation.
//! Fast and easy queue abstraction.
//!
//! ## Features
//!
//! Includes 3 features:
//! - `cli`  A [mod@clap] based module (CLI app) for functionalities of this library, this features is required for building/installing the **binary**
//! - `js-api`  includes wrappers around main structs and functionalities to provide an API through [mod@wasm_bindgen]

pub mod types;
pub mod error;
pub(crate) mod parser;
pub(crate) mod composer;

#[cfg(feature = "cli")]
pub mod cli;

#[cfg(feature = "js-api")]
pub mod js_api;

pub use rain_metadata::Store;
pub use parser::*;
/// Provides all types and functionalities of Rain metadata
pub use rain_metadata;
