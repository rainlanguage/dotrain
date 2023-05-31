import toposort from "toposort";
import { deepCopy } from "@rainprotocol/meta";
import { MetaStore } from "../parser/metaStore";
import { RainDocument } from "../parser/rainDocument";
import { ExpressionConfig } from "../rainLanguageTypes";
import { RainlangParser } from "../parser/rainlangParser";
import { BigNumber, BigNumberish, BytesLike, concat, constructByBits, hexlify, isBigNumberish, memoryOperand, op } from "../utils";
import { AliasASTNode, BoundExpression, ContextAlias, FragmentASTNode, MemoryType, OpASTNode, TextDocument, ValueASTNode } from "../rainLanguageTypes";


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
        const opmeta = _rainDocument.getOpMetaWithCtxAliases();
        for (let i = 0; i < entrypoints.length; i++) {
            const _exp = _rainDocument.expressions.find(
                v => v.name === entrypoints[i]
            );
            if (!_exp) return Promise.reject(`undefined expression: ${entrypoints[i]}`);
            else {
                if (BoundExpression.isConstant(_exp)) return Promise.reject(
                    `invalid entrypoint: ${entrypoints[i]}, constants cannot be entrypoint/source`
                );
            }
        }

        if (_rainDocument.getProblems().length) return Promise.reject(_rainDocument.getProblems());

        const nodes: string[] = [...entrypoints];
        const edges: [string, string][] = [];
        const initDeps = _rainDocument.getDependencies();
        for (let i = 0; i < nodes.length; i++) {
            initDeps.forEach(v => {
                if (v[0] === nodes[i] && !nodes.includes(v[1])) nodes.push(v[1]);
            });
        }
        for (let i = 0; i < initDeps.length; i++) {
            if (nodes.includes(initDeps[i][0])) edges.push(initDeps[i]);
        }

        for (let i = 0; i < nodes.length; i++) {
            const exp = _rainDocument.expressions.find(v => v.name === nodes[i]);
            if (exp?.doc) {
                if (exp.doc.problems.length) return Promise.reject(exp.doc.problems);
            }
            else {
                const prob = _rainDocument.getDependencyProblems().find(v => 
                    v.position[0] === exp?.namePosition[0] && v.position[1] === exp?.position[1]
                );
                if (prob) return Promise.reject(prob);
                return Promise.reject(`cannot read properties of undefined parsed expression ${nodes[i]}`);
            }
        }

        
        const deps = toposort.array(nodes, edges).reverse();
        const exps: BoundExpression[] = [];
        const consts: BoundExpression[] = [];
        for (let i = 0; i < nodes.length; i++) {
            const expression = _rainDocument.expressions.find(v => v.name === nodes[i]);
            if (expression) {
                if (BoundExpression.isConstant(expression)) consts.push({
                    name: expression.name,
                    namePosition: deepCopy(expression.namePosition),
                    position: deepCopy(expression.position),
                    text: expression.text
                });
                else exps.push({
                    name: expression.name,
                    namePosition: deepCopy(expression.namePosition),
                    position: deepCopy(expression.position),
                    text: expression.text
                });
            }
            else return Promise.reject(new Error(`cannot find expression: ${nodes[i]}`));
        }
        exps.push(...consts);
        for (let i = 0; i < deps.length; i++) {
            const index = exps.findIndex(v => v.name === deps[i]);
            if (index > -1) exps[index].doc = new RainlangParser(
                exps[index].text, 
                opmeta, 
                index,
                { 
                    boundExpressions: exps, 
                    constants: _rainDocument.constants,
                    compilationParse: true
                }
            );
            else return Promise.reject(new Error(`cannot find expression: ${deps[i]}`));
        }

        for (let i = 0; i < exps.length; i++) {
            if (exps[i].doc) {
                if (exps[i].doc?.problems.length) {
                    return Promise.reject(exps[i].doc?.problems);
                }
            }
            else return Promise.reject(`cannot read properties of undefined parsed expression ${exps[i].name}`);
        }

        const sources: BytesLike[] = [];
        const constants: BigNumberish[] = [];
        const readMemoryIndex = opmeta.findIndex(v => v.name === "read-memory");

        const _compile = (
            nodes: FragmentASTNode[],
            aliases: AliasASTNode[],
        ): BytesLike | undefined => {
            const source: BytesLike[] = []; 

            function errorCheck(node: FragmentASTNode): boolean {
                if (OpASTNode.is(node)) {
                    if (isNaN(node.operand) || isNaN(node.output)) return false;
                    else {
                        for (const param of node.parameters) {
                            if (!errorCheck(param)) return false;
                        }
                        return true;
                    }
                }
                else return true;
            }

            // check for errors
            for (let i = 0; i < nodes.length; i++) {
                if (!errorCheck(nodes[i])) return undefined;
            }
        
            // compile from parsed tree
            try {
                for (let i = 0; i < nodes.length; i++) {
                    const _node = nodes[i];
                    if (ValueASTNode.is(_node)) {
                        if (isBigNumberish(_node.value)) {
                            const _i = constants.findIndex(
                                v => BigNumber.from(_node.value).eq(v)
                            );
                            if (_i > -1) {
                                source.push(
                                    op(
                                        readMemoryIndex,
                                        memoryOperand(
                                            _i,
                                            MemoryType.Constant,
                                        )
                                    )
                                );
                            }
                            else {
                                source.push(
                                    op(
                                        readMemoryIndex,
                                        memoryOperand(constants.length, MemoryType.Constant)
                                    )
                                );
                                constants.push(_node.value);
                            }
                        }
                        else if (_rainDocument.isConstant(_node.value)) {
                            const _i = constants.findIndex(
                                v => BigNumber.from(_rainDocument.constants[_node.value]).eq(v)
                            );
                            if (_i > -1) {
                                source.push(
                                    op(
                                        readMemoryIndex,
                                        memoryOperand(_i, MemoryType.Constant)
                                    )
                                );
                            }
                            else {
                                source.push(
                                    op(
                                        readMemoryIndex,
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
                        if (_i > -1) source.push(
                            op(
                                readMemoryIndex,
                                memoryOperand(_i, MemoryType.Stack)
                            )
                        );
                        else {
                            const _extExp = exps.find(
                                v => v.name === _node.name
                            );
                            if (BoundExpression.isConstant(_extExp)) {
                                const _value = BigNumber.from(
                                    (_extExp?.doc?.ast.lines[0].nodes[0] as ValueASTNode).value
                                );
                                const _constIndex = constants.findIndex(v => _value.eq(v));
                                if (_constIndex > -1) source.push(
                                    op(
                                        readMemoryIndex,
                                        memoryOperand(
                                            _constIndex,
                                            MemoryType.Constant,
                                        )
                                    )
                                );
                                else {
                                    source.push(
                                        op(
                                            readMemoryIndex,
                                            memoryOperand(
                                                constants.length,
                                                MemoryType.Constant,
                                            )
                                        )
                                    );
                                    constants.push(_value.toString());
                                }
                            }
                            else throw new Error(`cannot find "${_node.name}"`);
                        }
                    }
                    else {
                        const _expConf = _compile(
                            _node.parameters,
                            aliases,
                        );
                        source.push(_expConf!);

                        let _ctx: ContextAlias | undefined;
                        const _index = opmeta.findIndex(
                            v => v.name === _node.opcode.name
                        );
                        if (_index >= _rainDocument.getOpMetaLength()) _ctx = 
                            _rainDocument.getContextAliases().find(
                                v => v.name === _node.opcode.name
                            );
                        source.push(
                            op(
                                _ctx ? opmeta.findIndex(v => v.name === "context") : _index, 
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
                return concat(source);
            }
            catch (_err) {
                console.log(_err);
                return undefined;
            }
        };

        for (let i = 0; i < nodes.length; i++) {
            const _exp = exps.find(v => v.name === nodes[i]);
            if (BoundExpression.isExpression(_exp) && _exp!.doc!.ast.lines?.length > 0) {
                const src = _compile(
                    _exp!.doc!.ast.lines.map((v: any) => v.nodes).flat(),
                    _exp!.doc!.ast.lines.map((v: any) => v.aliases).flat()
                );
                if (src) sources.push(src);
                else return Promise.reject(`cannot compile expression ${nodes[i]}`);
            }
        }

        return {
            constants, 
            sources: sources.map(v => hexlify(v, {allowMissingPrefix: true}))
        };

    }
    catch (err) {
        return Promise.reject(err);
    }
}

// const x = TextDocument.create("1", "1", 1, `@0xd919062443e39ea44967f9012d0c3060489e0e1eeda18deb74a5bd2557e65e69
// @0x10f97a047a9d287eb96c885188fbdcd3bf1a525a1b31270fc4f9f6a0bc9554a6
// /**
//  * This is test
//  */

// #my-exp
// _: add(1 2 sub(1 2) add(1 2)),

// #my-other-exp
// _: mul(3 4 calling-context<1>())`);
