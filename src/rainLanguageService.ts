import { MetaStore } from "./parser/metaStore";
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
    // rainDocuments: Map<string, RainDocument>;
	newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
    doValidation(textDocument: TextDocument): Promise<Diagnostic[]>;
	doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
    doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
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

    // const rainDocuments: Map<string, RainDocument> = new Map();
    if (!params) params = {
        metaStore: new MetaStore()
    };
    else {
        if (!params.metaStore) params.metaStore = new MetaStore();
    }

    return {
        // rainDocuments,
        newRainDocument: async(textDocument) => {
            // let _rainDoc = rainDocuments.get(textDocument.uri);
            // if (!_rainDoc) {
            //     if (metaStore) store.updateStore(metaStore);
            //     rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
            //     _rainDoc = rainDocuments.get(textDocument.uri)!;
            // }
            // else _rainDoc.update(textDocument);
            return await RainDocument.create(textDocument, params?.metaStore);
        },
        doValidation: async(textDocument) => {
            // let _rainDoc = rainDocuments.get(textDocument.uri);
            // if (!_rainDoc) {
            //     rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
            //     _rainDoc = rainDocuments.get(textDocument.uri)!;
            // }
            // else _rainDoc.update(textDocument);
            // return getRainDiagnostics(_rainDoc, params);
            return getRainDiagnostics(textDocument, params);
        },
        doComplete: async(textDocument, position) => {
            // let _rainDoc = rainDocuments.get(textDocument.uri);
            // if (!_rainDoc) {
            //     rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
            //     _rainDoc = rainDocuments.get(textDocument.uri)!;
            // }
            // else _rainDoc.update(textDocument);
            // return getRainCompletion(_rainDoc, position, params);
            return getRainCompletion(textDocument, position, params);
        },
        doHover: async(textDocument, position) => {
            // let _rainDoc = rainDocuments.get(textDocument.uri);
            // if (!_rainDoc) {
            //     rainDocuments.set(textDocument.uri, await RainDocument.create(textDocument, store));
            //     _rainDoc = rainDocuments.get(textDocument.uri)!;
            // }
            // else _rainDoc.update(textDocument);
            // return getRainHover(_rainDoc, position, params);
            return getRainHover(textDocument, position, params);
        }
    };
}
