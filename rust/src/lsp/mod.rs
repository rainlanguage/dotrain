use rain_meta::Store;
use std::sync::{Arc, RwLock};
use self::sematic_token::get_semantic_token;
use super::parser::raindocument::RainDocument;
use lsp_types::{
    Hover, Position, Diagnostic, MarkupKind, CompletionItem, TextDocumentItem, ClientCapabilities,
    HoverClientCapabilities, CompletionItemCapability, CompletionClientCapabilities,
    DiagnosticClientCapabilities, TextDocumentClientCapabilities,
    PublishDiagnosticsClientCapabilities, SemanticTokensClientCapabilities,
    SemanticTokensClientCapabilitiesRequests, SemanticTokenType, SemanticTokenModifier,
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
    /// Describes the LSP capabilities the client supports.
    pub client_capabilities: ClientCapabilities,
    /// Object that keeps cache of metas
    pub meta_store: Option<Arc<RwLock<Store>>>,
}

/// Rain language services ready to receive
/// TextDocuments to provide the desired language services
#[cfg_attr(
    all(feature = "lsp", any(feature = "js-api", target_family = "wasm")),
    wasm_bindgen
)]
// #[wasm_bindgen]
pub struct RainLanguageServices {
    pub(crate) meta_store: Arc<RwLock<Store>>,
    pub(crate) capabilities: ClientCapabilities,
}

impl Default for RainLanguageServices {
    fn default() -> Self {
        let meta_store = Arc::new(RwLock::new(Store::default()));
        RainLanguageServices {
            meta_store,
            capabilities: ClientCapabilities {
                text_document: Some(default_text_document_client_capabilities()),
                workspace: None,
                window: None,
                general: None,
                experimental: None,
            },
        }
    }
}

impl RainLanguageServices {
    pub fn meta_store(&self) -> Arc<RwLock<Store>> {
        self.meta_store.clone()
    }
    pub fn capabilities(&self) -> &ClientCapabilities {
        &self.capabilities
    }
    pub fn new(language_params: &LanguageServiceParams) -> RainLanguageServices {
        let meta_store = if let Some(s) = &language_params.meta_store {
            s.clone()
        } else {
            Arc::new(RwLock::new(Store::default()))
        };
        RainLanguageServices {
            meta_store,
            capabilities: language_params.client_capabilities.clone(),
        }
    }

    pub fn new_rain_document(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
    }
    pub async fn new_rain_document_async(&self, text_document: &TextDocumentItem) -> RainDocument {
        RainDocument::create_async(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
        .await
    }

    pub fn do_validate(&self, text_document: &TextDocumentItem) -> Vec<Diagnostic> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        diagnostic::get_diagnostics(&rd, true)
    }
    pub fn do_validate_rain_document(&self, rain_document: &RainDocument) -> Vec<Diagnostic> {
        diagnostic::get_diagnostics(rain_document, true)
    }
    pub async fn do_validate_async(&self, text_document: &TextDocumentItem) -> Vec<Diagnostic> {
        let rd = RainDocument::create_async(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        )
        .await;
        diagnostic::get_diagnostics(&rd, true)
    }

