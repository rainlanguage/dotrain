import { Meta } from "@rainprotocol/meta";
import { getHover } from "./services/hover";
import { RainDocument } from "./parser/rainDocument";
import { getCompletion } from "./services/completion";
import { getDiagnostics } from "./services/diagnostics";
import {
    Hover, 
    Position, 
    Diagnostic, 
    TextDocument, 
    CompletionItem, 
    LanguageServiceParams 
} from "./languageTypes";


/**
 * @public
 * Interface for Rain language services
 */
export interface RainLanguageServices {
    metaStore: Meta.Store;
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

    if (!params.metaStore) params.metaStore = new Meta.Store();
    const metaStore = params.metaStore;
    // const rainDocuments: Map<string, RainDocument> = new Map();

    return {
        metaStore,
        newRainDocument: async(textDocument) => {
            return await RainDocument.create(textDocument, metaStore);
        },
        doValidate: async(textDocument) => {
            return getDiagnostics(textDocument, params);
        },
        doComplete: async(textDocument, position) => {
            return getCompletion(textDocument, position, params);
        },
        doHover: async(textDocument, position) => {
            return getHover(textDocument, position, params);
        }
    };
}
