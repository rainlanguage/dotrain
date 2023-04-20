import { OpMetaStore } from "../parser/opMetaStore";
import { TextDocument } from "../rainLanguageTypes";
import { RainDocument } from "../parser/rainDocument";
import { ExpressionConfig } from "../rainLanguageTypes";


/**
 * @public
 * Rain Language Compiler (rlc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param opMetaStore - (optional) Initial OpMetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export function rlc(
    text: string,
    opMetaStore?: OpMetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Text Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The TextDocument to compile
 * @param opMetaStore - (optional) Initial OpMetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rlc(
    document: TextDocument,
    opMetaStore?: OpMetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Rain Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param rainDocument - The RainDocument to compile
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rlc(rainDocument: RainDocument): Promise<ExpressionConfig>

export async function rlc(
    document: RainDocument | TextDocument | string,
    opMetaStore?: OpMetaStore
): Promise<ExpressionConfig> {
    let _rainDocument: RainDocument;
    if (document instanceof RainDocument) _rainDocument = document;
    else {
        if (typeof document === "string") _rainDocument = await RainDocument.create(
            TextDocument.create("file", "rainlang", 1, document),
            opMetaStore
        );
        else _rainDocument = await RainDocument.create(document, opMetaStore);
    }
    try {
        const _bytes = _rainDocument.getExpressionConfig();
        if (_bytes) return Promise.resolve(_bytes);
        else {
            if (_rainDocument.getRuntimeError()) return Promise.reject({
                problems: _rainDocument.getProblems(),
                runtimeError: _rainDocument.getRuntimeError()
            });
            else return Promise.reject({
                problems: _rainDocument.getProblems()
            });
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