    pub fn do_complete(
        &self,
        text_document: &TextDocumentItem,
        position: Position,
    ) -> Option<Vec<CompletionItem>> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        let documentation_format =
            if let Some(supported) = completion_documentation_format(&self.capabilities) {
                if let Some(first) = supported.first() {
                    first.clone()
                } else {
                    MarkupKind::PlainText
                }
            } else {
                MarkupKind::PlainText
            };
        completion::get_completion(&rd, position, documentation_format)
    }
    pub fn do_complete_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
    ) -> Option<Vec<CompletionItem>> {
        let documentation_format =
            if let Some(supported) = completion_documentation_format(&self.capabilities) {
                if let Some(first) = supported.first() {
                    first.clone()
                } else {
                    MarkupKind::PlainText
                }
            } else {
                MarkupKind::PlainText
            };
        completion::get_completion(rain_document, position, documentation_format)
    }
    // pub async fn do_complete_async(
    //     &self,
    //     text_document: &TextDocumentItem,
    //     position: Position,
    // ) -> Option<Vec<CompletionItem>> {
    //     let rd = RainDocument::create_async(
    //         text_document.text.clone(),
    //         text_document.uri.clone(),
    //         Some(self.meta_store.clone()),
    //     )
    //     .await;
    //     let documentation_format =
    //         if let Some(supported) = completion_documentation_format(&self.capabilities) {
    //             if let Some(first) = supported.first() {
    //                 first.clone()
    //             } else {
    //                 MarkupKind::PlainText
    //             }
    //         } else {
    //             MarkupKind::PlainText
    //         };
    //     completion::get_completion(&rd, position, documentation_format)
    // }

    pub fn do_hover(&self, text_document: &TextDocumentItem, position: Position) -> Option<Hover> {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        let content_format = if let Some(supported) = hover_content_format(&self.capabilities) {
            if let Some(first) = supported.first() {
                first.clone()
            } else {
                MarkupKind::PlainText
            }
        } else {
            MarkupKind::PlainText
        };
        hover::get_hover(&rd, position, content_format)
    }
    pub fn do_hover_rain_document(
        &self,
        rain_document: &RainDocument,
        position: Position,
    ) -> Option<Hover> {
        let content_format = if let Some(supported) = hover_content_format(&self.capabilities) {
            if let Some(first) = supported.first() {
                first.clone()
            } else {
                MarkupKind::PlainText
            }
        } else {
            MarkupKind::PlainText
        };
        hover::get_hover(rain_document, position, content_format)
    }
    // pub async fn do_hover_async(
    //     &self,
    //     text_document: &TextDocumentItem,
    //     position: Position,
    // ) -> Option<Hover> {
    //     let rd = RainDocument::create_async(
    //         text_document.text.clone(),
    //         text_document.uri.clone(),
    //         Some(self.meta_store.clone()),
    //     )
    //     .await;
    //     let content_format = if let Some(supported) = hover_content_format(&self.capabilities) {
    //         if let Some(first) = supported.first() {
    //             first.clone()
    //         } else {
    //             MarkupKind::PlainText
    //         }
    //     } else {
    //         MarkupKind::PlainText
    //     };
    //     hover::get_hover(&rd, position, content_format)
    // }

    pub fn semantic_tokens(&self, text_document: &TextDocumentItem) -> SemanticTokensPartialResult {
        let rd = RainDocument::create(
            text_document.text.clone(),
            text_document.uri.clone(),
            Some(self.meta_store.clone()),
        );
        get_semantic_token(&rd, semantic_token_modifiers_len(&self.capabilities))
    }
    pub fn rain_document_semantic_tokens(
        &self,
        rain_document: &RainDocument,
    ) -> SemanticTokensPartialResult {
        get_semantic_token(
            rain_document,
            semantic_token_modifiers_len(&self.capabilities),
        )
    }
}

// /**
//  * @public
//  * Interface for Rain language services
//  */
// export interface RainLanguageServices {
//     metaStore: Meta.Store;
//     newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
//     doValidate(textDocument: TextDocument): Promise<Diagnostic[]>;
//     doValidate(rainDocument: RainDocument): Promise<Diagnostic[]>;
//     doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
//     doHover(rainDocument: RainDocument, position: Position): Promise<Hover | null>;
//     doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
//     doComplete(rainDocument: RainDocument, position: Position): Promise<CompletionItem[] | null>;

// }

// /**
// * @public
// *
// *
// *
// * @example
// * ```ts
// * // importing
// * import { getRainLanguageServices } from "@rainprotocol/rainlang";
// *
// * // initiating the services
// * const langServices = getRainLanguageServices({clientCapabilities, metastore});
// *
// * // getting validation results (lsp Diagnostics)
// * const errors = await langServices.doValidate(myTextDocument);
// * ```
// */
// export function getRainLanguageServices(params: LanguageServiceParams = {}): RainLanguageServices {

//     if (!params.metaStore) params.metaStore = new Meta.Store();
//     const metaStore = params.metaStore;

//     return {
//         metaStore,
//         newRainDocument: async(textDocument) => {
//             return await RainDocument.create(textDocument, metaStore);
//         },
//         doValidate: async(document) => {
//             return getDiagnostics(document as any, params);
//         },
//         doComplete: async(document, position) => {
//             return getCompletion(document as any, position, params);
//         },
//         doHover: async(document, position) => {
//             return getHover(document as any, position, params);
//         }
//     };
// }

