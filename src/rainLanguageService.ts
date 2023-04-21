import { OpMetaStore } from "./parser/opMetaStore";
import { getRainHover } from "./services/rainHover";
import { RainDocument } from "./parser/rainDocument";
import { getRainCompletion } from "./services/rainCompletion";
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
	newRainDocument(textDocument: TextDocument, opMetaStore?: OpMetaStore): Promise<RainDocument>;
    doValidation(textDocument: TextDocument): Promise<Diagnostic[]>;
	doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
    doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
    // doResolve(item: CompletionItem): Promise<CompletionItem>;
}

/**
 * @public
 * Main function to get Rain language services initiated and ready to recieve 
 * TextDocuments to provide the desired language services
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
    const store = params?.opMetaStore ? params.opMetaStore : new OpMetaStore();

    return {
        rainDocuments,
        newRainDocument: async(textDocument, opMetaStore) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                if (opMetaStore) store.updateStore(opMetaStore);
                rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument);
            return _rainDoc;
        },
        doValidation: async(textDocument) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument);
            return getRainDiagnostics(_rainDoc, params);
        },
        doComplete: async(textDocument, position) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument);
            return getRainCompletion(_rainDoc, position, params);
        },
        doHover: async(textDocument, position) => {
            let _rainDoc = rainDocuments.get(textDocument.uri);
            if (!_rainDoc) {
                rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
                _rainDoc = rainDocuments.get(textDocument.uri)!;
            }
            else _rainDoc.update(textDocument);
            return getRainHover(_rainDoc, position, params);
        },
        // doResolve: rainCompletion.doResolve.bind(rainCompletion),
    };
}
