use rain_meta::Store;
use std::sync::{Arc, RwLock};
use self::sematic_token::get_semantic_token;
use super::parser::raindocument::RainDocument;
use lsp_types::{
    Hover, Position, Diagnostic, MarkupKind, CompletionItem, TextDocumentItem,
    SemanticTokensPartialResult,
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

pub mod hover;
pub mod completion;
pub mod diagnostic;
pub mod sematic_token;

/// Parameters for initiating Language Services
#[derive(Debug, Clone)]
pub struct LanguageServiceParams {
    /// The meta Store (CAS) instance used for all parsings of the RainLanguageServices
    pub meta_store: Option<Arc<RwLock<Store>>>,
}

/// # RainLanguageServices
///
/// Provides methods for getting language service results (such as diagnostics, completion, etc)
/// for a give LSP TextDocumentItem or a RainDocument
///
/// Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
/// only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
/// position encodings will result in the same LSP provided Position value which is 1 for each char
#[cfg_attr(
    all(feature = "lsp", any(feature = "js-api", target_family = "wasm")),
    wasm_bindgen
)]
pub struct RainLanguageServices {
    /// The meta Store (CAS) instance used for all parsings of this instance
    pub(crate) meta_store: Arc<RwLock<Store>>,
}

impl Default for RainLanguageServices {
    fn default() -> Self {
        let meta_store = Arc::new(RwLock::new(Store::default()));
        RainLanguageServices { meta_store }
    }
}

impl RainLanguageServices {
    /// The meta Store associated with this RainLanguageServices instance
    pub fn meta_store(&self) -> Arc<RwLock<Store>> {
        self.meta_store.clone()
    }
    /// Instantiates from the given params
    pub fn new(language_params: &LanguageServiceParams) -> RainLanguageServices {
        let meta_store = if let Some(s) = &language_params.meta_store {
            s.clone()
        } else {
            Arc::new(RwLock::new(Store::default()))
        };
        RainLanguageServices { meta_store }
    }

    /// Instantiates a RainDocument with remote meta search disabled from the given TextDocumentItem
    pub fn new_rain_document(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
    }
    /// Instantiates a RainDocument with remote meta search enabled from the given TextDocumentItem
    pub async fn new_rain_document_async(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create_async(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
        .await
    }

    /// Validates the document with remote meta search disabled and reports LSP diagnostics
    pub fn do_validate(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        diagnostic::get_diagnostics(&rd, related_information)
    }
    /// reports LSP diagnostics from RainDocument's all problems
    pub fn do_validate_rain_document(
        &self,
        rain_document: &RainDocument,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        diagnostic::get_diagnostics(rain_document, related_information)
    }
    /// Validates the document with remote meta search enabled and reports LSP diagnostics
    pub async fn do_validate_async(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        let rd = RainDocument::create_async(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
        .await;
        diagnostic::get_diagnostics(&rd, related_information)
    }

    /// Provides completion items
    pub fn do_complete(
        &self,
        text_document: &TextDocumentItem,
        position: Position,
        documentation_format: Option<MarkupKind>,
    ) -> Option<Vec<CompletionItem>> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        completion::get_completion(
            &rd,
            position,
            if let Some(df) = documentation_format {
                df
            } else {
                MarkupKind::PlainText
            },
        )
    }
    /// Provides completion items
    pub fn do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        documentation_format: Option<MarkupKind>,
    ) -> Option<Vec<CompletionItem>> {
        completion::get_completion(
            rain_document,
            position,
            if let Some(df) = documentation_format {
                df
            } else {
                MarkupKind::PlainText
            },
        )
    }

    /// Provides hover for fragments
    pub fn do_hover(
        &self,
        text_document: &TextDocumentItem,
        position: Position,
        content_format: Option<MarkupKind>,
    ) -> Option<Hover> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        hover::get_hover(
            &rd,
            position,
            if let Some(cf) = content_format {
                cf
            } else {
                MarkupKind::PlainText
            },
        )
    }
    /// Provides hover for RainDocument fragments
    pub fn do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        content_format: Option<MarkupKind>,
    ) -> Option<Hover> {
        hover::get_hover(
            rain_document,
            position,
            if let Some(cf) = content_format {
                cf
            } else {
                MarkupKind::PlainText
            },
        )
    }

    /// Provides semantic tokens for elided fragments
    pub fn semantic_tokens(
        &self,
        text_document: &TextDocumentItem,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> SemanticTokensPartialResult {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        get_semantic_token(
            &rd,
            semantic_token_types_index,
            semantic_token_modifiers_len,
        )
    }
    /// Provides semantic tokens for RainDocument's elided fragments
    pub fn rain_document_semantic_tokens(
        &self,
        rain_document: &RainDocument,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> SemanticTokensPartialResult {
        get_semantic_token(
            rain_document,
            semantic_token_types_index,
            semantic_token_modifiers_len,
        )
    }
}
