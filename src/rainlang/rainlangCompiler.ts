import { OpMeta } from "@rainprotocol/meta";
import { Rainlang } from "../rainlang/rainlang";
import { MetaStore } from "../dotrain/metaStore";
import { ExpressionConfig } from "../rainLanguageTypes";
import { AliasASTNode, ASTNode, MemoryType, OpASTNode } from "../rainLanguageTypes";
import { BigNumber, BigNumberish, BytesLike, concat, hexlify, memoryOperand, op, toConvNumber } from "../utils";


/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param opmeta - Array of ops metas
 * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
 */
export async function rainlangc(text: string, opmeta: OpMeta[]): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param opmetaHash - The op meta hash
 * @param opmetaStore - (optional) The MetaStore instance to search for op meta hash in its cache
 * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
 */
export async function rainlangc(
    text: string,
    opmetaHash: string,
    metaStore: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a rainlang instance into valid ExpressionConfig (deployable bytes)
 *
 * @param rainlang - The Rainlang instance
 * @returns A promise that resolves with ExpressionConfig and rejects with problems found in text
 */
export async function rainlangc(rainlang: Rainlang): Promise<ExpressionConfig>

export async function rainlangc(
    source: string | Rainlang,
    opmetaSource?: OpMeta[] | string,
    metaStore?: MetaStore,
): Promise<ExpressionConfig> {
    const sources: BytesLike[] = [];
    const constants: BigNumberish[] = [];

    let _rainlang: Rainlang;
    if (typeof source === "string") {
        if (typeof opmetaSource === "string") _rainlang = await Rainlang.create(
            source,
            opmetaSource,
            metaStore
        );
        else {
            if (!opmetaSource || !Array.isArray(opmetaSource) || !opmetaSource.length) 
                return Promise.reject("invalid opmeta");
            else _rainlang = new Rainlang(source, opmetaSource);
        }
    }
    else _rainlang = source;

    const _ast = _rainlang.getAst();
    const _opmeta = _rainlang.getOpMeta();
    const _problems = _rainlang.getProblems();
    if (_problems.length) return Promise.reject(_problems);

    const _readMemoryIndex = _opmeta.findIndex(v => v.name === "read-memory");

    // checks for problems in an ast node
    const _errorCheck = (node: ASTNode): boolean => {
        if (OpASTNode.is(node)) {
            if (isNaN(node.operand) || isNaN(node.output)) return false;
            else {
                for (const param of node.parameters) {
                    if (!_errorCheck(param)) return false;
                }
                return true;
            }
        }
        else return true;
    };

    // recursive fn to compile ast nodes to bytes
    const _compile = (nodes: ASTNode[], aliases: AliasASTNode[]): BytesLike | undefined => {
        const _src: BytesLike[] = []; 

        // check for errors
        for (let i = 0; i < nodes.length; i++) if (!_errorCheck(nodes[i])) return undefined;
        
        // compile from parsed tree
        for (let i = 0; i < nodes.length; i++) {
            const _node = nodes[i];
            if ("value" in _node) {
                const _val = toConvNumber(_node.value);
                const _i = constants.findIndex(v => BigNumber.from(_val).eq(v));
                if (_i > -1) _src.push(
                    op(_readMemoryIndex, memoryOperand(_i, MemoryType.Constant))
                );
                else {
                    _src.push(
                        op(
                            _readMemoryIndex,
                            memoryOperand(constants.length, MemoryType.Constant)
                        )
                    );
                    constants.push(_val);
                }
                // if (isBigNumberish(_node.value)) {
                //     const _i = constants.findIndex(v => BigNumber.from(_node.value).eq(v));
                //     if (_i > -1) _src.push(
                //         op(_readMemoryIndex, memoryOperand(_i, MemoryType.Constant))
                //     );
                //     else {
                //         _src.push(
                //             op(
                //                 _readMemoryIndex,
                //                 memoryOperand(constants.length, MemoryType.Constant)
                //             )
                //         );
                //         constants.push(_node.value);
                //     }
                // }
                // else if (Object.keys(_rainlang.constants).includes(_node.value)) {
                //     const _i = constants.findIndex(
                //         v => BigNumber.from(_rainlang.constants[_node.value]).eq(v)
                //     );
                //     if (_i > -1) _src.push(
                //         op(_readMemoryIndex, memoryOperand(_i, MemoryType.Constant))
                //     );
                //     else {
                //         _src.push(
                //             op(
                //                 _readMemoryIndex,
                //                 memoryOperand(constants.length, MemoryType.Constant)
                //             )
                //         );
                //         constants.push(
                //             "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                //         );
                //     }
                // }
                // else throw `cannot resolve ${_node.value}`;
            }
            else if ("name" in _node) {
                const _i = aliases.findIndex(v => v.name === _node.name);
                if (_i > -1) _src.push(op(_readMemoryIndex, memoryOperand(_i, MemoryType.Stack)));
                else throw new Error(`invalid reference to "${_node.name}"`);
            }
            else {
                const _deepSrc = _compile(_node.parameters, aliases);
                _src.push(_deepSrc!);
                const _index = _opmeta.findIndex(
                    v => v.name === _node.opcode.name || v.aliases?.includes(_node.opcode.name)
                );
                _src.push(op(_index, _node.operand));
            }
        }
        return concat(_src);
    };

    try{
        for (let i = 0; i < _ast.length; i++) {
            const _nodes = _ast[i].lines.map(v => v.nodes).flat();
            const _aliases = _ast[i].lines.map(v => v.aliases).flat();
            const _source = _compile(_nodes, _aliases);
            if (_source) sources.push(_source);
            else return Promise.reject("cannot compile expression");
        }

        return Promise.resolve({ 
            constants, 
            sources: sources.map(v => hexlify(v, { allowMissingPrefix: true })) 
        });

    }
    catch (err) {
        return Promise.reject(err);
    }
}