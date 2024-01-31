use wasm_bindgen::prelude::*;
use lsp_types::{TextDocumentItem as TDI, Position as Pos, MarkupKind, Url};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use dotrain::{RainDocument, js_api::MetaStore};
use super::{RainLanguageServices, LanguageServiceParams};

#[wasm_bindgen]
extern "C" {
    /// A wrapped JsValue representing typescript LSP Position interface in rust,
    /// it can be deserialized to rust `lsp_types` Position using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "Position")]
    pub type Position;
    /// A wrapped JsValue representing typescript LSP Position interface in rust,
    /// it can be deserialized to rust `lsp_types` TextDocumentItem using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "TextDocumentItem")]
    pub type TextDocumentItem;
}

#[wasm_bindgen(typescript_custom_section)]
const LSP_TS_IMPORTS: &'static str = r#"
import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import { Hover, Position, MarkupKind, Diagnostic, CompletionItem, TextDocumentItem } from "vscode-languageserver-types";
"#;

#[wasm_bindgen(typescript_custom_section)]
const RAIN_LANGUAGE_SERVICES_TYPESCRIPT_DEFINITION: &'static str = r#"/**
 * Provides LSP services which are methods that return LSP based results (Diagnostics, Hover, etc)
 *
 * Provides methods for getting language services (such as diagnostics, completion, etc)
 * for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked
 * MetaStore instance that holds all the required metadata/functionalities that are required during 
 * parsing a text.
 *
 * Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
 * only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
 * position encodings will result in the same LSP provided Position value which is 1 for each char.
 * 
 * @example
 * ```javascript
 * // create new MetaStore instance
 * let metaStore = new MetaStore();
 *
 * // crate new instance
 * let langServices = new RainLanguageServices(metaStore);
 *
 * let textDocument = {
 *   text: "some .rain text",
 *   uri:  "file:///name.rain",
 *   version: 0,
 *   languageId: "rainlang"
 * };
 *
 * // creat new RainDocument
 * let rainDocument = langServices.newRainDocument(textdocument);
 * 
 * // get LSP Diagnostics
 * let diagnosticsRelatedInformation = true;
 * let diagnostics = langServices.doValidate(textDocument, diagnosticsRelatedInformation);
 * ```
 */
export class RainLanguageServices {
  free(): void;
  /**
   * The meta Store associated with this RainLanguageServices instance
   */
  readonly metaStore: MetaStore;
  /**
   * Instantiates with the given MetaStore
   * @param {MetaStore} meta_store
   */
  constructor(meta_store: MetaStore);
  /**
   * Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
   * @param {TextDocumentItem} text_document
   * @returns {RainDocument}
   */
  newRainDocument(text_document: TextDocumentItem): RainDocument;
  /**
   * Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
   * @param {TextDocumentItem} text_document
   * @returns {Promise<RainDocument>}
   */
  newRainDocumentAsync(text_document: TextDocumentItem): Promise<RainDocument>;
  /**
   * Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
   * @param {TextDocumentItem} text_document
   * @returns {(Diagnostic)[]}
   */
  doValidate(text_document: TextDocumentItem, related_information: boolean): Diagnostic[];
  /**
   * Reports LSP diagnostics from RainDocument's all problems
   * @param {RainDocument} rain_document
   * @param {string} uri
   * @param {boolean} related_information
   * @returns {(Diagnostic)[]}
   */
  doValidateRainDocument(rain_document: RainDocument, uri: string, related_information: boolean): Diagnostic[];
  /**
   * Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
   * @param {TextDocumentItem} text_document
   * @param {boolean} related_information
   * @returns {Promise<any>}
   */
  doValidateAsync(text_document: TextDocumentItem, related_information: boolean): Promise<Diagnostic[]>;
  /**
   * Provides completion items at the given position
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @param {MarkupKind} documentation_format
   * @returns {(CompletionItem)[] | undefined}
   */
  doComplete(
    text_document: TextDocumentItem, 
    position: Position, 
    documentation_format?: MarkupKind
  ): CompletionItem[] | null;
  /**
   * Provides completion items at the given position
   * @param {RainDocument} rain_document
   * @param {string} uri
   * @param {Position} position
   * @param {MarkupKind} documentation_format
   * @returns {(CompletionItem)[] | undefined}
   */
  doCompleteRainDocument(
    rain_document: RainDocument, 
    uri: string,
    position: Position, 
    documentation_format?: MarkupKind
  ): CompletionItem[] | null;
  /**
   * Provides hover for a fragment at the given position
   * @param {TextDocumentItem} text_document
   * @param {Position} position
   * @param {MarkupKind} content_format
   * @returns {Hover | undefined}
   */
  doHover(
    text_document: TextDocumentItem, 
    position: Position, 
    content_format?: MarkupKind
  ): Hover | null;
  /**
   * Provides hover for a RainDocument fragment at the given position
   * @param {RainDocument} rain_document
   * @param {Position} position
   * @param {MarkupKind} content_format
   * @returns {Hover | undefined}
   */
  doHoverRainDocument(
    rain_document: RainDocument, 
    position: Position, 
    content_format?: MarkupKind
  ): Hover | null;
  /**
   * Provides semantic tokens for elided fragments
   * @param {TextDocumentItem} text_document
   * @param {number} semantic_token_types_index
   * @param {number} semantic_token_modifiers_len
   * @returns {SemanticTokensPartialResult}
   */
  semanticTokens(
    text_document: TextDocumentItem, 
    semantic_token_types_index: number, 
    semantic_token_modifiers_len: number
  ): SemanticTokensPartialResult;
  /**
   * Provides semantic tokens for RainDocument's elided fragments
   * @param {RainDocument} rain_document
   * @param {number} semantic_token_types_index
   * @param {number} semantic_token_modifiers_len
   * @returns {SemanticTokensPartialResult}
   */
  rainDocumentSemanticTokens(
    rain_document: RainDocument, 
    semantic_token_types_index: number, 
    semantic_token_modifiers_len: number
  ): SemanticTokensPartialResult;
}"#;

