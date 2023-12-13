// use alloy_primitives::U256;
// use js_sys::Uint8Array;
// use rain_meta::{KnownSubgraphs, search};
// use serde_wasm_bindgen::{to_value};
// use types::ast::ConstantBindingItem;
#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;
// use crate::{
//     types::{
//         ast::{Problem, Binding},
//         ExpressionConfig,
//     },
// };
// use crate::parser::rainlang::Rainlang;

pub mod types;
pub mod parser;
pub mod compiler;

#[cfg(feature = "cli")]
pub mod cli;

#[cfg(feature = "lsp")]
pub mod lsp;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
pub mod js_api;

#[cfg(all(feature = "lsp", feature = "js-api"))]
#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_LSP_IMPORTS: &'static str = r#"import { Position, TextDocumentItem } from "vscode-languageserver-types";
import { ClientCapabilities, ServerCapabilities, SemanticTokensPartialResult } from "vscode-languageserver-protocol";
"#;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen(typescript_custom_section)]
const IAUTHORING_META_TYPESCRIPT_DEFINITION: &'static str = r#"export type IAuthoringMeta = {
    word: string,
    description: string,
    operandParserOffset: number,
}[]"#;

#[cfg(any(feature = "js-api", target_family = "wasm"))]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    #[wasm_bindgen(typescript_type = "IRainlang")]
    pub type IRainlang;

    #[wasm_bindgen(typescript_type = "IRainDocument")]
    pub type IRainDocument;

    #[wasm_bindgen(typescript_type = "IAuthoringMeta")]
    pub type IAuthoringMeta;

    #[wasm_bindgen(typescript_type = "Namespace")]
    pub type Namespace;
}

// #[wasm_bindgen(module = "bar")]
// extern "C" {
//     type Bar;

//     #[wasm_bindgen(constructor)]
//     fn new(arg: i32) -> Bar;

//     #[wasm_bindgen(js_namespace = Bar)]
//     fn another_function() -> i32;

//     #[wasm_bindgen(method)]
//     fn get(this: &Bar) -> i32;

//     #[wasm_bindgen(method)]
//     fn set(this: &Bar, val: i32);

//     #[wasm_bindgen(method, getter)]
//     fn property(this: &Bar) -> i32;

//     #[wasm_bindgen(method, setter)]
//     fn set_property(this: &Bar, val: i32);
// }

// #[derive(Clone)]
// #[wasm_bindgen]
// pub struct X {
//     pub(crate) field: String,
// }

