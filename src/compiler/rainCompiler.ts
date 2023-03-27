import { RainDocument } from "../parser/rainParser";
import { TextDocument } from "../rainLanguageTypes";
import { ExpressionConfig } from "./expressionConfigTypes";


/**
 * @public
 * Rain Language Compiler (rlc), compiles documents into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param opmeta - Ops meta as bytes ie hex string or Uint8Array
 * @returns ExpressionConfig promise
 */
export function rlc(
    text: string,
    opmeta: Uint8Array | string
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The TextDocument to compile
 * @param opmeta - Ops meta as bytes ie hex string or Uint8Array
 * @returns ExpressionConfig promise
 */
export function rlc(
    document: TextDocument,
    opmeta: Uint8Array | string
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)
 *
 * @param rainDocument - The rain document to compile
 * @returns ExpressionConfig promise
 */
export function rlc(rainDocument: RainDocument): Promise<ExpressionConfig>

export function rlc(
    document: RainDocument | TextDocument | string,
    opmeta?: Uint8Array | string
): Promise<ExpressionConfig> {
    let _rainDocument: RainDocument;
    if (document instanceof RainDocument) _rainDocument = document;
    else {
        if (opmeta) {
            if (typeof document === "string") _rainDocument = new RainDocument(
                TextDocument.create("file", "rainlang", 1, document), 
                opmeta
            );
            else _rainDocument = new RainDocument(document, opmeta);
        }
        else return Promise.reject("expected op meta");
    }
    try {
        const _bytes = _rainDocument.getExpressionConfig();
        if (_bytes) return Promise.resolve(_bytes);
        else {
            return Promise.reject({
                problems: _rainDocument.getProblems(),
                runtimeError: _rainDocument.getRuntimeError(),
                opMetaError: _rainDocument.getOpMetaError()
            });
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
