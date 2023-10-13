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
	newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
    doValidate(textDocument: TextDocument): Promise<Diagnostic[]>;
    doValidate(rainDocument: RainDocument): Promise<Diagnostic[]>;
    doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
    doHover(rainDocument: RainDocument, position: Position): Promise<Hover | null>;
	doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
    doComplete(rainDocument: RainDocument, position: Position): Promise<CompletionItem[] | null>;

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

    return {
        metaStore,
        newRainDocument: async(textDocument) => {
            return await RainDocument.create(textDocument, metaStore);
        },
        doValidate: async(document) => {
            return getDiagnostics(document as any, params);
        },
        doComplete: async(document, position) => {
            return getCompletion(document as any, position, params);
        },
        doHover: async(document, position) => {
            return getHover(document as any, position, params);
        }
    };
}
