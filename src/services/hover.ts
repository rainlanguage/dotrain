import { ASTNode } from "../rainLanguageTypes";
// import { MetaStore } from "../dotrain/metaStore";
import { RainDocument } from "../dotrain/rainDocument";
// import { ContractMetaSchema, MAGIC_NUMBERS, OpMetaSchema, metaFromBytes, toOpMeta } from "@rainprotocol/meta";
import { LanguageServiceParams, MarkupKind, TextDocument, Position, Hover, Range } from "../rainLanguageTypes";


/**
 * @public Provides hover items
 * 
 * @param document - The TextDocuemnt
 * @param position - Position of the textDocument to get the completion items for
 * @param setting - (optional) Language service params
 * @returns Promise of hover item and null if no item was available for that position
 */
export async function getRainlangHover(
    document: TextDocument,
    position: Position,
    setting?: LanguageServiceParams
): Promise<Hover | null>

/**
 * @public Provides hover items
 * 
 * @param document - The RainDocument object instance
 * @param position - Position of the textDocument to get the completion items for
 * @param setting - (optional) Language service params
 * @returns Promise of hover item and null if no item was available for that position
 */
export async function getRainlangHover(
    document: RainDocument,
    position: Position,
    setting?: LanguageServiceParams
): Promise<Hover | null>

export async function getRainlangHover(
    document: RainDocument | TextDocument,
    position: Position,
    setting?: LanguageServiceParams 
): Promise<Hover | null> {
    let _contentType: MarkupKind = "plaintext";
    let _rd: RainDocument;
    let _td: TextDocument;
    if (document instanceof RainDocument) {
        _rd = document;
        _td = _rd.textDocument;
        if (setting?.metaStore) _rd.metaStore.updateStore(setting.metaStore);
    }
    else {
        _td = document;
        _rd = await RainDocument.create(document, setting?.metaStore);
    }
    const format = setting
        ?.clientCapabilities
        ?.textDocument
        ?.completion
        ?.completionItem
        ?.documentationFormat;
    if (format && format[0]) _contentType = format[0];
    
    let _targetOffset = _td.offsetAt(position);
    const search = async(nodes: ASTNode[], offset: number): Promise<Hover | null> => {
        for (let i = 0; i < nodes.length; i++) {
            const _n = nodes[i];
            if (
                _n.position[0] <= _targetOffset && 
                _n.position[1] >= _targetOffset
            ) {
                if ("opcode" in _n) {
                    if (
                        _n.parens[0] < _targetOffset && 
                        _n.parens[1] > _targetOffset
                    ) return search(_n.parameters, offset);
                    else {
                        if (
                            _n.operandArgs && 
                            _n.operandArgs.position[0] < _targetOffset && 
                            _n.operandArgs.position[1] > _targetOffset
                        ) {
                            for (const _operandArg of _n.operandArgs.args) {
                                if (
                                    _operandArg.position[0] <= _targetOffset && 
                                    _operandArg.position[1] >= _targetOffset
                                ) return {
                                    range: Range.create(
                                        _td.positionAt(_operandArg.position[0] + offset), 
                                        _td.positionAt(_operandArg.position[1] + offset + 1)
                                    ),
                                    contents: {
                                        kind: _contentType,
                                        value: [
                                            _operandArg.name,
                                            _operandArg.description 
                                                ? _operandArg.description 
                                                : "Operand Argument"
                                        ].join(_contentType === "markdown" ? "\n\n" : ", ")
                                    }
                                } as Hover;
                            }
                            return null;
                        }
                        else return {
                            range: Range.create(
                                _td.positionAt(_n.opcode.position[0] + offset), 
                                _td.positionAt(_n.parens[1] + offset + 1)
                            ),
                            contents: {
                                kind: _contentType,
                                value: _n.opcode.description
                            }
                        } as Hover;
                    }
                }
                else if ("value" in _n) {
                    return {
                        range: Range.create(
                            _td.positionAt(_n.position[0] + offset), 
                            _td.positionAt(_n.position[1] + offset + 1)
                        ),
                        contents: {
                            kind: _contentType,
                            value: _n.id ? _n.value : "Value"
                        }
                    } as Hover;
                }
                else return {
                    range: Range.create(
                        _td.positionAt(_n.position[0] + offset), 
                        _td.positionAt(_n.position[1] + offset + 1)
                    ),
                    contents: {
                        kind: _contentType,
                        value: "Stack Alias"
                    }
                } as Hover;
            }
            else if (_n.lhsAlias) {
                const _lhs = _n.lhsAlias;
                for (let j = 0; j < _lhs.length; j++) {
                    if (
                        _lhs[j].position[0] <= _targetOffset && 
                        _lhs[j].position[1] >= _targetOffset
                    ) {
                        const _opener = _lhs[j].name === "_" ? "placeholder" : "alias";
                        return {
                            range: Range.create(
                                _td.positionAt(_lhs[j].position[0] + offset),
                                _td.positionAt(_lhs[j].position[1] + offset + 1),
                            ),
                            contents: {
                                kind: _contentType,
                                value: "opcode" in _n 
                                    ? _contentType === "markdown"
                                        ? [
                                            `${_opener} for:`, 
                                            "```rainlang",
                                            _td.getText(
                                                Range.create(
                                                    _td.positionAt(_n.position[0] + offset),
                                                    _td.positionAt(_n.position[1] + offset + 1)
                                                )
                                            ),
                                            "```"
                                        ].join("\n")
                                        : `${_opener} for: ${
                                            _td.getText(Range.create(
                                                _td.positionAt(_n.position[0] + offset),
                                                _td.positionAt(_n.position[1] + offset + 1)
                                            ))
                                        }`
                                    : "value" in _n
                                        ? _contentType === "markdown"
                                            ? [
                                                `${_opener} for:`,
                                                "```rainlang",
                                                _n.value,
                                                "```"
                                            ].join("\n")
                                            : `${_opener} for: ${
                                                _n.value
                                            }`
                                        : _contentType === "markdown"
                                            ? [
                                                `${_opener} for:`,
                                                "```rainlang",
                                                _n.name,
                                                "```"
                                            ].join("\n")
                                            : `${_opener} for alias: ${
                                                _n.name
                                            }`
                            }
                        } as Hover;
                    }
                }
            }
        }
        return null;
    };
    try {
        const _hash = _rd.imports.find(
            v => v.position[0] <= _targetOffset && v.position[1] >= _targetOffset
        );
        // const _index = _rd.getImports().findIndex(
        //     v => v.position[0] <= _targetOffset && v.position[1] >= _targetOffset
        // );
        if (_hash && _hash.sequence && Object.keys(_hash.sequence).length) return {
            range: Range.create(
                _td.positionAt(_hash.position[0]),
                _td.positionAt(_hash.position[1] + 1)
            ),
            contents: {
                kind: _contentType,
                value: `this import contains:${
                    _hash.sequence.opmeta ? " -OpMeta" : ""
                }${
                    _hash.sequence.ctxmeta ? " -ContractMeta" : ""
                }${
                    _hash.sequence.dotrain ? " -DotRain" : ""
                }`
                // (await buildMetaInfo(_hash.hash, _rd.metaStore)) 
                // + (
                //     _index > -1 && _rd.getOpMetaImportIndex() === _index
                //         ? "\n\nActive Op Meta"
                //         : ""
                // )
            }
        };
        else {
            const _currentExp = _rd.bindings.find(v =>
                v.position[0] <= _targetOffset && v.position[1] >= _targetOffset
            );
            if (_currentExp) {
                _targetOffset -= _currentExp.contentPosition[0];
                return search(
                    _currentExp?.exp?.ast.find(v => 
                        v.position[0] <= _targetOffset &&
                        v.position[1] >= _targetOffset
                    )?.lines.map(v => v.nodes).flat() ?? [],
                    _currentExp.contentPosition[0]
                );
            }
            else return null;
        }
    }
    catch (err) {
        console.log(err);
        return null;
    }
}

