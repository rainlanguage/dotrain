import { MetaStore } from "./metaStore";
import { RainDocument } from "./rainDocument";
import { Rainlang } from "../rainlang/rainlang";
import { rainlangc } from "../rainlang/rainlangCompiler";
import MagicString, { DecodedSourceMap } from "magic-string";
import { ExpressionConfig, Namespace, NamespaceNode, Position, PositionOffset } from "../rainLanguageTypes";
import { Binding, ASTNode, OpASTNode, TextDocument, ValueASTNode } from "../rainLanguageTypes";
import { namespaceSearch } from "../utils";


/**
 * @public
 * RainDocument (dotrain) compiler, compiles a text into valid ExpressionConfig (deployable bytes)
 *
 * @param text - The raw string to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export function dotrainc(
    text: string,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * RainDocument (dotrain) compiler, compiles Text Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param document - The TextDocument to compile
 * @param metaStore - (optional) MetaStore object
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function dotrainc(
    document: TextDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

/**
 * @public
 * RainDocument (dotrain) compiler, compiles Rain Documents into valid ExpressionConfig (deployable bytes)
 *
 * @param rainDocument - The RainDocument to compile
 * @param metaStore - (optional) MetaStore object to get merged with the RainDocument's MetaStore
 * @returns A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text
 */
