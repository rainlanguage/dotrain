import { TextDocument, TextDocumentContentChangeEvent } from 'vscode-languageserver-textdocument';
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
} from 'vscode-languageserver-types';

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
    InvalidWordPattern = 2,
    InvalidExpression = 3,
    InvalidInputsMeta = 4,
    InvalidOutputsMeta = 5,
    InvalidNestedNode = 6,
    InvalidSelfRef = 7,

    UnexpectedEndOfComment = 0x101,
    UnexpectedEndOfOperandArgs = 0x102,
    UnexpectedCloseParen = 0x103,
    UnexpectedRHSComment = 0x104,

    OpcodeExpected = 0x201,
    SpaceExpected = 0x202,
    OperandArgsExpected = 0x203,
    ClosingParenExpected = 0x204,
    OpeningParenExpected = 0x205,
    BracketsExpected = 0x206,

    MismatchRHS = 0x301,
    MismatchLHS = 0x302,
    MismatchOperandArgs = 0x303,
    MismatchInputs = 0x304,
    MismatchOutputs = 0x305,

    OORInputs = 0x401,
    OOROperandArgs = 0x402,
    OORValue = 0x403,

    UnknownOp = 0x500,
}

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
    export const LATEST: ClientCapabilities = {
        textDocument: {
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
