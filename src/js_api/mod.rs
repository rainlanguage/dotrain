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
    metaHash: Uint8Array,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array,
    authoringMeta: IAuthoringMeta | undefined
}"#;

#[wasm_bindgen(typescript_custom_section)]
const DEPLOYER_QUERY_RESPONSE_TS_INTERFACE: &'static str = r#"export interface DeployerQueryResponse {
    txHash: Uint8Array,
    bytecodeMetaHash: Uint8Array,
    metaHash: Uint8Array,
    metaBytes: Uint8Array,
    bytecode: Uint8Array,
    parser: Uint8Array,
    store: Uint8Array,
    interpreter: Uint8Array
}"#;

/// Calculates solidity keccak256 hash from the given data
#[wasm_bindgen]
pub fn keccak256(data: &[u8]) -> Vec<u8> {
    alloy_primitives::keccak256(data).0.to_vec()
}

/// Checks equality of 2 Uint8Arrays
#[wasm_bindgen(js_name = "eqBytes")]
pub fn eq_bytes(data1: &[u8], data2: &[u8]) -> bool {
    data1 == data2
}

/// Converts a hex string to Uint8Array
#[wasm_bindgen]
pub fn arrayify(hex: &str) -> Vec<u8> {
    alloy_primitives::hex::decode(hex).unwrap_throw()
}

/// Converts an Uint8Array into a hex string
#[wasm_bindgen]
pub fn hexlify(data: &[u8]) -> String {
    alloy_primitives::hex::encode_prefixed(data)
}

/// Calculates kccak256 hash of a DeployerBytecodeMeta constructed from the given deployedBytecode underlying data
#[wasm_bindgen(js_name = "getDeployedBytecodeMetaHash")]
pub fn get_deployed_bytecode_meta_hash(deployed_bytecode: &[u8]) -> Vec<u8> {
    rain_meta::RainMetaDocumentV1Item {
        payload: serde_bytes::ByteBuf::from(deployed_bytecode),
        magic: rain_meta::KnownMagic::ExpressionDeployerV2BytecodeV1,
        content_type: rain_meta::ContentType::OctetStream,
        content_encoding: rain_meta::ContentEncoding::None,
        content_language: rain_meta::ContentLanguage::None,
    }
    .hash(false)
    .unwrap_throw()
    .to_vec()
}
