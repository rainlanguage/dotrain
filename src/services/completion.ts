import { exclusiveParse } from "../utils";
import { RainDocument } from "../parser/rainDocument";
import { 
    AST, 
    Range, 
    Position,
    MarkupKind,  
    TextDocument, 
    WORD_PATTERN, 
    CompletionItem, 
    CompletionItemKind, 
    LanguageServiceParams, 
} from "../languageTypes";


function findNamespaceMach(
    name: string, 
    namespace: AST.Namespace
): [string, (AST.Namespace | AST.NamespaceNode)][] | undefined {
    let _ns: any = namespace;
    const _names = exclusiveParse(name, /\./gd, undefined, true);
    if (name.startsWith(".")) _names.shift();
    const _last = _names.pop();
    if (!_names.every(v => WORD_PATTERN.test(v[0]))) return undefined;
    if (_last?.[0] && !WORD_PATTERN.test(_last[0])) return undefined;
    for (let i = 0; i < _names.length; i++) {
        if (_ns[_names[i][0]]) {
            _ns = _ns[_names[i][0]];
        }
        else return undefined;
    }
    let _result = Object.entries(_ns).filter(v => !/^[EIHW]/.test(v[0]) );
    if (_last?.[0]) _result = _result.filter(v => v[0].includes(_last[0]));
    return _result as [string, (AST.Namespace | AST.NamespaceNode)][];
}

/**
 * @public Provides completion items 
 * 
 * @param document - The TextDocuemnt
 * @param position - Position of the textDocument to get the completion items for
 * @param setting - (optional) Language service params
 * @returns A promise that resolves with Completion items or null if no completion 
 * items were available for that position
 */
export async function getCompletion(
    document: TextDocument, 
    position: Position,
    setting?: LanguageServiceParams
): Promise<CompletionItem[] | null>

/**
 * @public Provides completion items
 * 
 * @param document - The RainDocument object instance
 * @param position - Position of the textDocument to get the completion items for
 * @param setting - (optional) Language service params
  * @returns A promise that resolves with Completion items or null if no completion 
 * items were available for that position
 */
export async function getCompletion(
    document: RainDocument, 
    position: Position,
    setting?: LanguageServiceParams
): Promise<CompletionItem[] | null>

