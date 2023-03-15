import { RainDocument } from "../parser/rainParser";
import { TextDocument } from "../../shared/rainLanguageTypes";
import { ExpressionConfig } from "../../shared/compiler/expressionConfigTypes";


/**
 * @public
 * Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The document to compile, either a RainDocument instance or a raw text with opmeta
 * @param opmeta - (optional) Ops meta as bytes ie hex string or Uint8Array or json content as string
 * @returns ExpressionConfig promise
 */
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
                runtimeError: _rainDocument.getRuntimeError()
            });
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
