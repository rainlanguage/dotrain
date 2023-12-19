use wasm_bindgen::prelude::*;
use lsp_types::{TextDocumentItem as TDI, Position as Pos, MarkupKind};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use super::{
    store::MetaStore,
    super::{
        parser::raindocument::RainDocument,
        lsp::{RainLanguageServices, LanguageServiceParams},
    },
};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Position")]
    pub type Position;
    #[wasm_bindgen(typescript_type = "TextDocumentItem")]
    pub type TextDocumentItem;
}

#[wasm_bindgen(typescript_custom_section)]
const RAIN_LANGUAGE_SERVICES_TYPESCRIPT_DEFINITION: &'static str = r#"/**
 * Rain language services ready to receive
 * TextDocuments to provide the desired language services
 */
export class RainLanguageServices {
  free(): void;
  /**
   */
  readonly metaStore: MetaStore;
  /**
   * @param {MetaStore} meta_store
   */
  constructor(meta_store: MetaStore);
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
  doValidate(text_document: TextDocumentItem, related_information: boolean): Diagnostic[];
  /**
   * @param {RainDocument} rain_document
   * @param {boolean} related_information
   * @returns {(Diagnostic)[]}
   */
  doValidateRainDocument(rain_document: RainDocument, related_information: boolean): Diagnostic[];
  /**
   * @param {TextDocumentItem} text_document
   * @param {boolean} related_information
   * @returns {Promise<any>}
   */
  doValidateAsync(text_document: TextDocumentItem): Promise<Diagnostic[]>;
  /**
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @param {MarkupKind} documentation_format
   * @returns {(CompletionItem)[] | undefined}
   */
  doComplete(text_document: TextDocumentItem, position: Position, documentation_format?: MarkupKind): CompletionItem[] | null;
  /**
   * @param {RainDocument} rain_document
   * @param {Position} position
   * @param {MarkupKind} documentation_format
   * @returns {(CompletionItem)[] | undefined}
   */
  doCompleteRainDocument(rain_document: RainDocument, position: Position, documentation_format?: MarkupKind): CompletionItem[] | null;
  /**
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @param {MarkupKind} content_format
   * @returns {Hover | undefined}
   */
  doHover(text_document: TextDocumentItem, position: Position, content_format?: MarkupKind): Hover | null;
  /**
   * @param {RainDocument} rain_document
   * @param {Position} position
   * @param {MarkupKind} content_format
   * @returns {Hover | undefined}
   */
  doHoverRainDocument(rain_document: RainDocument, position: Position, content_format?: MarkupKind): Hover | null;
  /**
   * @param {TextDocumentItem} text_document
   * @param {number} semantic_token_types_index
   * @param {number} semantic_token_modifiers_len
   * @returns {SemanticTokensPartialResult}
   */
  semanticTokens(text_document: TextDocumentItem, semantic_token_types_index: number, semantic_token_modifiers_len: number): SemanticTokensPartialResult;
  /**
   * @param {RainDocument} rain_document
   * @param {number} semantic_token_types_index
   * @param {number} semantic_token_modifiers_len
   * @returns {SemanticTokensPartialResult}
   */
  rainDocumentSemanticTokens(rain_document: RainDocument, semantic_token_types_index: number, semantic_token_modifiers_len: number): SemanticTokensPartialResult;
}"#;

#[wasm_bindgen]
impl RainLanguageServices {
    #[wasm_bindgen(getter, js_name = "metaStore", skip_typescript)]
    pub fn js_meta_store(&self) -> MetaStore {
        MetaStore(self.meta_store.clone())
    }

    #[wasm_bindgen(constructor, skip_typescript)]
    pub fn js_new(meta_store: &MetaStore) -> RainLanguageServices {
        RainLanguageServices::new(&LanguageServiceParams {
            meta_store: Some(meta_store.0.clone()),
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
    pub fn js_do_validate(
        &self,
        text_document: TextDocumentItem,
        related_information: bool,
    ) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(&self.do_validate(&tdi, related_information)).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "doValidateRainDocument", skip_typescript)]
    pub fn js_do_validate_rain_document(
        &self,
        rain_document: &RainDocument,
        related_information: bool,
    ) -> JsValue {
        to_js_value(&self.do_validate_rain_document(rain_document, related_information))
            .unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "doValidateAsync", skip_typescript)]
    pub async fn js_do_validate_async(
        &self,
        text_document: TextDocumentItem,
        related_information: bool,
    ) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(&self.do_validate_async(&tdi, related_information).await)
            .unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "doComplete", skip_typescript)]
    pub fn js_do_complete(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        documentation_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        if let Some(v) = self.do_complete(
            &tdi,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(documentation_format)
                .unwrap_or(None),
        ) {
            to_js_value(&v).unwrap_or(JsValue::NULL)
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doCompleteRainDocument", skip_typescript)]
    pub fn js_do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        documentation_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        if let Some(v) = self.do_complete_rain_document(
            rain_document,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(documentation_format)
                .unwrap_or(None),
        ) {
            to_js_value(&v).unwrap_or(JsValue::NULL)
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doHover", skip_typescript)]
    pub fn js_do_hover(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        content_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        if let Some(h) = self.do_hover(
            &tdi,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(content_format).unwrap_or(None),
        ) {
            to_js_value(&h).unwrap_or(JsValue::NULL)
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "doHoverRainDocument", skip_typescript)]
    pub fn js_do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        content_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        if let Some(h) = self.do_hover_rain_document(
            rain_document,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(content_format).unwrap_or(None),
        ) {
            to_js_value(&h).unwrap_or(JsValue::NULL)
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen(js_name = "semanticTokens", skip_typescript)]
    pub fn js_semantic_tokens(
        &self,
        text_document: TextDocumentItem,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(&self.semantic_tokens(
            &tdi,
            semantic_token_types_index,
            semantic_token_modifiers_len,
        ))
        .unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "rainDocumentSemanticTokens", skip_typescript)]
    pub fn js_rain_document_semantic_tokens(
        &self,
        rain_document: &RainDocument,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> JsValue {
        to_js_value(&self.rain_document_semantic_tokens(
            rain_document,
            semantic_token_types_index,
            semantic_token_modifiers_len,
        ))
        .unwrap_or(JsValue::NULL)
    }
}
