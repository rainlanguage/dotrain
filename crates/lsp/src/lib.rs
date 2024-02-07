//! The Rain language server protocol ([LSP](https://microsoft.github.io/language-server-protocol/)) implementation (language services)
//! written in rust and made available for NodeJs and broswers through [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)
//! in Typescript/Javascript which makes it well suited for editors and IDEs (as it is used in Rainlang vscode and codemirror language extension).
//! This includes all [LSP](https://microsoft.github.io/language-server-protocol/) (language services) related implementation that provide methods
//! and functionalities for getting language server protocol based services for given text document and/or [RainDocument]
//!
//! - Dotrain lsp services are used for vscode and codemirror, see [rainlang-vscode](https://github.com/rainprotocol/rainlang-vscode) and [rainlang-codemirror](https://github.com/rainprotocol/rainlang-codemirror) repositories for more details.
//! - Dotrain vscode extension can be found [here](https://marketplace.visualstudio.com/items?itemName=rainprotocol.rainlang-vscode).

use std::sync::{Arc, RwLock};
use dotrain::{RainDocument, Store, Rebind};
use lsp_types::{
    Hover, Position, Diagnostic, MarkupKind, CompletionItem, TextDocumentItem,
    SemanticTokensPartialResult, Url,
};

#[cfg(feature = "js-api")]
use wasm_bindgen::prelude::*;

pub use dotrain;
pub use lsp_types;
pub use hover::get_hover;
pub use completion::get_completion;
pub use diagnostic::get_diagnostics;
pub use semantic_token::get_semantic_token;

mod hover;
mod completion;
mod diagnostic;
mod semantic_token;

#[cfg(feature = "js-api")]
pub mod js_api;

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
use dotrain_lsp::{
    RainLanguageServices, 
    LanguageServiceParams, 
    dotrain::Store, 
    lsp_types::{TextDocumentItem, MarkupKind, Position, Url}
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
#[cfg_attr(feature = "js-api", wasm_bindgen(skip_typescript))]
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
    pub fn new_rain_document(&self, text_document: &TextDocumentItem, rebinds: Option<Vec<Rebind>>) -> RainDocument {
        RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
        )
    }
    /// Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
    pub async fn new_rain_document_async(&self, text_document: &TextDocumentItem, rebinds: Option<Vec<Rebind>>) -> RainDocument {
        RainDocument::create_async(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
        )
        .await
    }

    /// Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
    pub fn do_validate(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
        rebinds: Option<Vec<Rebind>>
    ) -> Vec<Diagnostic> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
        );
        diagnostic::get_diagnostics(&rain_document, &text_document.uri, related_information)
    }
    /// Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
    pub async fn do_validate_async(
        &self,
        text_document: &TextDocumentItem,
        related_information: bool,
        rebinds: Option<Vec<Rebind>>
    ) -> Vec<Diagnostic> {
        let rain_document = RainDocument::create_async(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
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
        rebinds: Option<Vec<Rebind>>
    ) -> Option<Vec<CompletionItem>> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
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
        rebinds: Option<Vec<Rebind>>
    ) -> Option<Hover> {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
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
        rebinds: Option<Vec<Rebind>>
    ) -> SemanticTokensPartialResult {
        let rain_document = RainDocument::create(
            text_document.text.clone(),
            Some(self.meta_store.clone()),
            None,
            rebinds
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

/// Trait for converting offset to lsp position (implemented for `&str` and `String`)
pub trait PositionAt {
    fn position_at(&self, offset: usize) -> Position;
}

/// Trait for converting lsp position to offset (implemented for `&str` and `String`)
pub trait OffsetAt {
    fn offset_at(&self, position: &Position) -> usize;
}

impl PositionAt for &str {
    fn position_at(&self, offset: usize) -> Position {
        let effective_offset = 0.max(offset.min(self.len()));
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc += v.len();
        });
        let mut low = 0;
        let mut high = line_offsets.len();
        if high == 0 {
            return Position {
                line: 0,
                character: effective_offset as u32,
            };
        }
        while low < high {
            let mid = (low + high) / 2;
            if line_offsets[mid] > effective_offset {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        let line = low - 1;
        Position {
            line: line as u32,
            character: (effective_offset - line_offsets[line]) as u32,
        }
    }
}

impl OffsetAt for &str {
    fn offset_at(&self, position: &Position) -> usize {
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc += v.len();
        });
        if position.line >= line_offsets.len() as u32 {
            return self.len();
        }
        let line_offset = line_offsets[position.line as usize];
        let next_line_offset = if position.line + 1 < line_offsets.len() as u32 {
            line_offsets[position.line as usize + 1]
        } else {
            self.len()
        };
        line_offset.max((line_offset + position.character as usize).min(next_line_offset))
    }
}

impl PositionAt for String {
    fn position_at(&self, offset: usize) -> Position {
        let effective_offset = 0.max(offset.min(self.len()));
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc += v.len();
        });
        let mut low = 0;
        let mut high = line_offsets.len();
        if high == 0 {
            return Position {
                line: 0,
                character: effective_offset as u32,
            };
        }
        while low < high {
            let mid = (low + high) / 2;
            if line_offsets[mid] > effective_offset {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        let line = low - 1;
        Position {
            line: line as u32,
            character: (effective_offset - line_offsets[line]) as u32,
        }
    }
}

impl OffsetAt for String {
    fn offset_at(&self, position: &Position) -> usize {
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc += v.len();
        });
        if position.line >= line_offsets.len() as u32 {
            return self.len();
        }
        let line_offset = line_offsets[position.line as usize];
        let next_line_offset = if position.line + 1 < line_offsets.len() as u32 {
            line_offsets[position.line as usize + 1]
        } else {
            self.len()
        };
        line_offset.max((line_offset + position.character as usize).min(next_line_offset))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_position_at() -> anyhow::Result<()> {
        let text = r"abcd
        efgh
        ijkl";

        let pos1 = text.position_at(14);
        let pos1_expected = Position {
            line: 1,
            character: 9,
        };
        assert_eq!(pos1, pos1_expected);

        let pos2 = text.position_at(28);
        let pos2_expected = Position {
            line: 2,
            character: 10,
        };
        assert_eq!(pos2, pos2_expected);

        Ok(())
    }

    #[test]
    fn test_offset_at() -> anyhow::Result<()> {
        let text = r"abcd
        efgh
        ijkl";

        let offset1 = text.offset_at(&Position {
            line: 1,
            character: 9,
        });
        let expected_offset1 = 14;
        assert_eq!(offset1, expected_offset1);

        let offset2 = text.offset_at(&Position {
            line: 2,
            character: 10,
        });
        let expected_offset2 = 28;
        assert_eq!(offset2, expected_offset2);

        Ok(())
    }
}
