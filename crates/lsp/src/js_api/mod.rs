use wasm_bindgen::prelude::*;
use lsp_types::{MarkupKind as MK, Position as Pos, TextDocumentItem as TDI, Url};
use serde_wasm_bindgen::{to_value as to_js_value, from_value as from_js_value};
use dotrain::{js_api::MetaStore, RainDocument, Rebind};
use super::{RainLanguageServices, LanguageServiceParams};

#[wasm_bindgen]
extern "C" {
    /// A wrapped JsValue representing typescript LSP Position interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::Position] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "Position")]
    pub type Position;
    /// A wrapped JsValue representing typescript LSP TextDocumentItem interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::TextDocumentItem] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "TextDocumentItem")]
    pub type TextDocumentItem;
    /// A wrapped JsValue representing typescript LSP MarkupKind interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::MarkupKind] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "MarkupKind")]
    pub type MarkupKind;
    /// A wrapped JsValue representing typescript LSP Diagnostic interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::Diagnostic] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "Diagnostic")]
    pub type Diagnostic;
    /// A wrapped JsValue representing typescript LSP Hover interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::Hover] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "Hover")]
    pub type Hover;
    /// A wrapped JsValue representing typescript LSP CompletionItem interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::CompletionItem] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "CompletionItem")]
    pub type CompletionItem;
    /// A wrapped JsValue representing typescript LSP SemanticTokensPartialResult interface in rust,
    /// it can be deserialized to rust [mod@lsp_types::SemanticTokensPartialResult] using `serde-wasm-bindgen`
    #[wasm_bindgen(typescript_type = "SemanticTokensPartialResult")]
    pub type SemanticTokensPartialResult;
}

#[wasm_bindgen(typescript_custom_section)]
const LSP_TS_IMPORTS: &'static str = r#"
import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import { Hover, Position, MarkupKind, Diagnostic, CompletionItem, TextDocumentItem } from "vscode-languageserver-types";
"#;

#[wasm_bindgen]
impl RainLanguageServices {
    /// The meta Store associated with this RainLanguageServices instance
    #[wasm_bindgen(getter, js_name = "metaStore")]
    pub fn js_meta_store(&self) -> MetaStore {
        self.meta_store.clone().into()
    }

    /// Instantiates with the given MetaStore
    #[wasm_bindgen(constructor)]
    pub fn js_new(meta_store: &MetaStore) -> RainLanguageServices {
        RainLanguageServices::new(&LanguageServiceParams {
            meta_store: Some(meta_store.into()),
        })
    }

    /// Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
    #[wasm_bindgen(js_name = "newRainDocument")]
    pub fn js_new_rain_document(
        &self,
        text_document: TextDocumentItem,
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document(&tdi, rebinds)
    }

    /// Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
    #[wasm_bindgen(js_name = "newRainDocumentAsync")]
    pub async fn js_new_rain_document_async(
        &self,
        text_document: TextDocumentItem,
        rebinds: Option<Vec<Rebind>>,
    ) -> RainDocument {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.new_rain_document_async(&tdi, rebinds).await
    }

    /// Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
    #[wasm_bindgen(js_name = "doValidate")]
    pub fn js_do_validate(
        &self,
        text_document: TextDocumentItem,
        related_information: bool,
        rebinds: Option<Vec<Rebind>>,
    ) -> Vec<Diagnostic> {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.do_validate(&tdi, related_information, rebinds)
            .iter()
            .map(|v| Diagnostic {
                obj: to_js_value(v).unwrap_or(JsValue::NULL),
            })
            .collect()
    }

