import { EVM } from "@ethereumjs/evm";
import { Meta } from "@rainprotocol/meta";
import { Rainlang as RL } from "./rainlang";
import { RainDocument as RD } from "./rainDocument";
import MagicString, { DecodedSourceMap } from "magic-string";
import { 
    isAddress, 
    BigNumber, 
    BytesLike, 
    CONSTANTS, 
    execBytecode, 
    getRandomInt, 
    exclusiveParse, 
    stringToUint8Array 
} from "../utils";
import { 
    AST, 
    Position, 
    TextDocument, 
    HASH_PATTERN, 
    WORD_PATTERN, 
    ExpressionConfig, 
    NATIVE_PARSER_ABI 
} from "../languageTypes";


/**
 * @public Compile namespace provides methods for compiling rainlang or rain document text or instances
 */
export namespace Compile {
    /**
     * @public Compiler options
     */
    export type Options = {
        /**
         * Meta.Store instance
         */
        metaStore?: Meta.Store;
        /**
         * An ABI to use as ExpressionDeployerNP ABI
         */
        abi?: any,
        /**
         * An EVM instance
         */
        evm?: EVM,
        /**
         * The minOutputs for entrypoints, defaults to 0 for each entrypoint if not specified
         */
        minOutputs?: number[],
    }

    /**
     * @public Compile error
     */
    export type Error = {
        /**
         * Name of the error
         */
        name: string;
        /**
         * Error arguments
         */
        args: { [key: string]: any };
    }

    // /**
    //  * @public Compile result type
    //  */
    // export type Result = ExpressionConfig | Error;

    /**
     * @public
     * Rain Language Compiler, compiles a text into valid ExpressionConfig
     *
     * @param text - The raw string to compile
     * @param bytecode - ExpressionDeployerNP deployed bytecode
     * @param entrypoints - The number of entrypoints
     * @param options - (optional) Compiler options
     * @returns A promise that resolves with ExpressionConfig and rejects with NPError
     */
    export async function Rainlang(
        text: string,
        bytecode: string,
        entrypoints: number, 
        options?: Options
    ): Promise<ExpressionConfig>

    /**
    * @public
    * Rain Language Compiler, compiles a text into valid ExpressionConfig
    *
    * @param text - The raw string to compile
    * @param bytecodeHash - The ExpressionDeployerNP deployed bytecode meta hash
    * @param entrypoints - The number of entrypoints
    * @param options - (optional) Compiler options
    * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
    */
    export async function Rainlang(
        text: string,
        bytecodeHash: string,
        entrypoints: number, 
        options?: Options
    ): Promise<ExpressionConfig>

    /**
    * @public
    * Rain Language Compiler, compiles a rainlang instance into valid ExpressionConfig
    *
    * @param rainlang - The Rainlang instance
    * @param entrypoints - The number of entrypoints
    * @param options - (optional) Compiler options
    * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
    */
    export async function Rainlang(
        rainlang: RL,
        entrypoints: number, 
        options?: Options
    ): Promise<ExpressionConfig>

    export async function Rainlang(
        source: string | RL,
        bytecodeSourceOrEntrypoints: string | number,
        entrypointsOrOptions?: number | Options, 
        options?: Options
    ): Promise<ExpressionConfig> {
        let _rainlang: RL;
        let _entrypoints: number;
        let _options: Options | undefined;
        if (typeof source === "string") {
            _options = options;
            _entrypoints = entrypointsOrOptions as number;
            if (HASH_PATTERN.test(bytecodeSourceOrEntrypoints as string)) {
                _rainlang = await RL.create(
                    source,
                bytecodeSourceOrEntrypoints as string,
                options?.metaStore
                );
            }
            else {
                _rainlang = await RL.create(
                    source,
                bytecodeSourceOrEntrypoints as string,
                options?.metaStore
                );
            }
        }
        else {
            _rainlang = source;
            _entrypoints = bytecodeSourceOrEntrypoints as number;
            _options = entrypointsOrOptions as Options | undefined;
        }

        return npParse(
            _rainlang.text,
            _rainlang.bytecode,
            _entrypoints, 
            { 
                abi: _options?.abi,
                evm: _options?.evm,
                minOutputs: _options?.minOutputs
            }
        );
    }