#[wasm_bindgen]
impl RainLanguageServices {
    /// The meta Store associated with this RainLanguageServices instance
    #[wasm_bindgen(getter, js_name = "metaStore", skip_typescript)]
    pub fn js_meta_store(&self) -> MetaStore {
        self.meta_store.clone().into()
    }

    /// Instantiates with the given MetaStore
    #[wasm_bindgen(constructor, skip_typescript)]
    pub fn js_new(meta_store: &MetaStore) -> RainLanguageServices {
        RainLanguageServices::new(&LanguageServiceParams {
            meta_store: Some(meta_store.into()),
        })
    }

    /// Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
    #[wasm_bindgen(js_name = "newRainDocument", skip_typescript)]
    pub fn js_new_rain_document(&self, text_document: TextDocumentItem) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document(&tdi)
    }

    /// Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
    #[wasm_bindgen(js_name = "newRainDocumentAsync", skip_typescript)]
    pub async fn js_new_rain_document_async(
        &self,
        text_document: TextDocumentItem,
    ) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document_async(&tdi).await
    }

    /// Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
    #[wasm_bindgen(js_name = "doValidate", skip_typescript)]
    pub fn js_do_validate(
        &self,
        text_document: TextDocumentItem,
        related_information: bool,
    ) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(&self.do_validate(&tdi, related_information)).unwrap_or(JsValue::NULL)
    }

    /// Reports LSP diagnostics from RainDocument's all problems
    #[wasm_bindgen(js_name = "doValidateRainDocument", skip_typescript)]
    pub fn js_do_validate_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &str,
        related_information: bool,
    ) -> JsValue {
        to_js_value(&self.do_validate_rain_document(
            rain_document,
            &Url::parse(uri).unwrap_throw(),
            related_information,
        ))
        .unwrap_or(JsValue::NULL)
    }

    /// Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
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

    /// Provides completion items at the given position
    #[wasm_bindgen(js_name = "doComplete", skip_typescript)]
    pub fn js_do_complete(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        documentation_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.do_complete(
            &tdi,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(documentation_format)
                .unwrap_or(None),
        )
        .map_or(JsValue::NULL, |v| to_js_value(&v).unwrap_or(JsValue::NULL))
    }

    /// Provides completion items at the given position
    #[wasm_bindgen(js_name = "doCompleteRainDocument", skip_typescript)]
    pub fn js_do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &str,
        position: Position,
        documentation_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        self.do_complete_rain_document(
            rain_document,
            &Url::parse(uri).unwrap_throw(),
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(documentation_format)
                .unwrap_or(None),
        )
        .map_or(JsValue::NULL, |v| to_js_value(&v).unwrap_or(JsValue::NULL))
    }

    /// Provides hover for a fragment at the given position
    #[wasm_bindgen(js_name = "doHover", skip_typescript)]
    pub fn js_do_hover(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        content_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.do_hover(
            &tdi,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(content_format).unwrap_or(None),
        )
        .map_or(JsValue::NULL, |v| to_js_value(&v).unwrap_or(JsValue::NULL))
    }

    /// Provides hover for a RainDocument fragment at the given position
    #[wasm_bindgen(js_name = "doHoverRainDocument", skip_typescript)]
    pub fn js_do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        content_format: JsValue,
    ) -> JsValue {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        self.do_hover_rain_document(
            rain_document,
            pos,
            serde_wasm_bindgen::from_value::<Option<MarkupKind>>(content_format).unwrap_or(None),
        )
        .map_or(JsValue::NULL, |v| to_js_value(&v).unwrap_or(JsValue::NULL))
    }

    /// Provides semantic tokens for elided fragments
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

    /// Provides semantic tokens for RainDocument's elided fragments
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