    /// Reports LSP diagnostics from RainDocument's all problems
    #[wasm_bindgen(js_name = "doValidateRainDocument")]
    pub fn js_do_validate_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &str,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        self.do_validate_rain_document(
            rain_document,
            &Url::parse(uri).unwrap_throw(),
            related_information,
        )
        .iter()
        .map(|v| Diagnostic {
            obj: to_js_value(v).unwrap_or(JsValue::NULL),
        })
        .collect()
    }

    /// Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
    #[wasm_bindgen(js_name = "doValidateAsync")]
    pub async fn js_do_validate_async(
        &self,
        text_document: TextDocumentItem,
        related_information: bool,
        rebinds: Option<Vec<Rebind>>,
    ) -> JsValue {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        to_js_value(
            &self
                .do_validate_async(&tdi, related_information, rebinds)
                .await,
        )
        .unwrap_or(JsValue::NULL)
    }

    /// Provides completion items at the given position
    #[wasm_bindgen(js_name = "doComplete")]
    pub fn js_do_complete(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        documentation_format: Option<MarkupKind>,
        rebinds: Option<Vec<Rebind>>,
    ) -> Option<Vec<CompletionItem>> {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.do_complete(
            &tdi,
            pos,
            documentation_format.and_then(|v| from_js_value::<MK>(v.obj).ok()),
            rebinds,
        )
        .map(|c| {
            c.iter()
                .map(|v| CompletionItem {
                    obj: to_js_value(v).unwrap_or(JsValue::NULL),
                })
                .collect()
        })
    }

    /// Provides completion items at the given position
    #[wasm_bindgen(js_name = "doCompleteRainDocument")]
    pub fn js_do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &str,
        position: Position,
        documentation_format: Option<MarkupKind>,
    ) -> Option<Vec<CompletionItem>> {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        self.do_complete_rain_document(
            rain_document,
            &Url::parse(uri).unwrap_throw(),
            pos,
            documentation_format.and_then(|v| from_js_value::<MK>(v.obj).ok()),
        )
        .map(|c| {
            c.iter()
                .map(|v| CompletionItem {
                    obj: to_js_value(v).unwrap_or(JsValue::NULL),
                })
                .collect()
        })
    }

    /// Provides hover for a fragment at the given position
    #[wasm_bindgen(js_name = "doHover")]
    pub fn js_do_hover(
        &self,
        text_document: TextDocumentItem,
        position: Position,
        content_format: Option<MarkupKind>,
        rebinds: Option<Vec<Rebind>>,
    ) -> Option<Hover> {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        self.do_hover(
            &tdi,
            pos,
            content_format.and_then(|v| from_js_value::<MK>(v.obj).ok()),
            rebinds,
        )
        .map(|v| Hover {
            obj: to_js_value(&v).unwrap_or(JsValue::NULL),
        })
    }

    /// Provides hover for a RainDocument fragment at the given position
    #[wasm_bindgen(js_name = "doHoverRainDocument")]
    pub fn js_do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        content_format: Option<MarkupKind>,
    ) -> Option<Hover> {
        let pos = from_js_value::<Pos>(position.obj).unwrap_throw();
        self.do_hover_rain_document(
            rain_document,
            pos,
            content_format.and_then(|v| from_js_value::<MK>(v.obj).ok()),
        )
        .map(|v| Hover {
            obj: to_js_value(&v).unwrap_or(JsValue::NULL),
        })
    }

    /// Provides semantic tokens for elided fragments
    #[wasm_bindgen(js_name = "semanticTokens")]
    pub fn js_semantic_tokens(
        &self,
        text_document: TextDocumentItem,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
        rebinds: Option<Vec<Rebind>>,
    ) -> SemanticTokensPartialResult {
        let tdi = from_js_value::<TDI>(text_document.obj).unwrap_throw();
        SemanticTokensPartialResult {
            obj: to_js_value(&self.semantic_tokens(
                &tdi,
                semantic_token_types_index,
                semantic_token_modifiers_len,
                rebinds,
            ))
            .unwrap_or(JsValue::NULL),
        }
    }

    /// Provides semantic tokens for RainDocument's elided fragments
    #[wasm_bindgen(js_name = "rainDocumentSemanticTokens")]
    pub fn js_rain_document_semantic_tokens(
        &self,
        rain_document: &RainDocument,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> SemanticTokensPartialResult {
        SemanticTokensPartialResult {
            obj: to_js_value(&self.rain_document_semantic_tokens(
                rain_document,
                semantic_token_types_index,
                semantic_token_modifiers_len,
            ))
            .unwrap_or(JsValue::NULL),
        }
    }
}
