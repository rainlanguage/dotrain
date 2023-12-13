use wasm_bindgen::prelude::*;
use lsp_types::{TextDocumentItem as TDI, Position as Pos};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use super::{
    store::MetaStore,
    super::{
        parser::raindocument::RainDocument,
        lsp::{RainLanguageServices, LanguageServiceParams},
    },
};

#[wasm_bindgen(typescript_custom_section)]
const RAIN_LANGUAGE_SERVICES_TYPESCRIPT_DEFINITION: &'static str = r#"/**
 * Rain language services ready to receive
 * TextDocuments to provide the desired language services
 */
export class RainLanguageServices {
  free(): void;
  /**
   */
  readonly clientCapabilities: ClientCapabilities;
  /**
   */
  readonly metaStore: MetaStore;
  /**
   * @param {ClientCapabilities} client_capabilities
   * @param {MetaStore} meta_store
   */
  constructor(client_capabilities: ClientCapabilities, meta_store: MetaStore);
  /**
   * @param {TextDocumentItem} text_document
   * @returns {RainDocument}
   */
  newRainDocument(text_document: TextDocumentItem): RainDocument;
  /**
   * @param {TextDocumentItem} text_document
   * @returns {Promise<RainDocument>}
   */
  newRainDocumentAsync(text_document: TextDocumentItem): Promise<RainDocument>;
  /**
   * @param {TextDocumentItem} text_document
   * @returns {(Diagnostic)[]}
   */
  doValidate(text_document: TextDocumentItem): Diagnostic[];
  /**
   * @param {RainDocument} rain_document
   * @returns {(Diagnostic)[]}
   */
  doValidateRainDocument(rain_document: RainDocument): Diagnostic[];
  /**
   * @param {TextDocumentItem} text_document
   * @returns {Promise<any>}
   */
  doValidateAsync(text_document: TextDocumentItem): Promise<Diagnostic[]>;
  /**
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @returns {(CompletionItem)[] | undefined}
   */
  doComplete(text_document: TextDocumentItem, position: Position): CompletionItem[] | null;
  /**
   * @param {RainDocument} rain_document
   * @param {Position} position
   * @returns {(CompletionItem)[] | undefined}
   */
  doCompleteRainDocument(rain_document: RainDocument, position: Position): CompletionItem[] | null;
  /**
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @returns {Hover | undefined}
   */
  doHover(text_document: TextDocumentItem, position: Position): Hover | null;
  /**
   * @param {RainDocument} rain_document
   * @param {Position} position
   * @returns {Hover | undefined}
   */
  doHoverRainDocument(rain_document: RainDocument, position: Position): Hover | null;
  /**
   * @param {TextDocumentItem} text_document
   * @returns {SemanticTokensPartialResult}
   */
  semanticTokens(text_document: TextDocumentItem): SemanticTokensPartialResult;
  /**
   * @param {RainDocument} rain_document
   * @returns {SemanticTokensPartialResult}
   */
  rainDocumentSemanticTokens(rain_document: RainDocument): SemanticTokensPartialResult;
}"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "ClientCapabilities")]
    pub type ClientCapabilities;
    #[wasm_bindgen(typescript_type = "ServerCapabilities")]
    pub type ServerCapabilities;
    #[wasm_bindgen(typescript_type = "Position")]
    pub type Position;
    #[wasm_bindgen(typescript_type = "TextDocumentItem")]
    pub type TextDocumentItem;
    #[wasm_bindgen(typescript_type = "SemanticTokensPartialResult")]
    pub type SemanticTokensPartialResult;
}

// #[wasm_bindgen(module = "./z")]
// extern "C" {
//     type A;

//     #[wasm_bindgen(method)]
//     fn dd(arg: i32) -> i32;
// }

// /// Parameters for initiating Language Services
// #[derive(Debug, Clone, Tsify, Serialize, Deserialize)]
// #[tsify(into_wasm_abi, from_wasm_abi)]
// pub struct LanguageServiceParamsJs {
//     /// Describes the LSP capabilities the client supports.
//     pub client_capabilities: CC,
//     /// Object that keeps cache of metas
//     pub meta_store: Option<MetaStore>,
// }