// /**
//  * @public Build a general info from a meta content (used as hover info for a meta hash)
//  * @param hash - The meta hash to build info from
//  * @param metaStore - The meta store instance that keeps this hash as record
//  * @returns A promise that resolves with general info about the meta
//  */
// async function buildMetaInfo(hash: string, metaStore: MetaStore): Promise<string> {
//     const _metaRecord = metaStore.getRecord(hash);
//     let _opmeta;
//     let _contmeta;
//     let _dotrain;
//     const _opMetaContent = _metaRecord?.sequence.find(v => v.magicNumber === MAGIC_NUMBERS.OPS_META_V1)?.content;
//     if (_opMetaContent) {
//         try {
//             _opmeta = toOpMeta(metaFromBytes(_opMetaContent));
//         }
//         catch {}
//     }
    
//     const _contMeta = metaStore.getContractMeta(hash);
//     if (!_opMeta && !_contMeta) return "Unfortunately, could not find any info about this meta";
//     else {
//         const info = ["This Rain metadata consists of:"];
//         if (_opMeta) info.push(`- Op metadata with ${
//             (() => {
//                 try {
//                     return metaFromBytes(_opMeta, OpMetaSchema).length.toString() + " opcodes";
//                 }
//                 catch {
//                     return "unknown number of opcodes";
//                 }
//             })()
//         }`);
//         if (_contMeta) info.push(`- ${
//             (() => {
//                 try {
//                     return metaFromBytes(_contMeta, ContractMetaSchema).name;
//                 }
//                 catch {
//                     return "unknown";
//                 }
//             })()
//         } contract metadata`);
//         return info.join("\n");
//     }
// }