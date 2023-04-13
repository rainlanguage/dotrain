/* eslint-disable max-len */
import { RainDocument } from "./parser/rainParser";
import { getRainHover } from "./services/rainHover";
import { getRainCompletion } from "./services/rainCompletion";
import { RainDocumentResult } from "./parser/rainParserTypes";
import { getRainDiagnostics } from "./services/rainDiagnostics";
import {
    Hover, 
    Position, 
    Diagnostic, 
    TextDocument, 
    CompletionItem, 
    LanguageServiceParams 
} from "./rainLanguageTypes";


/**
 * @public
 * Interface for Rain language services
 */
export interface LanguageService {
    rainDocuments: Map<string, RainDocument>;
	newRainDocument(textDocument: TextDocument, opmeta: Uint8Array | string): RainDocument;
    parseRainDocument(textDocument: TextDocument, opmeta?: Uint8Array | string): RainDocumentResult;
    doValidation(textDocument: TextDocument, opmeta?: Uint8Array | string, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
	doComplete(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string, setting?: LanguageServiceParams): CompletionItem[] | null;
    doHover(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string, setting?: LanguageServiceParams): Hover | null;
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

    const rainDocuments: Map<string, RainDocument> = new Map();

    return {
        rainDocuments,
        newRainDocument: (textDocument, opmeta) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument, opmeta);
            return _rainDoc;
        },
        parseRainDocument: (textDocument, opmeta) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument, opmeta);
            return _rainDoc.getResult();
        },
        doValidation: (textDocument, opmeta) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument, opmeta);
            return getRainDiagnostics(_rainDoc, params);
        },
        doComplete: (textDocument, position, opmeta) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument, opmeta);
            return getRainCompletion(_rainDoc, position, params);
        },
        doHover: (textDocument, position, opmeta) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, new RainDocument(textDocument, opmeta ?? ""));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument, opmeta);
            return getRainHover(_rainDoc, position, params);
        },
        // doResolve: rainCompletion.doResolve.bind(rainCompletion),
    };
}