export async function dotrainc(
    rainDocument: RainDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig>

export async function dotrainc(
    document: RainDocument | string | TextDocument,
    entrypoints: string[],
    metaStore?: MetaStore
): Promise<ExpressionConfig> {

    if (entrypoints.length === 0) return Promise.reject("no entrypoints specified");

    let _rainDoc: RainDocument;
    if (document instanceof RainDocument) {
        _rainDoc = document;
        if (metaStore) {
            _rainDoc.metaStore.updateStore(metaStore);
            await _rainDoc.parse();
        }
    }
    else {
        if (typeof document === "string") _rainDoc = await RainDocument.create(
            TextDocument.create("file", "rainlang", 1, document),
            metaStore
        );
        else _rainDoc = await RainDocument.create(document, metaStore);
    }
    try {
        const _nodes: {
            child: Namespace | NamespaceNode;
            parent: Namespace;
        }[] = [];
        const _nodeKeys: string[] = [...entrypoints];
        const _rdProblems = _rainDoc.getProblems();
        if (_rdProblems.length) return Promise.reject(_rdProblems.map(v => {
            return {
                msg: v.msg,
                position: _rainDoc.textDocument.positionAt(v.position[0]),
                code: v.code
            };
        }));
        const _opmeta = _rainDoc.getOpMeta();
        for (let i = 0; i < entrypoints.length; i++) {
            if (entrypoints[i].includes(".")) {
                try {
                    const _ns = namespaceSearch(entrypoints[i], _rainDoc.namespace);
                    if (!Namespace.isBinding(_ns.child)) return Promise.reject(
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
                        if (!_ns.child.Element.exp) _ns.child.Element.exp = new Rainlang(
                            _ns.child.Element.content,
                            _opmeta,
                            {
                                thisBinding: _ns.child.Element,
                                namespaces: _ns.parent
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
                        // return Promise.reject({
                        //     msg: _exp.Element.problems[0].msg,
                        //     position: _exp.ImportIndex === -1
                        //         ? _rainDoc.textDocument.positionAt(_exp.Element.namePosition[0])
                        //         : _rainDoc.textDocument.positionAt(
                        //             _rainDoc.imports[_exp.ImportIndex].hashPosition[0]
                        //         ),
                        //     code: _exp.Element.problems[0].code
                        // });
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
                        if ((_binding.Element as Binding).problems.length) return Promise.reject(
                            (_binding.Element as Binding).problems.map(v => {
                                return {
                                    msg: v.msg,
                                    position: _binding.ImportIndex === -1
                                        ? _rainDoc.textDocument.positionAt(v.position[0])
                                        : _rainDoc.textDocument.positionAt(
                                            _rainDoc.imports[
                                                _binding.ImportIndex as number
                                            ].hashPosition[0]
                                        ),
                                    code: v.code
                                };
                            })
                        );
                        _nodes.push({
                            child: _binding,
                            parent: _rainDoc.namespace
                        });
                        // return Promise.reject({
                        //     msg: (_exp.Element  as Binding).problems[0].msg,
                        //     position: _exp.ImportIndex === -1
                        //         ? _rainDoc.textDocument.positionAt(
                        //             (_exp.Element as Binding).namePosition[0]
                        //         )
                        //         : _rainDoc.textDocument.positionAt(
                        //             _rainDoc.imports[_exp.ImportIndex as number].hashPosition[0]
                        //         ),
                        //     code: (_exp.Element as Binding).problems[0].code
                        // });
                    }
                }
            }
        }
        // const _orgLen = _nodes.length;
        const _depsIndexes: number[][] = [];
        for (let i = 0; i < _nodes.length; i++) {
            const _d: number[] = [];
            const _deps = (_nodes[i].child.Element as Binding).dependencies;
            for (let j = 0; j < _deps.length; j++) {
                try {
                    const _ns = namespaceSearch(_deps[j], _nodes[i].parent);
                    if (!Namespace.isBinding(_ns.child)) return Promise.reject(
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
                        if (!_ns.child.Element.exp) _ns.child.Element.exp = new Rainlang(
                            _ns.child.Element.content,
                            _opmeta,
                            {
                                thisBinding: _ns.child.Element,
                                namespaces: _ns.parent
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
        // const _rdProblems = _rainDoc.getAllProblems();
        // if (_rdProblems.length) return Promise.reject(_rdProblems.map(v => {
        //     return {
        //         msg: v.msg,
        //         position: _rainDoc.textDocument.positionAt(v.position[0]),
        //         code: v.code
        //     };
        // }));

        // handle the order of expressions required for final text
        // const _nodes: string[] = [...entrypoints];
        // const _deps = _rainDoc.getDependencies();
        // for (let i = 0; i < _nodeKeys.length; i++) {
        //     if (_nodeKeys[i].includes(".")) {

        //     }
        //     else {

        //     }
        //     _deps.forEach(v => {
        //         if (v[0] === _nodeKeys[i] && !_nodeKeys.includes(v[1])) _nodeKeys.push(v[1]);
        //     });
        // }

        // Finds replacements and generated sourcemap and new text
        const _buildSourcemap = (
            nodes: ASTNode[], 
            sourcemapGenerator: MagicString, 
            depsIndexes: number[]
        ) => {
            for (let i = 0; i < nodes.length; i++) {
                const _node = nodes[i];
                if (ValueASTNode.is(_node) && _node.id) {
                    sourcemapGenerator.update(
                        _node.position[0],
                        _node.position[1] + 1,
                        _node.value
                    );
                }
                else if (OpASTNode.is(_node)) {
                    // const _contextOpcode = _rainDoc.getContextAliases().find(
                    //     v => v.name === _node.opcode.name
                    // );
                    
                    const _contextOpcode = _node.isCtx;
                    const _quotes = _node.operandArgs?.args.filter(
                        v => v.value.match(/^'\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/)
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
                        // if (isNaN(_contextOpcode.row)) {
                        //     sourcemapGenerator.appendLeft(
                        //         _node.opcode.position[1] + 2,
                        //         _contextOpcode.column.toString() + " "
                        //     );
                        // }
                        // else {
                        //     sourcemapGenerator.appendLeft(
                        //         _node.opcode.position[1] + 1,
                        //         "<"
                        //         + _contextOpcode.column.toString()
                        //         + " "
                        //         + _contextOpcode.row.toString()
                        //         + ">"
                        //     );
                        // }
                    }
                    else {
                        if (_node.opcode.name.includes(".")) {
                            const _name = _node.opcode.name.slice(
                                _node.opcode.name.lastIndexOf(".") + 1
                            );
                            const _op = _opmeta.find(
                                v => v.name === _name || v.aliases?.includes(_name)
                            )?.name;
                            if (_op) sourcemapGenerator.update(
                                _node.opcode.position[0],
                                _node.opcode.position[1] + 1,
                                _op
                            );
                            else throw "cannot find a match for specified opcode: " + _node.opcode.name;
                        }
                    }
                    if (_quotes && _quotes.length) {
                        if (!depsIndexes.length) throw "cannot resolve dependecies";
                        for (let j = 0; j < _quotes.length; j++) {
                            // const _index = _nodeKeys.indexOf(_quotes[j].value).toString();
                            sourcemapGenerator.update(
                                _quotes[j].position[0],
                                _quotes[j].position[1] + 1,
                                depsIndexes.unshift().toString()
                            );
                        }
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
            exp: Binding;
            originalText: string;
            generatedText: string;
            sourcemap: DecodedSourceMap;
            offset: number;
        }[] = [];
        for (let i = 0; i < _nodes.length; i++) {
            // const _exp = _rainDoc.bindings.find(v => v.name === _nodeKeys[i])!;
            const _b = _nodes[i].child.Element as Binding;
            const _smGenerator = new MagicString(_b.content);
            _buildSourcemap(
                _b.exp!.getAst().map(v => v.lines.map(e => e.nodes)).flat().flat(), 
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
                //     (_sourcemap.at(-1) 
                //         ? _sourcemap.at(-1)!.offset[0] + 
                //         _sourcemap.at(-1)!.generatedText.length + 2
                //         : 0) + _generatedText.length - 1,
                // ]
            });
        }

        const _generatedRainlang = new Rainlang(
            _sourcemaps.map(v => v.generatedText).join("\n"),
            _opmeta
        );
        const _genRainlangProblems = _generatedRainlang.getProblems();

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

                    const _offsets: PositionOffset = [
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
        else return await rainlangc(_generatedRainlang);
    }
    catch (err) {
        return Promise.reject(err);
    }
}

// const x = `@ opmeta 0xe4c000f3728f30e612b34e401529ce5266061cc1233dc54a6a89524929571d8f
// @ contmeta 0x56ffc3fc82109c33f1e1544157a70144fc15e7c6e9ae9c65a636fd165b1bc51c 'calling-context new-na

// #row
// 1

// #main
// _: add(1 2 sub(1 2)),
// _: mul(3 4 .opmeta.add(1 2) contmeta.new-na<1>());`;

// dotrainc(x, ["main"]).then(v => console.log(v)).catch(v => console.log(v));