export async function getCompletion(
    document: TextDocument | RainDocument,
    position: Position,
    setting?: LanguageServiceParams 
): Promise<CompletionItem[] | null> {
    const _triggers = /[a-zA-Z0-9-.']/;
    const _triggersPath = /[a-zA-Z0-9-.'\\/]/;
    let _documentionType: MarkupKind = "plaintext";
    let _rd: RainDocument;
    let _td: TextDocument;
    if (document instanceof RainDocument) {
        _rd = document;
        _td = _rd.textDocument;
        if (setting?.metaStore && _rd.metaStore !== setting.metaStore) {
            _rd.metaStore.update(setting.metaStore);
            await _rd.parse();
        }
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
    if (format && format[0]) _documentionType = format[0];

    const _targetOffset = _td.offsetAt(position);
    try {
        const _import = _rd.imports.find(
            v => v.position[0] <= _targetOffset && v.position[1] + 1 >= _targetOffset
        );
        if (_import) {
            let _result: CompletionItem[] = [];
            const _preText = _td.getText(
                Range.create(_td.positionAt(_import.position[0]), position)
            );
            let _prefix = "";
            for (let i = 0; i < _preText.length; i++) {
                if (_triggers.test(_preText[_preText.length - i - 1])) {
                    _prefix = _preText[_preText.length - i - 1] + _prefix;
                }
                else break;
            }
            if (/^@\s*([^\s@#]*\s+)?(0x[a-fA-F0-9]*)$/.test(_preText)) {
                _result = Object.keys(_rd.metaStore.getCache()).map(v => ({
                    label: v.slice(1),
                    labelDetails: {
                        description: "meta"
                    },
                    kind: CompletionItemKind.Module,
                    detail: `meta hash: ${v}`,
                    insertText: v
                }));
                if (/0x[a-fA-F0-9]+/.test(_prefix)) _result = _result.filter(
                    v => v.insertText!.toLowerCase().includes(_prefix.toLowerCase())
                );
            }
            else if (/^@\s*([^\s@#]*\s+)?\//.test(_preText)) {
                _prefix = "";
                for (let i = 0; i < _preText.length; i++) {
                    if (_triggersPath.test(_preText[_preText.length - i - 1])) {
                        _prefix = _preText[_preText.length - i - 1] + _prefix;
                    }
                    else break;
                }
                _result = Object.entries(_rd.metaStore.dotrainCache).map(v => ({
                    label: v[0],
                    labelDetails: {
                        description: "rain document"
                    },
                    kind: CompletionItemKind.File,
                    detail: `rain document at ${v[0]}`,
                    insertText: v[1]
                })).filter(
                    v => v.label!.includes(_prefix.toLowerCase())
                );
            }
            else {
                const _reconf = _import.reconfigs?.find(v => v[0][1][1] + 1 === _targetOffset);
                if (_reconf && !_prefix.includes(".")) {
                    if (_import.sequence?.dotrain) Object.entries(
                        _import.sequence.dotrain.namespace
                    ).forEach(v => {
                        if (!("Element" in v[1])) _result.unshift({
                            label: v[0],
                            labelDetails: {
                                description: "namespace"
                            },
                            kind: CompletionItemKind.Field,
                            detail: `namespace: ${v[0]}`,
                            insertText: v[0]
                        });
                        else {
                            if ("column" in v[1].Element) {
                                const _following = isNaN(v[1].Element.row as number)
                                    ? "<>()" : "()";
                                _result.unshift({
                                    label: v[0],
                                    labelDetails: {
                                        detail: _following,
                                        description: "context alias opcode"
                                    },
                                    kind: CompletionItemKind.Function,
                                    detail: "context alias opcode: " + v[0] + (
                                        _following === "<>()"
                                            ? `<>() with column index ${v[1].Element.column}` 
                                            : `() with column index ${
                                                v[1].Element.column
                                            } and row index ${v[1].Element.row}`
                                    ),
                                    documentation: {
                                        kind: _documentionType,
                                        value: v[1].Element.description as string,
                                    },
                                    insertText: v[0] + _following
                                });
                            }
                            else if ("content" in v[1].Element) {
                                const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
                                    : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
                                    : [
                                        "expression", 
                                        _documentionType === "markdown" ? [
                                            "```rainlang",
                                            (v[1].Element.content as string).trim(),
                                            "```"
                                        ].join("\n") 
                                        : v[1].Element.content
                                    ];
                                if (_t[0] === "expression") _result.unshift({
                                    label: v[0],
                                    labelDetails: {
                                        description: "binding"
                                    },
                                    kind: CompletionItemKind.Class,
                                    detail: _t[0] + " binding: " + v[0],
                                    documentation: {
                                        kind: _documentionType,
                                        value: (_t[1] as string).trim()
                                    },
                                    insertText: v[0]
                                });
                            }
                        }
                    });
                    if (_import.sequence?.ctxmeta) _result.push(
                        ..._import.sequence.ctxmeta.map(v => {
                            const _following = isNaN(v.row) ? "<>()" : "()";
                            return {
                                label: v.name,
                                labelDetails: {
                                    detail: _following,
                                    description: "context alias opcode"
                                },
                                kind: CompletionItemKind.Function,
                                detail: "context alias opcode: " + v.name + (
                                    _following === "<>()"
                                        ? `<>() with column index ${v.column}` 
                                        : `() with column index ${
                                            v.column
                                        } and row index ${v.row}`
                                ),
                                documentation: {
                                    kind: _documentionType,
                                    value: v.description as string,
                                },
                                insertText: v.name + _following
                            };
                        })
                    );
                    // _result = _result.filter(v => v.label.includes(_prefix));
                }
            }
            return _result;
        }
        else if (
            !_triggers.test(_td.getText(
                Range.create(
                    position, 
                    { line: position.line, character: position.character + 1 }
                )
            ))
        ) {
            let _prefix = "";
            const _preText = _td.getText(
                Range.create(Position.create(position.line, 0), position)
            );
            for (let i = 0; i < _preText.length; i++) {
                if (_triggers.test(_preText[_preText.length - i - 1])) {
                    _prefix = _preText[_preText.length - i - 1] + _prefix;
                }
                else break;
            }
            const _isQuote = _prefix.startsWith("'");
            if (_isQuote) _prefix = _prefix.slice(1);
            if (/^'?(\.?[a-z][0-9a-z-]*)*\.?$/.test(_prefix)) {
                const _offset = _td.offsetAt(position);
                if (_prefix.includes(".")) {
                    const _match = findNamespaceMach(_prefix, _rd.namespace);
                    if (_match !== undefined) return _match.map(v => {
                        if (!("Element" in v[1])) return {
                            label: v[0],
                            labelDetails: {
                                description: "namespace"
                            },
                            kind: CompletionItemKind.Field,
                            detail: `namespace: ${v[0]}`,
                            insertText: v[0]
                        };
                        else {
                            if ("column" in v[1].Element) {
                                const _following = isNaN(v[1].Element.row as number)
                                    ? "<>()" : "()";
                                return {
                                    label: v[0],
                                    labelDetails: {
                                        detail: _following,
                                        description: "context alias opcode"
                                    },
                                    kind: CompletionItemKind.Function,
                                    detail: "context alias opcode: " + v[0] + (
                                        _following === "<>()"
                                            ? `<>() with column index ${v[1].Element.column}` 
                                            : `() with column index ${
                                                v[1].Element.column
                                            } and row index ${v[1].Element.row}`
                                    ),
                                    documentation: {
                                        kind: _documentionType,
                                        value: v[1].Element.description as string,
                                    },
                                    insertText: v[0] + _following
                                };
                            }
                            else if ("word" in v[1].Element) {
                                // const _following = v[1].Element.operand === 0 
                                //     ? "()" 
                                //     : (v[1].Element.operand as any).find(
                                //         (i: any) => i.name !== "inputs"
                                //     ) ? "<>()" : "()";
                                return {
                                    label: v[0],
                                    labelDetails: {
                                        // detail: _following,
                                        description: "opcode"
                                    },
                                    kind: CompletionItemKind.Function,
                                    detail: "opcode: " + v[0],
                                    documentation: {
                                        kind: _documentionType,
                                        value: v[1].Element.description as string
                                    },
                                    insertText: v[0]
                                };
                            }
                            else if ("content" in v[1].Element) {
                                const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
                                    : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
                                    : [
                                        "expression", 
                                        _documentionType === "markdown" ? [
                                            "```rainlang",
                                            (v[1].Element.content as string).trim(),
                                            "```"
                                        ].join("\n") 
                                        : v[1].Element.content
                                    ];
                                return {
                                    label: v[0],
                                    labelDetails: {
                                        description: "binding"
                                    },
                                    kind: CompletionItemKind.Class,
                                    detail: _t[0] + " binding: " + v[0],
                                    documentation: {
                                        kind: _documentionType,
                                        value: (_t[1] as string).trim()
                                    },
                                    insertText: v[0]
                                };
                            }
                            else return null;
                        }
                    }).filter(v => {
                        if (v !== null) {
                            if (_isQuote) {
                                if (v.kind === CompletionItemKind.Class) {
                                    if (v.detail.includes("expression binding: ")) return true;
                                    else return false;
                                }
                                else if (v.kind === CompletionItemKind.Field) return true;
                                else return false;
                            }
                            else return true;
                        }
                        else return false;
                    }) as CompletionItem[];
                    else return null;
                }
                else {
                    const _result: CompletionItem[] = [];
                    if (!_isQuote) {
                        _result.push(..._rd.authoringMeta.filter(
                            v => v.word.includes(_prefix)
                        ).flatMap(v => {
                            // const _following = v.operand === 0 
                            //     ? "()" 
                            //     : v.operand.find(i => i.name !== "inputs") 
                            //         ? "<>()" 
                            //         : "()";
                            const _names: string[] = [];
                            if (v.word.includes(_prefix)) _names.push(v.word);
                            // if (v.aliases) v.aliases.forEach(e => {
                            //     if (e.includes(_prefix)) _names.push(e);
                            // });
                            return _names.map(e => {
                                return {
                                    label: e,
                                    labelDetails: {
                                        // detail: _following,
                                        description: "opcode"
                                    },
                                    kind: CompletionItemKind.Function,
                                    detail: "opcode: " + e,
                                    documentation: {
                                        kind: _documentionType,
                                        value: v.description
                                    },
                                    insertText: e
                                } as CompletionItem;
                            });
                        }));
                        Object.keys(_rd.constants).filter(
                            v => v.includes(_prefix)
                        ).forEach(v => {
                            _result.unshift({
                                label: v,
                                labelDetails: {
                                    description: "reserved constant alias"
                                },
                                kind: CompletionItemKind.Constant,
                                detail: "reserved constant alias: " + v,
                                documentation: {
                                    kind: _documentionType,
                                    value: `value: ${_rd.constants[v]}`
                                },
                                insertText: v
                            });
                        });
                    }
                    Object.entries(_rd.namespace).filter(
                        v => v[0].includes(_prefix)
                    ).forEach(v => {
                        if (!("Element" in v[1])) {
                            if (!_isQuote) _result.unshift({
                                label: v[0],
                                labelDetails: {
                                    description: "namespace"
                                },
                                kind: CompletionItemKind.Field,
                                detail: `namespace: ${v[0]}`,
                                insertText: v[0]
                            });
                        }
                        else {
                            if ("column" in v[1].Element) {
                                if (!_isQuote) {
                                    const _following = isNaN(v[1].Element.row as number)
                                        ? "<>()" : "()";
                                    _result.unshift({
                                        label: v[0],
                                        labelDetails: {
                                            detail: _following,
                                            description: "context alias opcode"
                                        },
                                        kind: CompletionItemKind.Function,
                                        detail: "context alias opcode: " + v[0] + (
                                            _following === "<>()"
                                                ? `<>() with column index ${v[1].Element.column}` 
                                                : `() with column index ${
                                                    v[1].Element.column
                                                } and row index ${v[1].Element.row}`
                                        ),
                                        documentation: {
                                            kind: _documentionType,
                                            value: v[1].Element.description as string,
                                        },
                                        insertText: v[0] + _following
                                    });
                                }
                            }
                            else if ("word" in v[1].Element) {
                                if (!_isQuote) {
                                    if (!_result.find(e => e.label === v[0])) {
                                        // const _following = v[1].Element.operand === 0 
                                        //     ? "()" 
                                        //     : (v[1].Element.operand as any).find(
                                        //         (i: any) => i.name !== "inputs"
                                        //     ) ? "<>()" : "()";
                                        _result.unshift({
                                            label: v[0],
                                            labelDetails: {
                                                // detail: _following,
                                                description: "opcode"
                                            },
                                            kind: CompletionItemKind.Function,
                                            detail: "opcode: " + v[0],
                                            documentation: {
                                                kind: _documentionType,
                                                value: v[1].Element.description as string
                                            },
                                            insertText: v[0]
                                        });
                                    }
                                }
                            }
                            else if ("content" in v[1].Element) {
                                const _t = v[1].Element.elided !== undefined ? ["elided", v[1].Element.elided]
                                    : v[1].Element.constant !== undefined ? ["constant", v[1].Element.constant]
                                    : [
                                        "expression", 
                                        _documentionType === "markdown" ? [
                                            "```rainlang",
                                            (v[1].Element.content as string).trim(),
                                            "```"
                                        ].join("\n") 
                                        : v[1].Element.content
                                    ];
                                if (!_isQuote || _t[0] === "expression") _result.unshift({
                                    label: v[0],
                                    labelDetails: {
                                        description: "binding"
                                    },
                                    kind: CompletionItemKind.Class,
                                    detail: _t[0] + " binding: " + v[0],
                                    documentation: {
                                        kind: _documentionType,
                                        value: (_t[1] as string).trim()
                                    },
                                    insertText: v[0]
                                });
                            }
                        }
                    });
                    if (!_isQuote) {
                        const _binding = _rd.bindings.find(
                            v => v.contentPosition[0] <= _offset && 
                            v.contentPosition[1] + 1 >= _offset
                        );
                        if (_binding) {
                            const _src = _binding.exp?.ast.find(v => 
                                v.position[0] + _binding.contentPosition[0] <= _offset &&
                                v.position[1] + _binding.contentPosition[0] + 1 >= _offset
                            );
                            let _isAtRHS = true;
                            const _offsetPos = _td.positionAt(_offset);
                            if (_src) _result.unshift(
                                ..._src.lines.filter(v => 
                                    v.position[1] + _binding.contentPosition[0] + 1 <= _offset
                                ).flatMap((v, i, a) => {
                                    if (i === a.length - 1) _isAtRHS = _td.getText(
                                        Range.create(
                                            _td.positionAt(v.position[0]),
                                            _offsetPos
                                        )
                                    ).includes(":");
                                    return v.aliases;
                                }).filter(
                                    v => _isAtRHS && 
                                        v.name !== "_" && 
                                        v.name.includes(_prefix)
                                ).map(v => ({
                                    label: v.name,
                                    labelDetails: {
                                        description: "stack alias"
                                    },
                                    kind: CompletionItemKind.Variable,
                                    detail: "stack alias: " + v.name,
                                    documentation: {
                                        kind: _documentionType,
                                        value: "stack alias"
                                    },
                                    insertText: v.name
                                }))
                            );
                        //     if (_src) _src.lines
                        //         .flatMap(v => v.aliases)
                        //         .filter(v => v.name.includes(_prefix))
                        //         .forEach(v => {
                        //             let _text = "";
                        //             const _pos = _src.lines
                        //                 .flatMap(e => e.nodes)
                        //                 .find(e => {
                        //                     if (e.lhsAlias?.find(
                        //                         i => i.name === v.name)
                        //                     ) return true;
                        //                     else return false;
                        //                 })?.position;
                        //             if (_pos) _text = `${
                        //                 _rd!.textDocument.getText(
                        //                     Range.create(
                        //                         _td.positionAt(_pos[0]),
                        //                         _td.positionAt(_pos[1] + 1)
                        //                     )
                        //                 )
                        //             }`;
                        //             _result.unshift({
                        //                 label: v.name,
                        //                 labelDetails: {
                        //                     description: "stack alias"
                        //                 },
                        //                 kind: CompletionItemKind.Variable,
                        //                 detail: "stack alias: " + v.name,
                        //                 documentation: {
                        //                     kind: _documentionType,
                        //                     value: _documentionType === "markdown" 
                        //                         ? [
                        //                             "stack alias for:",
                        //                             "```rainlang",
                        //                             _text,
                        //                             "```"
                        //                         ].join("\n")
                        //                         : `stack alias for: ${_text}`
                        //                 },
                        //                 insertText: v.name
                        //             });
                        //         });
                        }
                    }
                    return _result;
                }
            }
            else return null;
        }
        else return null;
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
