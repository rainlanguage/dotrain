import toposort from "toposort";
import { deepCopy } from "@rainprotocol/meta";
import { MetaStore } from "../parser/metaStore";
import { RainDocument } from "../parser/rainDocument";
import { ExpressionConfig } from "../rainLanguageTypes";
import { RainlangParser } from "../parser/rainlangParser";
import { BigNumber, BigNumberish, BytesLike, concat, constructByBits, hexlify, isBigNumberish, memoryOperand, op } from "../utils";
import { AliasASTNode, NamedExpression, ContextAlias, ASTNode, MemoryType, OpASTNode, TextDocument, ValueASTNode } from "../rainLanguageTypes";


/**
 * @public
 * Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export function rainlangc(
    text: string,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles Text Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The TextDocument to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rainlangc(
    document: TextDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * Rain Language Compiler (rainlangc), compiles Rain Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param rainDocument - The RainDocument to compile
 * @param metaStore - (optional) MetaStore object to get merged with the RainDocument's MetaStore
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function rainlangc(
    rainDocument: RainDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

export async function rainlangc(
    document: RainDocument | string | TextDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig> {
    const sources: BytesLike[] = [];
    const constants: BigNumberish[] = [];

    if (entrypoints.length === 0) return Promise.reject("no entrypoints specified");

    let _rainDocument: RainDocument;
    if (document instanceof RainDocument) {
        _rainDocument = document;
        if (metaStore) {
            _rainDocument.metaStore.updateStore(metaStore);
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
        const _opmeta = _rainDocument.getOpMetaWithCtxAliases();
        for (let i = 0; i < entrypoints.length; i++) {
            const _exp = _rainDocument.expressions.find(
                v => v.name === entrypoints[i]
            );
            if (!_exp) return Promise.reject(`undefined expression: ${entrypoints[i]}`);
            else {
                if (NamedExpression.isConstant(_exp)) return Promise.reject(
                    `invalid entrypoint: ${entrypoints[i]}, constants cannot be entrypoint/source`
                );
            }
        }
        
        if (_rainDocument.getProblems().length) return Promise.reject(_rainDocument.getProblems());

        const _nodes: string[] = [...entrypoints];
        const _edges: [string, string][] = [];
        const _initDeps = _rainDocument.getDependencies();
        for (let i = 0; i < _nodes.length; i++) {
            _initDeps.forEach(v => {
                if (v[0] === _nodes[i] && !_nodes.includes(v[1])) _nodes.push(v[1]);
            });
        }
        for (let i = 0; i < _initDeps.length; i++) {
            if (_nodes.includes(_initDeps[i][0])) _edges.push(_initDeps[i]);
        }

        for (let i = 0; i < _nodes.length; i++) {
            const exp = _rainDocument.expressions.find(v => v.name === _nodes[i]);
            if (exp?.parseObj) {
                if (exp.parseObj.problems.length) return Promise.reject(exp.parseObj.problems);
            }
            else {
                const prob = _rainDocument.getDependencyProblems().find(v => 
                    v.position[0] === exp?.namePosition[0] && v.position[1] === exp?.namePosition[1]
                );
                if (prob) return Promise.reject(prob);
                return Promise.reject(`cannot read properties of undefined parsed expression ${_nodes[i]}`);
            }
        }

        
        const _deps = toposort.array(_nodes, _edges).reverse();
        const _expressions: NamedExpression[] = [];
        const _consts: NamedExpression[] = [];
        for (let i = 0; i < _nodes.length; i++) {
            const expression = _rainDocument.expressions.find(v => v.name === _nodes[i]);
            if (expression) {
                if (NamedExpression.isConstant(expression)) _consts.push({
                    name: expression.name,
                    namePosition: deepCopy(expression.namePosition),
                    position: deepCopy(expression.position),
                    text: expression.text
                });
                else _expressions.push({
                    name: expression.name,
                    namePosition: deepCopy(expression.namePosition),
                    position: deepCopy(expression.position),
                    text: expression.text
                });
            }
            else return Promise.reject(new Error(`cannot find expression: ${_nodes[i]}`));
        }
        _expressions.push(..._consts);
        for (let i = 0; i < _deps.length; i++) {
            const index = _expressions.findIndex(v => v.name === _deps[i]);
            if (index > -1) _expressions[index].parseObj = new RainlangParser(
                _expressions, 
                index,
                _opmeta, 
                { 
                    constants: _rainDocument.constants,
                    resolveQuotes: { constants },
                    comments: _rainDocument.getComments()
                }
            );
            else return Promise.reject(new Error(`cannot find expression: ${_deps[i]}`));
        }

        for (let i = 0; i < _expressions.length; i++) {
            if (_expressions[i].parseObj) {
                if (_expressions[i].parseObj?.problems.length) {
                    return Promise.reject(_expressions[i].parseObj?.problems);
                }
            }
            else return Promise.reject(`cannot read properties of undefined parsed expression ${_expressions[i].name}`);
        }

        const _readMemoryIndex = _opmeta.findIndex(v => v.name === "read-memory");

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
        const _compile = (nodes: ASTNode[], aliases: AliasASTNode[]): BytesLike | undefined => {
            const _src: BytesLike[] = []; 

            // check for errors
            for (let i = 0; i < nodes.length; i++) {
                if (!_errorCheck(nodes[i])) return undefined;
            }
        
            // compile from parsed tree
            for (let i = 0; i < nodes.length; i++) {
                const _node = nodes[i];
                if (ValueASTNode.is(_node)) {
                    if (isBigNumberish(_node.value)) {
                        const _i = constants.findIndex(
                            v => BigNumber.from(_node.value).eq(v)
                        );
                        if (_i > -1) {
                            _src.push(
                                op(
                                    _readMemoryIndex,
                                    memoryOperand(
                                        _i,
                                        MemoryType.Constant,
                                    )
                                )
                            );
                        }
                        else {
                            _src.push(
                                op(
                                    _readMemoryIndex,
                                    memoryOperand(constants.length, MemoryType.Constant)
                                )
                            );
                            constants.push(_node.value);
                        }
                    }
                    else if (Object.keys(_rainDocument.constants).includes(_node.value)) {
                        const _i = constants.findIndex(
                            v => BigNumber.from(_rainDocument.constants[_node.value]).eq(v)
                        );
                        if (_i > -1) {
                            _src.push(
                                op(
                                    _readMemoryIndex,
                                    memoryOperand(_i, MemoryType.Constant)
                                )
                            );
                        }
                        else {
                            _src.push(
                                op(
                                    _readMemoryIndex,
                                    memoryOperand(constants.length, MemoryType.Constant)
                                )
                            );
                            constants.push(
                                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                            );
                        }
                    }
                }
                else if (AliasASTNode.is(_node)) {
                    const _i = aliases.findIndex(
                        v => v.name === _node.name
                    );
                    if (_i > -1) _src.push(
                        op(
                            _readMemoryIndex,
                            memoryOperand(_i, MemoryType.Stack)
                        )
                    );
                    else {
                        const _extExp = _expressions.find(
                            v => v.name === _node.name
                        );
                        if (NamedExpression.isConstant(_extExp)) {
                            const _value = BigNumber.from(
                                (_extExp?.parseObj?.ast.lines[0].nodes[0] as ValueASTNode).value
                            );
                            const _constIndex = constants.findIndex(v => _value.eq(v));
                            if (_constIndex > -1) _src.push(
                                op(
                                    _readMemoryIndex,
                                    memoryOperand(
                                        _constIndex,
                                        MemoryType.Constant,
                                    )
                                )
                            );
                            else {
                                _src.push(
                                    op(
                                        _readMemoryIndex,
                                        memoryOperand(
                                            constants.length,
                                            MemoryType.Constant,
                                        )
                                    )
                                );
                                constants.push(_value.toString());
                            }
                        }
                        else {
                            if (_extExp) throw new Error(`invalid reference to "${_node.name}"`);
                            else throw new Error(`cannot find expression: "${_node.name}"`);
                        }
                    }
                }
                else {
                    const _expConf = _compile(
                        _node.parameters,
                        aliases,
                    );
                    _src.push(_expConf!);

                    let _ctx: ContextAlias | undefined;
                    const _index = _opmeta.findIndex(
                        v => v.name === _node.opcode.name
                    );
                    if (_index >= _rainDocument.getOpMetaLength()) _ctx = 
                        _rainDocument.getContextAliases().find(
                            v => v.name === _node.opcode.name
                        );
                    _src.push(
                        op(
                            _ctx ? _opmeta.findIndex(v => v.name === "context") : _index, 
                            _ctx
                                ? isNaN(_ctx.row)
                                    ? constructByBits([
                                        {
                                            value: _ctx.column,
                                            bits: [8, 15]
                                        },
                                        {
                                            value: _node.operand,
                                            bits: [0, 7]
                                        }
                                    ])
                                    : constructByBits([
                                        {
                                            value: _ctx.column,
                                            bits: [8, 15]
                                        },
                                        {
                                            value: _ctx.row,
                                            bits: [0, 7]
                                        }
                                    ])
                                : _node.operand 
                        )
                    );
                }
            }
            return concat(_src);
        };

        for (let i = 0; i < _nodes.length; i++) {
            const _exp = _expressions.find(v => v.name === _nodes[i]);
            if (NamedExpression.isExpression(_exp)) {
                const _src = _compile(
                    _exp!.parseObj!.ast.lines.map(v => v.nodes).flat(),
                    _exp!.parseObj!.ast.lines.map(v => v.aliases).flat()
                );
                if (_src) sources.push(_src);
                else return Promise.reject(`cannot compile expression ${_nodes[i]}`);
            }
        }

        return { constants, sources: sources.map(v => hexlify(v, { allowMissingPrefix: true })) };

    }
    catch (err) {
        return Promise.reject(err);
    }
}
