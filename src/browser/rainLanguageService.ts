/* eslint-disable max-len */
import { RainHover } from './services/rainHover';
import { RainDocument } from './parser/rainParser';
import { doValidation } from './services/rainValidation';
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
	doValidation(document: TextDocument, opmeta: Uint8Array | string): Promise<Diagnostic[]>;
	parseRainDocument(document: TextDocument, opmeta: Uint8Array | string): RainDocumentResult;
	newRainDocument(document: TextDocument, opmeta: Uint8Array | string): RainDocument;
	// doResolve(item: CompletionItem): Promise<CompletionItem>;
	doComplete(document: TextDocument, opmeta: Uint8Array | string, position: Position): Promise<CompletionItem[] | null>;
	doHover(document: TextDocument, opmeta: Uint8Array | string, position: Position): Promise<Hover | null>;
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

    const rainCompletion = new RainCompletion(params);
    const rainHover = new RainHover(params);

    return {
        doValidation,
        parseRainDocument: (textDocument, opmeta) => (new RainDocument(textDocument, opmeta)).getResult(),
        newRainDocument: (document, opmeta) => new RainDocument(document, opmeta),
        // doResolve: rainCompletion.doResolve.bind(rainCompletion),
        doComplete: rainCompletion.doComplete.bind(rainCompletion),
        doHover: rainHover.doHover.bind(rainHover),
    };
}
