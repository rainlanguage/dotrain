//! Wrappers around main structs and functionalities to provide javascript/typescript API through 
//! [mod@wasm_bindgen], enabled by `js-api` feature
//!
//! All structs, implementation blocks, etc are just wrappers around what already is in the main
//! library, for the sole purpose of providing an easy, typed and native Javascript/Typescript API
//! for generated wasm bindings

use wasm_bindgen::prelude::*;

mod store;
mod rainlang;
mod raindocument;

#[cfg(feature = "lsp")]
pub(crate) mod lsp;

pub use lsp::*;
pub use self::store::*;

#[wasm_bindgen]
extern "C" {
    /// js console.log()
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    /// A wrapped JsValue representing typescript RainlangDocument interface in rust,
    #[wasm_bindgen(typescript_type = "IRainlangDocument")]
    pub type IRainlangDocument;

    /// A wrapped JsValue representing typescript RainDocument interface in rust,
    #[wasm_bindgen(typescript_type = "IRainDocument")]
    pub type IRainDocument;

    /// A wrapped JsValue representing typescript AuthoringMeta interface in rust,
    /// it can be deserialized to rust AuthoringMeta using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "IAuthoringMeta")]
    pub type IAuthoringMeta;

    /// A wrapped JsValue representing typescript Namespace type in rust,
    /// it can be deserialized to rust Namespace using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "Namespace")]
    pub type Namespace;

    /// A wrapped JsValue representing typescript NPE2Deployer interface in rust,
    /// it can be deserialized to rust INPE2Deployer using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "INPE2Deployer")]
    pub type INPE2Deployer;

    /// A wrapped JsValue representing typescript DeployerQueryResponse interface in rust,
    /// it can be deserialized to rust DeployerQueryResponse using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "DeployerQueryResponse")]
    pub type DeployerQueryResponse;
}

#[wasm_bindgen(typescript_custom_section)]
const IAUTHORING_META_TS_INTERFACE: &'static str = r#"export type IAuthoringMeta = {
    word: string,
    description: string,
    operandParserOffset: number,
}[]"#;

#[wasm_bindgen(typescript_custom_section)]
const INPE2_DEPLOYER_TS_INTERFACE: &'static str = r#"export interface INPE2Deployer {
    metaHash: string,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array,
    authoringMeta: IAuthoringMeta | undefined
}"#;

#[wasm_bindgen(typescript_custom_section)]
const DEPLOYER_QUERY_RESPONSE_TS_INTERFACE: &'static str = r#"export interface DeployerQueryResponse {
    txHash: string,
    bytecodeMetaHash: string,
    metaHash: string,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array
}"#;
