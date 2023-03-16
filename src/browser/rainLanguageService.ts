/* eslint-disable max-len */
import { RainHover } from './services/rainHover';
import { RainDocument } from './parser/rainParser';
import { RainDiagnostics } from './services/rainValidation';
import { RainCompletion } from './services/rainCompletion';
import { RainDocumentResult } from '../shared/parser/rainParserTypes';
import {
    LanguageServiceParams,
    TextDocument,
    Position, 
    CompletionItem, 
    Hover, 
    Diagnostic
} from '../shared/rainLanguageTypes';

/**
 * @public
 * Interface for Rain language services
 */
export interface LanguageService {
    rainDocuments: Map<string, RainDocument>;
	newRainDocument(textDocument: TextDocument, opmeta: Uint8Array | string): RainDocument;
    parseRainDocument(textDocument: TextDocument, opmeta?: Uint8Array | string): RainDocumentResult;
    doValidation(textDocument: TextDocument, opmeta?: Uint8Array | string): Promise<Diagnostic[]>;
	doComplete(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string): CompletionItem[] | null;
    doHover(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string): Hover | null;
    // doResolve(item: CompletionItem): Promise<CompletionItem>;
}

/**
 * @public
 * Main function to get Rain language services initiated and ready to recieve TextDocuments to provide the desired language services
 * 
 * @example
 * ```ts
 * // importing
 * import { getLanguageService } from "@rainprotocol/rainlang";
 * 
 * // initiating the services
 * const langServices = getLanguageService(clientCapabilities);
 * 
 * // getting validation results (lsp Diagnostics)
 * const errors = await langServices.doValidate(myDocument, opmeta);
 * ```
 */
export function getLanguageService(params?: LanguageServiceParams): LanguageService {

    const rainHover = new RainHover(params);
    const rainCompletion = new RainCompletion(params);
    const rainDiagnostics = new RainDiagnostics(params);
    const rainDocuments: Map<string, RainDocument> = new Map();

    return {
        rainDocuments,
        newRainDocument: (textDocument, opmeta) => {
            const _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta));
            }
            else _rainDoc.update(textDocument, opmeta);
            return rainDocuments.get(textDocument.uri)!;
        },
        parseRainDocument: (textDocument, opmeta) => {
            const _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
            }
            else _rainDoc.update(textDocument, opmeta);
            return rainDocuments.get(textDocument.uri)!.getResult();
        },
        doValidation: (textDocument, opmeta) => {
            const _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
            }
            else _rainDoc.update(textDocument, opmeta);
            return rainDiagnostics.doValidation(rainDocuments.get(textDocument.uri)!);
        },
        doComplete: (textDocument, position, opmeta) => {
            const _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
            }
            else _rainDoc.update(textDocument, opmeta);
            return rainCompletion.doComplete(rainDocuments.get(textDocument.uri)!, position);
        },
        doHover: (textDocument, position, opmeta) => {
            const _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
            }
            else _rainDoc.update(textDocument, opmeta);
            return rainHover.doHover(rainDocuments.get(textDocument.uri)!, position);
        },
        // doResolve: rainCompletion.doResolve.bind(rainCompletion),
    };
}
