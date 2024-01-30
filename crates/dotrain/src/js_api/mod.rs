//! Wrappers around main structs and functionalities to provide javascript/typescript API through
//! [mod@wasm_bindgen], enabled by `js-api` feature
//!
//! All structs, implementation blocks, etc are just wrappers around what already is in the main
//! library, for the sole purpose of providing an easy, typed and native Javascript/Typescript API
//! for generated wasm bindings

use wasm_bindgen::prelude::*;

mod store;
mod raindocument;

pub use self::store::*;

#[wasm_bindgen]
extern "C" {
    /// js console.log()
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

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
}

#[wasm_bindgen(typescript_custom_section)]
const IAUTHORING_META_TS_INTERFACE: &'static str = r#"export type IAuthoringMeta = {
    word: string,
    description: string,
    operandParserOffset: number,
}[]"#;

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
