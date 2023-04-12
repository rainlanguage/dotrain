import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import {
    Range, Position, DocumentUri, MarkupContent, MarkupKind,
    Color, ColorInformation, ColorPresentation,
    FoldingRange, FoldingRangeKind, SelectionRange,
    Diagnostic, DiagnosticSeverity,
    CompletionItem, CompletionItemKind, CompletionList, CompletionItemTag,
    InsertTextFormat,
    SymbolInformation, SymbolKind, DocumentSymbol, Location, Hover, MarkedString, 
    FormattingOptions, DefinitionLink,
    CodeActionContext, Command, CodeAction,
    DocumentHighlight, DocumentLink, WorkspaceEdit,
    TextEdit, CodeActionKind,
    TextDocumentEdit, VersionedTextDocumentIdentifier, DocumentHighlightKind
} from "vscode-languageserver-types";

export {
    TextDocument,
    TextDocumentContentChangeEvent,
    Range, Position, DocumentUri, MarkupContent, MarkupKind,
    Color, ColorInformation, ColorPresentation,
    FoldingRange, FoldingRangeKind, SelectionRange,
    Diagnostic, DiagnosticSeverity,
    CompletionItem, CompletionItemKind, CompletionList, CompletionItemTag,
    InsertTextFormat, FormattingOptions, DefinitionLink,
    SymbolInformation, SymbolKind, DocumentSymbol, Location, Hover, MarkedString,
    CodeActionContext, Command, CodeAction,
    DocumentHighlight, DocumentLink, WorkspaceEdit,
    TextEdit, CodeActionKind,
    TextDocumentEdit, VersionedTextDocumentIdentifier, DocumentHighlightKind
};

/**
 * @public
 * Error codes used by diagnostics
 */
export enum ErrorCode {
    UndefinedOpMeta = 0,
    UndefinedWord = 1,
    NonASCIICharacter = 2,
    NonPrintableASCIICharacter = 3,

    InvalidWordPattern = 0x101,
    InvalidExpression = 0x102,
    InvalidInputsMeta = 0x103,
    InvalidOutputsMeta = 0x104,
    InvalidNestedNode = 0x105,
    InvalidSelfReferenceLHS = 0x106,

    UnexpectedEndOfComment = 0x201,
    UnexpectedClosingParen = 0x202,
    UnexpectedRHSComment = 0x203,

    ExpectedOpcode = 0x301,
    ExpectedSpace = 0x302,
    ExpectedOperandArgs = 0x303,
    ExpectedClosingParen = 0x304,
    ExpectedOpeningParen = 0x305,
    ExpectedOpeningOperandArgBracket = 0x306,
    ExpectedClosingOperandArgBracket = 0x307,

    MismatchRHS = 0x401,
    MismatchLHS = 0x402,
    MismatchOperandArgs = 0x403,

    OutOfRangeInputs = 0x501,
    OutOfRangeOperandArgs = 0x502,
    OutOfRangeValue = 0x503,

    UnknownOp = 0x600,

    RuntimeError = 0x700
}

//export const RainErrors

/**
 * @public
 * Parameters for initiating Language Services
 */
export interface LanguageServiceParams {
    /**
     * Describes the LSP capabilities the client supports.
     */
    clientCapabilities?: ClientCapabilities;
}

/**
 * @public
 * Describes what LSP capabilities the client supports
 */
export interface ClientCapabilities {
    /**
     * The text document client capabilities
     */
    textDocument?: {
        /**
         * Capabilities specific to the `textDocument/publishDiagnostics` notification.
         */
        publishDiagnostics?: {
            /**
             * Whether the clients accepts diagnostics with related information.
             */
            relatedInformation?: boolean;
        };
        /**
         * Capabilities specific to completions.
         */
        completion?: {
            /**
             * The client supports the following `CompletionItem` specific
             * capabilities.
             */
            completionItem?: {
                /**
                 * Client supports the follow content formats for the documentation
                 * property. The order describes the preferred format of the client.
                 */
                documentationFormat?: MarkupKind[];
            };
        };
        /**
         * Capabilities specific to hovers.
         */
        hover?: {
            /**
             * Client supports the follow content formats for the content
             * property. The order describes the preferred format of the client.
             */
            contentFormat?: MarkupKind[];
        };
    };
}

/**
 * @public
 * Predefined latest client capabilities
 */
export namespace ClientCapabilities {
    export const ALL: ClientCapabilities = {
        textDocument: {
            publishDiagnostics: {
                relatedInformation: true
            },
            completion: {
                completionItem: {
                    documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText]
                }
            },
            hover: {
                contentFormat: [MarkupKind.Markdown, MarkupKind.PlainText]
            }
        }
    };
}

/**
 * @public How a completion was triggered
 */
export enum CompletionTriggerKind {
    /**
     * Completion was triggered by typing an identifier (24x7 code
     * complete), manual invocation (e.g Ctrl+Space) or via API.
     */
    Invoked = 1,
    /**
     * Completion was triggered by a trigger character specified by
     * the `triggerCharacters` properties of the `CompletionRegistrationOptions`.
     */
    TriggerCharacter = 2,
    /**
     * Completion was re-triggered as current completion list is incomplete
     */
    TriggerForIncompleteCompletions = 3,
}
