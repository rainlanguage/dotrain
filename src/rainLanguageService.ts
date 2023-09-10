import { MetaStore } from "./dotrain/metaStore";
import { getHover } from "./services/hover";
import { RainDocument } from "./dotrain/rainDocument";
import { getCompletion } from "./services/completion";
import { getDiagnostics } from "./services/diagnostics";
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
export interface RainLanguageServices {
    metaStore: MetaStore;
    rainDocuments: Map<string, RainDocument>;
	newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
    doValidate(textDocument: TextDocument): Promise<Diagnostic[]>;
    doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
	doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
}

/**
 * @public
 * Main function to get Rain language services initiated and ready to receive 
 * TextDocuments to provide the desired language services
 * 
 * @example
 * ```ts
 * // importing
 * import { getRainLanguageServices } from "@rainprotocol/rainlang";
 * 
 * // initiating the services
 * const langServices = getRainLanguageServices({clientCapabilities, metastore});
 * 
 * // getting validation results (lsp Diagnostics)
 * const errors = await langServices.doValidate(myTextDocument);
 * ```
 */
export function getRainLanguageServices(params: LanguageServiceParams = {}): RainLanguageServices {

    if (!params.metaStore) params.metaStore = new MetaStore();
    const metaStore = params.metaStore;
    const rainDocuments: Map<string, RainDocument> = new Map();

    return {
        metaStore,
        rainDocuments,
        newRainDocument: async(textDocument) => {
            const _rd = await RainDocument.create(textDocument, metaStore);
            rainDocuments.set(textDocument.uri, _rd);
            return _rd;
        },
        doValidate: async(textDocument) => {
            let _rd = rainDocuments.get(textDocument.uri);
            if (!_rd) {
                _rd = await RainDocument.create(textDocument, metaStore);
                rainDocuments.set(textDocument.uri, _rd);   
            }
            return getDiagnostics(_rd, params);
        },
        doComplete: async(textDocument, position) => {
            let _rd = rainDocuments.get(textDocument.uri);
            if (!_rd) {
                _rd = await RainDocument.create(textDocument, metaStore);
                rainDocuments.set(textDocument.uri, _rd);
            }
            return getCompletion(_rd, position, params);
        },
        doHover: async(textDocument, position) => {
            let _rd = rainDocuments.get(textDocument.uri);
            if (!_rd) {
                _rd = await RainDocument.create(textDocument, metaStore);
                rainDocuments.set(textDocument.uri, _rd);
            }
            return getHover(_rd, position, params);
        }
    };
}
