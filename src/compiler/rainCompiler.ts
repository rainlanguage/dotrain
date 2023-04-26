import { MetaStore } from "../parser/metaStore";
import { TextDocument } from "../rainLanguageTypes";
import { RainDocument } from "../parser/rainDocument";
import { ExpressionConfig } from "../rainLanguageTypes";


/**
 * @public
 * Rain Language Compiler (rlc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export function rlc(
    text: string,
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Text Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The TextDocument to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rlc(
    document: TextDocument,
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rlc), compiles Rain Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param rainDocument - The RainDocument to compile
 * @param metaStore - (optional) MetaStore object to get merged with the RainDocument's MetaStore
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rlc(
    rainDocument: RainDocument,
    metaStore?: MetaStore
): Promise<ExpressionConfig>

export async function rlc(
    document: RainDocument | TextDocument | string,
    metaStore?: MetaStore
): Promise<ExpressionConfig> {
    let _rainDocument: RainDocument;
    if (document instanceof RainDocument) {
        _rainDocument = document;
        if (metaStore) {
            _rainDocument.getMetaStore().updateStore(metaStore);
        }
    }
    else {
        if (typeof document === "string") _rainDocument = await RainDocument.create(
            TextDocument.create("file", "rainlang", 1, document),
            metaStore
        );
        else _rainDocument = await RainDocument.create(document, metaStore);
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
