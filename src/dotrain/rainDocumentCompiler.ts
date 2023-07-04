import { MetaStore } from "./metaStore";
import { RainDocument } from "./rainDocument";
import { Rainlang } from "../rainlang/rainlang";
import { rainlangc } from "../rainlang/rainlangCompiler";
import MagicString, { DecodedSourceMap } from "magic-string";
import { ExpressionConfig, Position, PositionOffset, WORD_PATTERN } from "../rainLanguageTypes";
import { NamedExpression, ASTNode, OpASTNode, TextDocument, ValueASTNode } from "../rainLanguageTypes";


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
        const _opmeta = _rainDoc.getOpMeta();
        const _rdProblems = _rainDoc.getAllProblems();

        for (let i = 0; i < entrypoints.length; i++) {
            const _exp = _rainDoc.expressions.find(
                v => v.name === entrypoints[i]
            );
            if (!_exp) return Promise.reject(`undefined expression: ${entrypoints[i]}`);
            else {
                if (_rainDoc.constants[entrypoints[i]] !== undefined) return Promise.reject(
                    `invalid entrypoint: ${entrypoints[i]}, constants cannot be entrypoint/source`
                );
            }
        }
        if (_rdProblems.length) return Promise.reject(_rdProblems.map(v => {
            return {
                msg: v.msg,
                position: _rainDoc.textDocument.positionAt(v.position[0]),
                code: v.code
            };
        }));

        // handle the order of expressions required for final text
        const _nodes: string[] = [...entrypoints];
        const _deps = _rainDoc.getDependencies();
        for (let i = 0; i < _nodes.length; i++) {
            _deps.forEach(v => {
                if (v[0] === _nodes[i] && !_nodes.includes(v[1])) _nodes.push(v[1]);
            });
        }

        // Finds replacements and generated sourcemap and new text
        const _buildSourcemap = (nodes: ASTNode[], sourcemapGenerator: MagicString) => {
            for (let i = 0; i < nodes.length; i++) {
                const _node = nodes[i];
                if (ValueASTNode.is(_node) && _node.value.match(WORD_PATTERN)) {
                    sourcemapGenerator.update(
                        _node.position[0],
                        _node.position[1] + 1,
                        _rainDoc.constants[_node.value]
                    );
                }
                else if (OpASTNode.is(_node)) {
                    const _contextOpcode = _rainDoc.getContextAliases().find(
                        v => v.name === _node.opcode.name
                    );
                    const _quotes = _node.operandArgs?.args.filter(
                        v => v.value.match(/^[a-z][a-z0-9-]*$/)
                    );
                    if (_contextOpcode) {
                        sourcemapGenerator.update(
                            _node.opcode.position[0],
                            _node.opcode.position[1] + 1,
                            "context"
                        );
                        if (isNaN(_contextOpcode.row)) {
                            sourcemapGenerator.appendLeft(
                                _node.opcode.position[1] + 2,
                                _contextOpcode.column.toString() + " "
                            );
                        }
                        else {
                            sourcemapGenerator.appendLeft(
                                _node.opcode.position[1] + 1,
                                "<"
                                + _contextOpcode.column.toString()
                                + " "
                                + _contextOpcode.row.toString()
                                + ">"
                            );
                        }
                    }
                    if (_quotes && _quotes.length) {
                        for (let j = 0; j < _quotes.length; j++) {
                            const _index = _nodes.indexOf(_quotes[j].value).toString();
                            sourcemapGenerator.update(
                                _quotes[j].position[0],
                                _quotes[j].position[1] + 1,
                                _index
                            );
                        }
                    }
                    if (_node.parameters.length > 0) {
                        _buildSourcemap(_node.parameters, sourcemapGenerator);
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
            exp: NamedExpression;
            originalText: string;
            generatedText: string;
            sourcemap: DecodedSourceMap;
            offset: number;
        }[] = [];
        for (let i = 0; i < _nodes.length; i++) {
            const _exp = _rainDoc.expressions.find(v => v.name === _nodes[i])!;
            const _smGenerator = new MagicString(_exp.content);
            _buildSourcemap(
                _exp.rainlang!.getAst().map(v => v.lines.map(e => e.nodes)).flat().flat(), 
                _smGenerator
            );
            _sourcemaps.push({
                exp: _exp,
                originalText: _exp.content,
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
                const _sm = _sourcemaps.find(v => 
                    v.offset <= _genRainlangProblems[i].position[0] && 
                    v.offset + v.generatedText.length - 1 >= _genRainlangProblems[i].position[1]
                )!;
                const _genTD = TextDocument.create("v", "rainlang", 0, _sm.generatedText);
                const _orgTD = TextDocument.create("v", "rainlang", 0, _sm.originalText);

                const _offsets: PositionOffset = [
                    _genRainlangProblems[i].position[0] - _sm.offset,
                    _genRainlangProblems[i].position[1] - _sm.offset
                ];
                const _sGenPos = _genTD.positionAt(_offsets[0]);
                // const _eGenPos = _gentd.positionAt(_offsets[1] + 1);
                const _sOrgPos = _findOrgPosition(
                    _sm.sourcemap, _sGenPos.line, _sGenPos.character
                );
                // const _eOrgPos = findOriginalPosition(
                //     _sp.sourcemap, _eGenPos.line, _eGenPos.character
                // );
                _problems.push({
                    msg: _genRainlangProblems[i].msg,
                    position: 
                    // [
                        _rainDoc.textDocument.positionAt(
                            _sm.exp.contentPosition[0] + _orgTD.offsetAt(_sOrgPos)
                        ),
                    //     _sp.exp.contentPosition[0] + _orgtd.offsetAt(_eOrgPos) - 1
                    // ],
                    code: _genRainlangProblems[i].code,
                });
            }
            return Promise.reject(_problems);
        }
        else return await rainlangc(_generatedRainlang);
    }
    catch (err) {
        return Promise.reject(err);
    }
}