pub fn completion_documentation_format(
    client_capabilities: &ClientCapabilities,
) -> &Option<Vec<MarkupKind>> {
    if let Some(td_capabilities) = &client_capabilities.text_document {
        if let Some(completion) = &td_capabilities.completion {
            if let Some(completion_item) = &completion.completion_item {
                return &completion_item.documentation_format;
            }
        }
    }
    &None
}
pub fn hover_content_format(client_capabilities: &ClientCapabilities) -> &Option<Vec<MarkupKind>> {
    if let Some(td_capabilities) = &client_capabilities.text_document {
        if let Some(hover) = &td_capabilities.hover {
            return &hover.content_format;
        }
    }
    &None
}
pub fn related_document_support(client_capabilities: &ClientCapabilities) -> bool {
    if let Some(td_capabilities) = &client_capabilities.text_document {
        if let Some(diagnostic) = &td_capabilities.diagnostic {
            if diagnostic.related_document_support.is_some() {
                return diagnostic.related_document_support.unwrap();
            } else {
                return false;
            }
        }
    }
    false
}
pub fn has_publish_diagnostics_related_information(
    client_capabilities: &ClientCapabilities,
) -> bool {
    if let Some(td_capabilities) = &client_capabilities.text_document {
        if let Some(publish_diagnostics) = &td_capabilities.publish_diagnostics {
            if publish_diagnostics.related_information.is_some() {
                return publish_diagnostics.related_information.unwrap();
            } else {
                return false;
            }
        }
    }
    false
}

pub fn semantic_token_modifiers_len(client_capabilities: &ClientCapabilities) -> usize {
    if let Some(td_capabilities) = &client_capabilities.text_document {
        if let Some(sematic_tokens) = &td_capabilities.semantic_tokens {
            return sematic_tokens.token_modifiers.len();
        }
    }
    0
}

pub fn default_text_document_client_capabilities() -> TextDocumentClientCapabilities {
    TextDocumentClientCapabilities {
        diagnostic: Some(DiagnosticClientCapabilities {
            related_document_support: Some(true),
            dynamic_registration: None,
        }),
        publish_diagnostics: Some(PublishDiagnosticsClientCapabilities {
            related_information: Some(true),
            tag_support: None,
            version_support: None,
            code_description_support: None,
            data_support: None,
        }),
        completion: Some(CompletionClientCapabilities {
            completion_item: Some(CompletionItemCapability {
                documentation_format: Some(vec![MarkupKind::Markdown, MarkupKind::PlainText]),
                snippet_support: None,
                commit_characters_support: None,
                deprecated_support: None,
                preselect_support: None,
                tag_support: None,
                insert_replace_support: None,
                resolve_support: None,
                insert_text_mode_support: None,
                label_details_support: None,
            }),
            completion_list: None,
            completion_item_kind: None,
            dynamic_registration: None,
            context_support: None,
            insert_text_mode: None,
        }),
        hover: Some(HoverClientCapabilities {
            content_format: Some(vec![MarkupKind::Markdown, MarkupKind::PlainText]),
            dynamic_registration: None,
        }),
        semantic_tokens: Some(SemanticTokensClientCapabilities {
            dynamic_registration: None,
            requests: SemanticTokensClientCapabilitiesRequests {
                range: None,
                full: Some(lsp_types::SemanticTokensFullOptions::Bool(true)),
            },
            token_types: vec![
                SemanticTokenType::KEYWORD,
                SemanticTokenType::CLASS,
                SemanticTokenType::INTERFACE,
                SemanticTokenType::ENUM,
                SemanticTokenType::FUNCTION,
                SemanticTokenType::VARIABLE,
            ],
            token_modifiers: vec![
                SemanticTokenModifier::DECLARATION,
                SemanticTokenModifier::READONLY,
            ],
            formats: vec![],
            overlapping_token_support: None,
            multiline_token_support: None,
            server_cancel_support: None,
            augments_syntax_tokens: None,
        }),
        synchronization: None,
        signature_help: None,
        references: None,
        document_highlight: None,
        document_symbol: None,
        formatting: None,
        range_formatting: None,
        on_type_formatting: None,
        declaration: None,
        definition: None,
        type_definition: None,
        implementation: None,
        code_action: None,
        code_lens: None,
        document_link: None,
        color_provider: None,
        rename: None,
        folding_range: None,
        selection_range: None,
        linked_editing_range: None,
        call_hierarchy: None,
        moniker: None,
        type_hierarchy: None,
        inlay_hint: None,
        inline_value: None,
    }
}
