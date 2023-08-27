import { MetaStore } from "./dotrain/metaStore";
import { getRainlangHover } from "./services/hover";
import { RainDocument } from "./dotrain/rainDocument";
import { getRainlangCompletion } from "./services/completion";
import { getRainlangDiagnostics } from "./services/diagnostics";
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
	newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
    doValidation(textDocument: TextDocument): Promise<Diagnostic[]>;
	doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
    doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
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
export function getRainLanguageServices(params?: LanguageServiceParams): RainLanguageServices {

    if (!params) params = {
        metaStore: new MetaStore()
    };
    else {
        if (!params.metaStore) params.metaStore = new MetaStore();
    }

    return {
        newRainDocument: async(textDocument) => {
            return await RainDocument.create(textDocument, params?.metaStore);
        },
        doValidation: async(textDocument) => {
            return getRainlangDiagnostics(textDocument, params);
        },
        doComplete: async(textDocument, position) => {
            return getRainlangCompletion(textDocument, position, params);
        },
        doHover: async(textDocument, position) => {
            return getRainlangHover(textDocument, position, params);
        }
    };
}