#[wasm_bindgen]
impl RainLanguageServices {
    #[wasm_bindgen(getter, js_name = "metaStore", skip_typescript)]
    pub fn js_meta_store(&self) -> MetaStore {
        MetaStore(self.meta_store.clone())
    }
    #[wasm_bindgen(getter, js_name = "clientCapabilities", skip_typescript)]
    pub fn js_capabilities(&self) -> ClientCapabilities {
        ClientCapabilities {
            obj: to_js_value(&self.capabilities).unwrap_throw(),
        }
    }
    #[wasm_bindgen(constructor, skip_typescript)]
    pub fn js_new(
        client_capabilities: ClientCapabilities,
        meta_store: &MetaStore,
    ) -> RainLanguageServices {
        RainLanguageServices::new(&LanguageServiceParams {
            meta_store: Some(meta_store.0.clone()),
            client_capabilities: from_js_value(client_capabilities.obj).unwrap_throw(),
        })
    }

    #[wasm_bindgen(js_name = "newRainDocument", skip_typescript)]
    pub fn js_new_rain_document(&self, text_document: TextDocumentItem) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document(&tdi)
    }

    #[wasm_bindgen(js_name = "newRainDocumentAsync", skip_typescript)]
    pub async fn js_new_rain_document_async(
        &self,
        text_document: TextDocumentItem,
    ) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document_async(&tdi).await
    }

    #[wasm_bindgen(js_name = "doValidate", skip_typescript)]
    pub fn js_do_validate(&self, text_document: TextDocumentItem) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        // self.do_validate(&tdi).iter().map(|d| Diagnostic {
        //     obj: to_js_value(d).unwrap_throw()
        //     // .map_err(|_| JsValue::NULL)
        // }).collect()
        to_js_value(&self.do_validate(&tdi)).unwrap_throw()
    }

    #[wasm_bindgen(js_name = "doValidateRainDocument", skip_typescript)]
    pub fn js_do_validate_rain_document(&self, rain_document: &RainDocument) -> JsValue {
        // self.do_validate_rain_document(rain_document).iter().map(|d| Diagnostic {
        //     obj: to_js_value(d).unwrap_throw()
        //     // .map_err(|_| JsValue::NULL)
        // }).collect()
        to_js_value(&self.do_validate_rain_document(rain_document)).unwrap_throw()
    }

    #[wasm_bindgen(js_name = "doValidateAsync", skip_typescript)]
    pub async fn js_do_validate_async(&self, text_document: TextDocumentItem) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        let x = self.do_validate_async(&tdi).await;
        // Ok()
        // let y = x.iter().map(|d| Diagnostic {
        //     obj: to_js_value(d).unwrap_throw()
        //     // .map_err(|_| JsValue::NULL)
        // }).collect();
        // let x = future_to_promise(self.do_validate_async(&tdi));
        // let w = Promise::resolve(&to_js_value(&x).unwrap_throw());
        // Ok(vec![Diagnostic{obj: to_js_value(&x).unwrap_throw()}])
        // Diagnostic {obj: to_js_value(&x[0]).unwrap_throw()}
        // let mut q = vec![];
        // for d in &x {
        //     q.push(Diagnostic {obj: to_js_value(d).unwrap_throw() })
        // }
        to_js_value(&x).unwrap_throw()
    }

    #[wasm_bindgen(js_name = "doComplete", skip_typescript)]
    pub fn js_do_complete(&self, text_document: TextDocumentItem, position: Position) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        if let Some(v) = self.do_complete(&tdi, pos) {
            to_js_value(&v).unwrap_throw()
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doCompleteRainDocument", skip_typescript)]
    pub fn js_do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        if let Some(v) = self.do_complete_rain_document(rain_document, pos) {
            to_js_value(&v).unwrap_throw()
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doHover", skip_typescript)]
    pub fn js_do_hover(&self, text_document: TextDocumentItem, position: Position) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        if let Some(h) = self.do_hover(&tdi, pos) {
            to_js_value(&h).unwrap_throw()
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doHoverRainDocument", skip_typescript)]
    pub fn js_do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        if let Some(h) = self.do_hover_rain_document(rain_document, pos) {
            to_js_value(&h).unwrap_throw()
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "semanticTokens", skip_typescript)]
    pub fn js_semantic_tokens(&self, text_document: TextDocumentItem) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(&self.semantic_tokens(&tdi)).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "rainDocumentSemanticTokens", skip_typescript)]
    pub fn js_rain_document_semantic_tokens(&self, rain_document: &RainDocument) -> JsValue {
        to_js_value(&self.rain_document_semantic_tokens(rain_document)).unwrap_or(JsValue::NULL)
    }
}