    /**
     * @public
     * RainDocument compiler, compiles a text into valid ExpressionConfig
     *
     * @param text - The raw string to compile
     * @param entrypoints - The entrypoints to compile
     * @param options - (optional) Compiler options
     * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
     */
    export function RainDocument(
        text: string,
        entrypoints: string[],
        options?: Options
    ): Promise<ExpressionConfig>

    /**
     * @public
     * RainDocument compiler, compiles Text Documents into valid ExpressionConfig
     *
     * @param document - The TextDocument to compile
     * @param entrypoints - The entrypoints to compile
     * @param options - (optional) Compiler options
     * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
     */
    export async function RainDocument(
        document: TextDocument,
        entrypoints: string[],
        options?: Options
    ): Promise<ExpressionConfig>

    /**
     * @public
     * RainDocument compiler, compiles Rain Documents into valid ExpressionConfig
     *
     * @param rainDocument - The RainDocument to compile
     * @param entrypoints - The entrypoints to compile
     * @param options - (optional) Compiler options
     * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
     */
    export async function RainDocument(
        rainDocument: RD,
        entrypoints: string[],
        options?: Options
    ): Promise<ExpressionConfig>

    export async function RainDocument(
        document: RD | string | TextDocument,
        entrypoints: string[],
        options?: Options
    ): Promise<ExpressionConfig> {

        if (entrypoints.length === 0) return Promise.reject("no entrypoints specified");

        let _rainDoc: RD;
        if (document instanceof RD) {
            _rainDoc = document;
            if (options?.metaStore && options.metaStore !== _rainDoc.metaStore) {
                _rainDoc.metaStore.update(options.metaStore);
                await _rainDoc.parse();
            }
        }
        else {
            if (typeof document === "string") _rainDoc = await RD.create(
                TextDocument.create(
                    "untitled-" + getRandomInt(1000000000).toString() + ".rain", 
                    "rainlang", 
                    1, 
                    document
                ),
                options?.metaStore
            );
            else _rainDoc = await RD.create(document, options?.metaStore);
        }
        try {
            const _nodes: {
                child: AST.Namespace | AST.NamespaceNode;
                parent: AST.Namespace;
            }[] = [];
            const _nodeKeys: string[] = [...entrypoints];
            const _rdProblems = _rainDoc.problems;
            if (_rdProblems.length) return Promise.reject(_rdProblems.map(v => {
                return {
                    msg: v.msg,
                    position: _rainDoc.textDocument.positionAt(v.position[0]),
                    code: v.code
                };
            }));
            const _bytecode = _rainDoc.bytecode;
            const _authoringMeta = _rainDoc.authoringMeta;
            for (let i = 0; i < entrypoints.length; i++) {
                if (entrypoints[i].includes(".")) {
                    try {
                        const _ns = searchNamespace(entrypoints[i], _rainDoc.namespace);
                        if (!AST.Namespace.isBinding(_ns.child)) return Promise.reject(
                            `invalid entrypoint: ${entrypoints[i]}, entrypoint must be bindings`
                        );
                        else {
                            if (_ns.child.Element.elided) return Promise.reject(
                                `elided entrypoint: ${entrypoints[i]}, ${_ns.child.Element.elided}`
                            );
                            if (_ns.child.Element.constant) return Promise.reject(
                                `invalid entrypoint: ${entrypoints[i]}, constants cannot be entrypoint`
                            );
                            if (_ns.child.Element.problems.length) return Promise.reject(
                                _ns.child.Element.problems.map(v => {
                                    return {
                                        msg: v.msg,
                                        position: _ns.child.ImportIndex === -1
                                            ? _rainDoc.textDocument.positionAt(v.position[0])
                                            : _rainDoc.textDocument.positionAt(
                                                _rainDoc.imports[
                                                    _ns.child.ImportIndex as number
                                                ].position[0]
                                            ),
                                        code: v.code
                                    };
                                })
                            );
                            if (!_ns.child.Element.exp) _ns.child.Element.exp = new RL(
                                _ns.child.Element.content,
                                _authoringMeta,
                                "0",
                                {
                                    // thisBinding: _ns.child.Element,
                                    namespaces: _ns.parent,
                                    ignoreAuthoringMeta: (_rainDoc as any)._ignoreUAM
                                }
                            );
                            if (_ns.child.Element.problems.length) return Promise.reject(
                                _ns.child.Element.problems.map(v => {
                                    return {
                                        msg: v.msg,
                                        position: _ns.child.ImportIndex === -1
                                            ? _rainDoc.textDocument.positionAt(v.position[0])
                                            : _rainDoc.textDocument.positionAt(
                                                _rainDoc.imports[
                                                    _ns.child.ImportIndex as number
                                                ].position[0]
                                            ),
                                        code: v.code
                                    };
                                })
                            );
                            _nodes.push(_ns);
                        }
                    }
                    catch (error) {
                        return Promise.reject(
                            `invalid entrypoint: ${entrypoints[i]}, ${error as string}`
                        );
                    }
                }
                else {
                    const _binding = _rainDoc.namespace[entrypoints[i]];
                    if (!_binding) return Promise.reject(`undefined expression: ${entrypoints[i]}`);
                    else {
                        if (!("Element" in _binding)) return Promise.reject(
                            `invalid entrypoint: ${entrypoints[i]}, namespaces cannot be entrypoint/source`
                        );
                        else if (!("content" in _binding.Element)) return Promise.reject(
                            `invalid entrypoint: ${entrypoints[i]}, only bindings can be entrypoint/source`
                        );
                        else {
                            if (_binding.Element.elided) return Promise.reject(
                                `elided entrypoint: ${entrypoints[i]}, ${_binding.Element.elided}`
                            );
                            if (_binding.Element.constant) return Promise.reject(
                                `invalid entrypoint: ${entrypoints[i]}, constants cannot be entrypoint`
                            );
                            if ((_binding.Element as AST.Binding).problems.length) {
                                return Promise.reject(
                                    (_binding.Element as AST.Binding).problems.map(
                                        v => ({
                                            msg: v.msg,
                                            position: _binding.ImportIndex === -1
                                                ? _rainDoc.textDocument.positionAt(v.position[0])
                                                : _rainDoc.textDocument.positionAt(
                                                    _rainDoc.imports[
                                                        _binding.ImportIndex as number
                                                    ].hashPosition[0]
                                                ),
                                            code: v.code
                                        })
                                    )
                                );
                            }
                            _nodes.push({
                                child: _binding,
                                parent: _rainDoc.namespace
                            });
                        }
                    }
                }
            }
            const _depsIndexes: number[][] = [];
            for (let i = 0; i < _nodes.length; i++) {
                const _d: number[] = [];
                const _deps = (_nodes[i].child.Element as AST.Binding).dependencies;
                for (let j = 0; j < _deps.length; j++) {
                    try {
                        const _ns = searchNamespace(_deps[j], _nodes[i].parent);
                        if (!AST.Namespace.isBinding(_ns.child)) return Promise.reject(
                            `invalid dependency entrypoint: ${entrypoints[i]}, entrypoint must be bindings`
                        );
                        else {
                            if (_ns.child.Element.elided) return Promise.reject(
                                `elided dependency entrypoint: ${entrypoints[i]}, ${_ns.child.Element.elided}`
                            );
                            if (_ns.child.Element.constant) return Promise.reject(
                                `invalid dependency entrypoint: ${entrypoints[i]}, constants cannot be entrypoint`
                            );
                            if (_ns.child.Element.problems.length) return Promise.reject(
                                _ns.child.Element.problems.map(v => {
                                    return {
                                        msg: v.msg,
                                        position: _ns.child.ImportIndex === -1
                                            ? _rainDoc.textDocument.positionAt(v.position[0])
                                            : _rainDoc.textDocument.positionAt(
                                                _rainDoc.imports[
                                                    _ns.child.ImportIndex as number
                                                ].position[0]
                                            ),
                                        code: v.code
                                    };
                                })
                            );
                            if (!_ns.child.Element.exp) _ns.child.Element.exp = new RL(
                                _ns.child.Element.content,
                                _authoringMeta,
                                "0",
                                {
                                    // thisBinding: _ns.child.Element,
                                    namespaces: _ns.parent,
                                    ignoreAuthoringMeta: (_rainDoc as any)._ignoreUAM
                                }
                            );
                            if (_ns.child.Element.problems.length) return Promise.reject(
                                _ns.child.Element.problems.map(v => {
                                    return {
                                        msg: v.msg,
                                        position: _ns.child.ImportIndex === -1
                                            ? _rainDoc.textDocument.positionAt(v.position[0])
                                            : _rainDoc.textDocument.positionAt(
                                                _rainDoc.imports[
                                                    _ns.child.ImportIndex as number
                                                ].position[0]
                                            ),
                                        code: v.code
                                    };
                                })
                            );
                            const _index = _nodes.findIndex(
                                v => v.child === _ns.child && v.parent === _ns.parent
                            );
                            if (_index === -1) {
                                _d.push(_nodes.length);
                                _nodes.push(_ns);
                                _nodeKeys.push(_deps[j]);
                            }
                            else _d.push(_index);
                        }
                    }
                    catch (error) {
                        return Promise.reject(
                            `invalid dependency entrypoint: ${entrypoints[i]}, ${error as string}`
                        );
                    }
                }
                _depsIndexes.push(_d);
            }

            // Finds replacements and generated sourcemap and new text
            const _buildSourcemap = (
                nodes: AST.Node[], 
                sourcemapGenerator: MagicString, 
                depsIndexes: number[]
            ) => {
                for (let i = 0; i < nodes.length; i++) {
                    const _node = nodes[i];
                    if (AST.Value.is(_node) && _node.id) {
                        sourcemapGenerator.update(
                            _node.position[0],
                            _node.position[1] + 1,
                            _node.value
                        );
                    }
                    else if (AST.Opcode.is(_node)) {                    
                        const _contextOpcode = _node.isCtx;
                        const _quotes = _node.operandArgs?.args.filter(
                            v => v.value.match(/^\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/)
                        );
                        if (_contextOpcode) {
                            sourcemapGenerator.update(
                                _node.opcode.position[0],
                                _node.opcode.position[1] + 1,
                                "context"
                            );
                            if (_node.operandArgs) {
                                sourcemapGenerator.appendLeft(
                                    _node.opcode.position[1] + 2,
                                    (_node.operand >> 8).toString() + " "
                                );
                            }
                            else {
                                sourcemapGenerator.appendLeft(
                                    _node.opcode.position[1] + 1,
                                    "<"
                                    + (_node.operand >> 8).toString()
                                    + " "
                                    + (_node.operand & 255).toString()
                                    + ">"
                                );
                            }
                        }
                        else {
                            if (_node.opcode.name.includes(".")) {
                                const _name = _node.opcode.name.slice(
                                    _node.opcode.name.lastIndexOf(".") + 1
                                );
                                const _op = _authoringMeta.find(
                                    v => v.word === _name
                                )?.word;
                                if (_op) sourcemapGenerator.update(
                                    _node.opcode.position[0],
                                    _node.opcode.position[1] + 1,
                                    _op
                                );
                                else sourcemapGenerator.update(
                                    _node.opcode.position[0],
                                    _node.opcode.position[1] + 1,
                                    _name
                                );
                                // else throw "cannot find a match for specified opcode: " + _node.opcode.name;
                            }
                        }
                        if (_quotes && _quotes.length) {
                            if (!depsIndexes.length) throw "cannot resolve dependecies";
                            for (let j = 0; j < _quotes.length; j++) sourcemapGenerator.update(
                                _quotes[j].position[0],
                                _quotes[j].position[1] + 1,
                                depsIndexes.unshift().toString()
                            );
                        }
                        if (_node.parameters.length > 0) {
                            _buildSourcemap(_node.parameters, sourcemapGenerator, depsIndexes);
                        }
                    }
                }
            };
            
            // Finds the original position from a generated text with sourcemap
            const _findOrgPosition = (
                sourcemap: DecodedSourceMap, 
                line: number, 
                column: number
            ): Position => {
                let character = 0;
                const _map = sourcemap.mappings[line];
                for (let i = 0; i < _map.length; i++) {
                    if (_map[i][0] === column) return { line, character: _map[i][3]! };
                    else if (_map[i][0] < column) character = _map[i][3]!;
                    else return { line, character };
                }
                return { line, character };
            };

            const _sourcemaps: {
                exp: AST.Binding;
                originalText: string;
                generatedText: string;
                sourcemap: DecodedSourceMap;
                offset: number;
            }[] = [];
            for (let i = 0; i < _nodes.length; i++) {
                const _b = _nodes[i].child.Element as AST.Binding;
                const _smGenerator = new MagicString(_b.content);
                _buildSourcemap(
                    _b.exp!.ast.map(v => v.lines.map(e => e.nodes)).flat().flat(), 
                    _smGenerator,
                    _depsIndexes[i]
                );
                _sourcemaps.push({
                    exp: _b,
                    originalText: _b.content,
                    generatedText: _smGenerator.toString(),
                    sourcemap: _smGenerator.generateDecodedMap({ hires: true }),
                    offset: _sourcemaps.at(-1) 
                        ? _sourcemaps.at(-1)!.offset + _sourcemaps.at(-1)!.generatedText.length + 2
                        : 0,
                });
            }
            const _generatedRainlang = new RL(
                _sourcemaps.map(v => v.generatedText).join("\n"),
                _authoringMeta,
                _bytecode, 
                {
                    ignoreAuthoringMeta: (_rainDoc as any)._ignoreUAM
                }
            );
            const _genRainlangProblems = _generatedRainlang.problems;

            // if ((_rainDoc as any)._ignoreUAM) _genRainlangProblems = _genRainlangProblems.filter(
            //     v => v.code !== ErrorCode.UndefinedOpcode
            // );

            if (_genRainlangProblems.length) {
                const _problems = [];
                for (let i = 0; i < _genRainlangProblems.length; i++) {
                    const _smIndex = _sourcemaps.findIndex(v => 
                        v.offset <= _genRainlangProblems[i].position[0] && 
                        v.offset + v.generatedText.length - 1 >= _genRainlangProblems[i].position[1]
                    )!;

                    if (_nodes[_smIndex].child.ImportIndex === -1) {
                        const _genTD = TextDocument.create("v", "rainlang", 0, _sourcemaps[_smIndex].generatedText);
                        const _orgTD = TextDocument.create("v", "rainlang", 0, _sourcemaps[_smIndex].originalText);

                        const _offsets: AST.Offsets = [
                            _genRainlangProblems[i].position[0] - _sourcemaps[_smIndex].offset,
                            _genRainlangProblems[i].position[1] - _sourcemaps[_smIndex].offset
                        ];
                        const _sGenPos = _genTD.positionAt(_offsets[0]);
                        // const _eGenPos = _gentd.positionAt(_offsets[1] + 1);
                        const _sOrgPos = _findOrgPosition(
                            _sourcemaps[_smIndex].sourcemap, _sGenPos.line, _sGenPos.character
                        );
                        // const _eOrgPos = findOriginalPosition(
                        //     _sp.sourcemap, _eGenPos.line, _eGenPos.character
                        // );
                        _problems.push({
                            msg: _genRainlangProblems[i].msg,
                            position: 
                            // [
                                _rainDoc.textDocument.positionAt(
                                    _sourcemaps[_smIndex].exp.contentPosition[0] + 
                                    _orgTD.offsetAt(_sOrgPos)
                                ),
                            //     _sp.exp.contentPosition[0] + _orgtd.offsetAt(_eOrgPos) - 1
                            // ],
                            code: _genRainlangProblems[i].code,
                        });
                    }
                    else {
                        _problems.push({
                            msg: _genRainlangProblems[i].msg,
                            position: _rainDoc.imports[
                                _nodes[_smIndex].child.ImportIndex as number
                            ].hashPosition,
                            code: _genRainlangProblems[i].code,
                        });
                    }
                }
                return Promise.reject(_problems);
            }
            else return Rainlang(
                _generatedRainlang,
                entrypoints.length, 
                options
            );
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}

/**
 * @public Parse a text using NP bytecode
 * @param text - the text to parse
 * @param deployedBytecode - The NP contract deployed bytecode
 * @param entrypoints - The number of entrypoints
 * @param options - options
 * @returns A Promise that resolves with ExpressionConfig or rejects with NPError
 */
export async function npParse(
    text: string,
    deployedBytecode: BytesLike,
    entrypoints: number,
    options: {
        /**
         * An ABI to use as ExpressionDeployerNP ABI
         */
        abi?: any,
        /**
         * An EVM instance
         */
        evm?: EVM,
        /**
         * The minOutputs for entrypoints, defaults to 0 for each entrypoint if not specified
         */
        minOutputs?: number[],
    } = {}
): Promise<ExpressionConfig> {
    const abi = options.abi ? options.abi : NATIVE_PARSER_ABI;
    const evm = options.evm ? options.evm : new EVM();
    if (options.minOutputs && entrypoints !== options.minOutputs.length) throw new Error(
        "minoutput mismatch length"
    );
    const minoutputs: number[] = options.minOutputs 
        ? options.minOutputs 
        : new Array(entrypoints).fill(0);
    try {
        const result = await execBytecode(deployedBytecode, abi, "parse", [stringToUint8Array(text)], evm);
        const constants = result.find(
            v => Array.isArray(v)
        )?.map(
            (v: BigNumber) => isAddress(v.toHexString()) || v.eq(CONSTANTS.MaxUint256) 
                ? v.toHexString() 
                : v.toString()
        );
        const bytecode = result.find(v => !Array.isArray(v));
        if (!constants || !bytecode) throw "could not parse";
        await execBytecode(
            deployedBytecode,
            abi, 
            "integrityCheck", 
            [bytecode, constants, minoutputs], 
            evm
        );
        return Promise.resolve({ constants, bytecode });
    }
    catch (error) {
        if (typeof error === "string" && error === "could not parse") return Promise.reject(error);
        try {
            const { errorArgs, errorName: name } = error as any;
            if (name && errorArgs) {
                const args: any = {};
                const keys = Object.keys(errorArgs).filter(v => !/^\d+$/.test(v));
                keys.forEach(v => args[v] = errorArgs[v]);
                return Promise.reject({ name, args });
            }
            else throw error;
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}

/**
 * @public Search in a Namespace for a given name
 * @param name - The name
 * @param namespace - The Namespace
 * @returns An object that contains the found item and the parent namespace
 */
export function searchNamespace(
    name: string, 
    namespace: AST.Namespace
): {
    child: AST.Namespace | AST.NamespaceNode;
    parent: AST.Namespace;
} {
    const _names = exclusiveParse(name, /\./gd, undefined, true);
    if (name.startsWith(".")) _names.shift();
    if (_names.length > 32) throw "namespace too deep";
    if (!_names[_names.length - 1][0]) throw "expected to end with a node";
    if (_names.filter(v => !WORD_PATTERN.test(v[0])).length) throw "invalid word pattern";
    const _result: any = {
        child: namespace,
        parent: null
    };
    for (let i = 0; i < _names.length; i++) {
        _result.parent = _result.child;
        if (_result.child[_names[i][0]]) {
            _result.child = _result.child[_names[i][0]];
        }
        else throw "undefined identifier";
    }
    return _result;
}