use rain_meta::Store;
use std::sync::{Arc, RwLock};
use super::parser::raindocument::RainDocument;
use lsp_types::{
    Hover, Position, Diagnostic, MarkupKind, CompletionItem, TextDocumentItem,
    SemanticTokensPartialResult, Url,
};

#[cfg(any(feature = "js-api", target_family = "wasm"))]
use wasm_bindgen::prelude::*;

pub use lsp_types;
pub use hover::get_hover;
pub use completion::get_completion;
pub use diagnostic::get_diagnostics;
pub use semantic_token::get_semantic_token;

mod hover;
mod completion;
mod diagnostic;
mod semantic_token;

/// Parameters for initiating Language Services
#[derive(Debug, Clone)]
pub struct LanguageServiceParams {
    /// The meta Store (CAS) instance used for all parsings of the RainLanguageServices
    pub meta_store: Option<Arc<RwLock<Store>>>,
}

#[cfg_attr(
    not(target_family = "wasm"),
    doc = r#"Provides methods for getting language services (such as diagnostics, completion, etc)
for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked
[Store] instance `Arc<RwLock<Store>>` that holds all the required metadata/functionalities that 
are required during parsing a text.

Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
position encodings will result in the same LSP provided Position value which is 1 for each char.

## Example

```rust
use std::sync::{Arc, RwLock};
use dotrain::{
    RainLanguageServices, LanguageServiceParams, Url, Store, 
    lsp_types::{TextDocumentItem, MarkupKind, Position}
};

// instaniate a shared locked Store
let meta_store = Arc::new(RwLock::new(Store::default()));

// create instatiation params
let params = LanguageServiceParams {
    meta_store: Some(meta_store)
};

// create a new instane with a shared locked Store that is used for all
// parsings that are triggered through available methods of this instance
let lang_services = RainLanguageServices::new(&params);

let text_document = TextDocumentItem {
    uri: Url::parse("file:///example.rain").unwrap(),
    text: "some .rain text content".to_string(),
    version: 0,
    language_id: "rainlang".to_string()
};

// create a new RainDocument instance
let rain_document = lang_services.new_rain_document(&text_document);

// get LSP Diagnostics for a given TextDocumentItem
let diagnostics_related_information = true;
let diagnostics = lang_services.do_validate(&text_document, diagnostics_related_information);

let position = Position {
    line: 0,
    character: 10
};
let content_format = Some(MarkupKind::PlainText);
let hover = lang_services.do_hover(&text_document, position, content_format);
```
"#
)]
#[cfg_attr(
    target_family = "wasm",
    doc = " Provides methods for getting language services (such as diagnostics, completion, etc)
 for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked
 MetaStore instance that holds all the required metadata/functionalities that are required during 
 parsing a text.

 Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
 only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
 position encodings will result in the same LSP provided Position value which is 1 for each char.
 
 @example
 ```javascript
 // create new MetaStore instance
 let metaStore = new MetaStore();

 // crate new instance
 let langServices = new RainLanguageServices(metaStore);

 let textDocument = {
    text: \"some .rain text\",
    uri:  \"file:///name.rain\",
    version: 0,
    languageId: \"rainlang\"
 };

 // creat new RainDocument
 let rainDocument = langServices.newRainDocument(textdocument);

 // get LSP Diagnostics
 let diagnosticsRelatedInformation = true;
 let diagnostics = langServices.doValidate(textDocument, diagnosticsRelatedInformation);
 ```
"
)]
#[cfg_attr(
    all(feature = "lsp", any(feature = "js-api", target_family = "wasm")),
    wasm_bindgen(skip_typescript)
)]
pub struct RainLanguageServices {
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
        RainLanguageServices {
            meta_store: language_params
                .meta_store
                .as_ref()
                .map_or(Arc::new(RwLock::new(Store::default())), |s| s.clone()),
        }
    }

    /// Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
    pub fn new_rain_document(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        )
    }
    /// Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
    pub async fn new_rain_document_async(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create_async(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        )
        .await
    }

    /// Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
    pub fn do_validate(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        );
        diagnostic::get_diagnostics(&rain_document, &text_document.uri, related_information)
    }
    /// Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
    pub async fn do_validate_async(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        let rain_document = RainDocument::create_async(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        )
        .await;
        diagnostic::get_diagnostics(&rain_document, &text_document.uri, related_information)
    }
    /// Reports LSP diagnostics from RainDocument's all problems
    pub fn do_validate_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &Url,
        related_information: bool,
    ) -> Vec<Diagnostic> {
        diagnostic::get_diagnostics(rain_document, uri, related_information)
    }

    /// Provides completion items at the given position
    pub fn do_complete(
        &self,
        text_document: &TextDocumentItem,
        position: Position,
        documentation_format: Option<MarkupKind>,
    ) -> Option<Vec<CompletionItem>> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        );
        completion::get_completion(
            &rain_document,
            &text_document.uri,
            position,
            documentation_format.unwrap_or(MarkupKind::PlainText),
        )
    }
    /// Provides completion items at the given position
    pub fn do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        uri: &Url,
        position: Position,
        documentation_format: Option<MarkupKind>,
    ) -> Option<Vec<CompletionItem>> {
        completion::get_completion(
            rain_document,
            uri,
            position,
            documentation_format.unwrap_or(MarkupKind::PlainText),
        )
    }

    /// Provides hover for a fragment at the given position
    pub fn do_hover(
        &self,
        text_document: &TextDocumentItem,
        position: Position,
        content_format: Option<MarkupKind>,
    ) -> Option<Hover> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        );
        hover::get_hover(
            &rain_document,
            position,
            content_format.unwrap_or(MarkupKind::PlainText),
        )
    }
    /// Provides hover for a RainDocument fragment at the given position
    pub fn do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
        content_format: Option<MarkupKind>,
    ) -> Option<Hover> {
        hover::get_hover(
            rain_document,
            position,
            content_format.unwrap_or(MarkupKind::PlainText),
        )
    }

    /// Provides semantic tokens for elided fragments
    pub fn semantic_tokens(
        &self,
        text_document: &TextDocumentItem,
        semantic_token_types_index: u32,
        semantic_token_modifiers_len: usize,
    ) -> SemanticTokensPartialResult {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
        );
        get_semantic_token(
            &rain_document,
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
