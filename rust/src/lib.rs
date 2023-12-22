#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

pub mod types;
pub mod parser;
pub mod compiler;

#[cfg(feature = "cli")]
pub mod cli;

#[cfg(feature = "lsp")]
pub mod lsp;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
pub mod js_api;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    #[wasm_bindgen(typescript_type = "IRainlangDocument")]
    pub type IRainlangDocument;

    #[wasm_bindgen(typescript_type = "IRainDocument")]
    pub type IRainDocument;

    #[wasm_bindgen(typescript_type = "IAuthoringMeta")]
    pub type IAuthoringMeta;

    #[wasm_bindgen(typescript_type = "Namespace")]
    pub type Namespace;

    #[wasm_bindgen(typescript_type = "INPE2Deployer")]
    pub type INPE2Deployer;

    #[wasm_bindgen(typescript_type = "DeployerQueryResponse")]
    pub type DeployerQueryResponse;
}

#[cfg(all(feature = "lsp", any(feature = "js-api", target_family = "wasm")))]
#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_LSP_IMPORTS: &'static str = r#"
import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import { Hover, Position, MarkupKind, Diagnostic, TextDocumentItem, CompletionItem } from "vscode-languageserver-types";
"#;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen(typescript_custom_section)]
const IAUTHORING_META_TYPESCRIPT_DEFINITION: &'static str = r#"export type IAuthoringMeta = {
    word: string,
    description: string,
    operandParserOffset: number,
}[]"#;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen(typescript_custom_section)]
const INPE2_DEPLOYER_TYPESCRIPT_DEFINITION: &'static str = r#"export interface INPE2Deployer {
    metaHash: string,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array,
    authoringMeta: IAuthoringMeta | undefined
}"#;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen(typescript_custom_section)]
const DEPLOYER_QUERY_RESPONSE_TYPESCRIPT_DEFINITION: &'static str = r#"export interface DeployerQueryResponse {
    txHash: string,
    bytecodeMetaHash: string,
    metaHash: string,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array
}"#;
