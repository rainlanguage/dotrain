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
 * const langServices = getLanguageService({clientCapabilities, metastore});
 * 
 * // getting validation results (lsp Diagnostics)
 * const errors = await langServices.doValidate(myTextDocument);
 * ```
 */
export function getLanguageService(params?: LanguageServiceParams): LanguageService {

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
            return getRainDiagnostics(textDocument, params);
        },
        doComplete: async(textDocument, position) => {
            return getRainCompletion(textDocument, position, params);
        },
        doHover: async(textDocument, position) => {
            return getRainHover(textDocument, position, params);
        }
    };
}
