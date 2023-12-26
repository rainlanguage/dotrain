#![doc(
    html_logo_url = "https://raw.githubusercontent.com/rainlanguage/rainlang-vscode/master/docs/images/rain-logo-icon.svg",
    html_favicon_url = "https://raw.githubusercontent.com/rainlanguage/rainlang-vscode/master/docs/images/rain-logo-icon.svg"
)]
//! The Rain language server protocol ([LSP](https://microsoft.github.io/language-server-protocol/)) implementation (language services) and .rain
//! compiler written in rust and made available for NodeJs and broswers through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)
//! in Typescript/Javascript which makes it well suited for editors and IDEs (as it is used in Rainlang vscode and codemirror language extension).
//! - Dotrain specs can be found [here](https://github.com/rainprotocol/specs/blob/main/dotrain.md)
//! - Rainlang specs can be found [here](https://github.com/rainprotocol/specs/blob/main/rainlang.md)
//! - Dotrain has been implemented for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more details.
//! - Dotrain vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).
//!
//! The primary goal of the Rain language is to make smart contract development accessible
//! for as many people as possible. This is fundamentally grounded in our belief that accessibility
//!  is the difference between theoretical and practical decentralisation. There are many people
//! who would like to participate in authoring and auditing crypto code but currently cannot.
//! When someone wants/needs to do something but cannot, then they delegate to someone who can,
//! this is by definition centralisation.
//! Fast and easy queue abstraction.
//!
//! Provides an abstraction over a queue.  When the abstraction is used
//! there are these advantages:
//! - Fast
//! - [`Easy`]
//!
//! [`Easy`]: http://thatwaseasy.example.com

pub mod types;
pub(crate) mod parser;
pub(crate) mod compiler;

#[cfg(feature = "cli")]
pub mod cli;

#[cfg(feature = "lsp")]
pub(crate) mod lsp;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
pub mod js_api;

pub use lsp_types::Url;
pub use rain_meta::Store;
pub use parser::*;
pub use compiler::*;

#[cfg(feature = "lsp")]
pub use lsp::*;
