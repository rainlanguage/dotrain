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

// namespace Is {

//     const toString = Object.prototype.toString;

//     export function defined(value: any): boolean {
//         return typeof value !== "undefined";
//     }

//     // eslint-disable-next-line no-shadow-restricted-names
//     export function undefined(value: any): boolean {
//         return typeof value === "undefined";
//     }

//     export function boolean(value: any): value is boolean {
//         return value === true || value === false;
//     }

//     export function string(value: any): value is string {
//         return toString.call(value) === "[object String]";
//     }

//     export function number(value: any): value is number {
//         return toString.call(value) === "[object Number]";
//     }

//     export function numberRange(value: any, min: number, max: number): value is number {
//         return toString.call(value) === "[object Number]" && min <= value && value <= max;
//     }

//     // export function integer(value: any): value is integer {
//     //     return toString.call(value) === "[object Number]" && -2147483648 <= value && value <= 2147483647;
//     // }

//     // export function uinteger(value: any): value is uinteger {
//     //     return toString.call(value) === "[object Number]" && 0 <= value && value <= 2147483647;
//     // }

//     // eslint-disable-next-line @typescript-eslint/ban-types
//     export function func(value: any): value is Function {
//         return toString.call(value) === "[object Function]";
//     }

//     export function objectLiteral(value: any): value is object {
//     // Strictly speaking class instances pass this check as well. Since the LSP
//     // doesn't use classes we ignore this for now. If we do we need to add something
//     // like this: `Object.getPrototypeOf(Object.getPrototypeOf(x)) === null`
//         return value !== null && typeof value === "object";
//     }

//     export function typedArray<T>(value: any, check: (value: any) => boolean): value is T[] {
//         return Array.isArray(value) && (<any[]>value).every(check);
//     }
// }

// /**
//  * kjhfkjfd
//  */
// export interface Position {
// 	/**
// 	 * Line position in a document (zero-based).
// 	 *
// 	 * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
// 	 * If a line number is negative, it defaults to 0.
// 	 */
// 	line: number;

// 	/**
// 	 * Character offset on a line in a document (zero-based).
// 	 *
// 	 * The meaning of this offset is determined by the negotiated
// 	 * `PositionEncodingKind`.
// 	 *
// 	 * If the character value is greater than the line length it defaults back to the
// 	 * line length.
// 	 */
// 	character: number;
// }

// /**
//  * The Position namespace provides helper functions to work with
//  * {@link Position} literals.
//  */
// export namespace Position {
//     /**
// 	 * Creates a new Position literal from the given line and character.
// 	 * @param line The position's line.
// 	 * @param character The position's character.
// 	 */
//     export function create(line: number, character: number): Position {
//     // if (line === Number.MAX_VALUE) { line = uinteger.MAX_VALUE; }
//     // if (character === Number.MAX_VALUE) { character = uinteger.MAX_VALUE; }  
//         return { line, character };
//     }
// 	/**
// 	 * Checks whether the given literal conforms to the {@link Position} interface.
// 	 */
//     export function is(value: any): value is Position {
//         const candidate = value as Position;
//         return Is.objectLiteral(candidate) && 
//         Is.number(candidate.line) && 
//         Is.number(candidate.character);
//     }
// }
// const x = {
//     lin: 1,
//     character: 1,
//     u: "oi"
// };

// if (Position.is(x)) console.log("hey");
// else console.log("kk");