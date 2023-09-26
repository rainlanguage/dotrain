import { npParse } from "../utils";
import { Rainlang } from "../rainlang/rainlang";
import { CompilerOptions, ExpressionConfig, HASH_PATTERN } from "../rainLanguageTypes";


/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param bytecode - ExpressionDeployerNP deployed bytecode
 * @param options - (optional) Compiler options
 * @returns A promise that resolves with ExpressionConfig and rejects with NPError
 */
export async function rainlangc(
    text: string,
    bytecode: string,
    options?: CompilerOptions
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param bytecodeHash - The ExpressionDeployerNP deployed bytecode meta hash
 * @param options - (optional) Compiler options
 * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
 */
export async function rainlangc(
    text: string,
    bytecodeHash: string,
    options?: CompilerOptions
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a rainlang instance into valid ExpressionConfig (deployable bytes)
 *
 * @param rainlang - The Rainlang instance
 * @param options - (optional) Compiler options
 * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
 */
export async function rainlangc(
    rainlang: Rainlang,
    options?: CompilerOptions
): Promise<ExpressionConfig>

export async function rainlangc(
    source: string | Rainlang,
    bytecodeSourceOrOptions?: string | CompilerOptions,
    options?: CompilerOptions
): Promise<ExpressionConfig> {
    let _rainlang: Rainlang;
    let _options: CompilerOptions | undefined;
    if (typeof source === "string") {
        _options = options;
        if (HASH_PATTERN.test(bytecodeSourceOrOptions as string)) {
            _rainlang = await Rainlang.create(
                source,
                bytecodeSourceOrOptions as string,
                options?.metastore
            );
        }
        else {
            _rainlang = await Rainlang.create(
                source,
                bytecodeSourceOrOptions as string,
                options?.metastore
            );
        }
    }
    else {
        _rainlang = source;
        _options = bytecodeSourceOrOptions as CompilerOptions | undefined;
    }

    return npParse(
        _rainlang.text,
        _rainlang.bytecode,
        { 
            abi: _options?.abi,
            evm: _options?.evm,
            fn: _options?.fn 
        }
    );
}