// #[wasm_bindgen]
// impl X {
//     #[wasm_bindgen(getter, js_name = "abcdee")]
//     pub fn fielder(&self) -> JsValue {
//         to_value(&ExpressionConfig {
//             bytecode: vec![1, 2],
//             constants: vec![U256::from(1), U256::from(2)],
//         })
//         .unwrap_throw()
//     }
//     #[wasm_bindgen(constructor)]
//     pub fn new(v: String) -> X {
//         // let mut h = HashMap::new();
//         // h.insert(v.clone(), v);
//         X { field: v }
//     }
//     #[wasm_bindgen(method, js_name = "searchAuthoringMeta")]
//     pub async fn search_authoring_meta(deployer_hash: &str) -> Option<Uint8Array> {
//         // let subgraphs = self.0.read().unwrap().subgraphs().clone();
//         // let x = future_to_promise(search_deployer(deployer_hash, &subgraphs))
//         let subgraphs = KnownSubgraphs::NP.iter().map(|v| v.to_string()).collect();
//         match search(deployer_hash, &subgraphs).await {
//             Ok(res) => {
//                 Some(Uint8Array::from(
//                     serde_wasm_bindgen::to_value(&res.bytes).unwrap(),
//                 ))
//                 // Some(res.bytes)
//             }
//             Err(_e) => None,
//         }
//     }
//     #[wasm_bindgen(method, js_name = "me")]
//     pub fn method(v: Option<Vec<String>>) -> Vec<Binding> {
//         // let x: HashMap<String, Vec<u8>> = serde_wasm_bindgen::from_value(v).unwrap_throw();
//         // let f = x.get("sa").unwrap();
//         // log(&format!("{:?}", f));
//         // log(&format!("{:?}", x));
//         // let ser = serde_wasm_bindgen::Serializer::new();
//         // x.serialize(&ser).unwrap()
//         // let z: Binding = from_value(v).unwrap_throw();
//         // log(&format!("{:?}", z));
//         // let e : Vec<Import> = serde_wasm_bindgen::from_value(v).unwrap_throw();
//         // log(&format!("{:?}", e));
//         // let y = Problem {
//         //     msg: "ancd".to_owned(),
//         //     code: ErrorCode::UndefinedMeta,
//         //     position: [1, 2]
//         // };
//         // let z = Problem {
//         //     msg: "ancddddd".to_owned(),
//         //     code: ErrorCode::UndefinedMeta,
//         //     position: [1, 22]
//         // };
//         // let x = Import {
//         //     name: "abcd".to_owned(),
//         //     name_position: [1, 2],
//         //     hash: "abcd".to_owned(),
//         //     hash_position: [1, 2],
//         //     position: [1, 2],
//         //     problems: vec![],
//         //     configuration: Some(ImportConfiguration {
//         //         problems: vec![y, z],
//         //         pairs: vec![(ParsedItem("abcd".to_owned(), [1, 2]), None)]
//         //     }),
//         //     sequence: Some(ImportSequence {
//         //         dispair: None,
//         //         ctxmeta: Some(vec![
//         //             ContextAlias {
//         //                 name: "name".to_owned(),
//         //                 description: "ancddddd".to_owned(),
//         //                 column: 1,
//         //                 row: Some(2)
//         //             },
//         //             ContextAlias {
//         //                 name: "name".to_owned(),
//         //                 description: "ancddddd".to_owned(),
//         //                 column: 1,
//         //                 row: Some(2)
//         //             }
//         //         ]),
//         //         dotrain: None
//         //     })
//         // let q: Vec<u8> = serde_wasm_bindgen::from_value(v).unwrap_throw();
//         log(&format!("{:?}", v));
//         let x = Binding {
//             name: "abcd".to_owned(),
//             name_position: [1, 2],
//             content: "abcd".to_owned(),
//             content_position: [1, 2],
//             position: [1, 2],
//             problems: vec![],
//             dependencies: vec![],
//             item: types::ast::BindingItem::Exp(Rainlang::_new("abcd".to_owned())),
//         };
//         let y = Binding {
//             name: "abcd".to_owned(),
//             name_position: [1, 2],
//             content: "abcd".to_owned(),
//             content_position: [1, 2],
//             position: [1, 2],
//             problems: vec![],
//             dependencies: vec![],
//             item: types::ast::BindingItem::Constant(ConstantBindingItem {
//                 value: "abcd".to_owned(),
//             }),
//         };
//         vec![x, y]
//         // x.into_js().unwrap_throw()
//         // to_value(&x).unwrap_throw()
//         // x.into_js().unwrap_throw()
//     }
//     // #[wasm_bindgen(method, js_name = "meft")]
//     // pub fn mm(v: A) -> i32 {
//     //     // let g = ClientCapabilities {
//     //     //     text_document: Some(default_text_document_client_capabilities()),
//     //     //     workspace: None,
//     //     //     window: None,
//     //     //     general: None,
//     //     //     experimental: None
//     //     // };
//     //     // log(&format!("{:?}", serde_json::to_string(&g)));
//     //     // let qq: CC = serde_wasm_bindgen::from_value(v.obj).unwrap_throw();
//     //     let gg = v.dd();
//     //     // ::from_value(v).unwrap_throw();
//     //     log(&format!("{:?}", gg));
//     //     gg
//     //     // v
//     //     // let q = serde_wasm_bindgen::to_value(&qq).unwrap_throw();
//     //     // q

//     //     // log(&format!("{:?}", q));
//     //     // v
//     // }
// }
