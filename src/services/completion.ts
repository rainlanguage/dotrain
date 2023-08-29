import { exclusiveParse } from "../utils";
import { RainDocument } from "../dotrain/rainDocument";
import { 
    Range, 
    Position,
    Namespace,
    MarkupKind,  
    TextDocument, 
    WORD_PATTERN, 
    NamespaceNode,
    CompletionItem, 
    CompletionItemKind, 
    LanguageServiceParams, 
} from "../rainLanguageTypes";


function findNamespaceMach(
    name: string, 
    namespace: Namespace
): [string, (Namespace | NamespaceNode)][] | undefined {
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
    return _result as [string, (Namespace | NamespaceNode)][];
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
export async function getRainlangCompletion(
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
export async function getRainlangCompletion(
    document: RainDocument, 
    position: Position,
    setting?: LanguageServiceParams
): Promise<CompletionItem[] | null>

export async function getRainlangCompletion(
    document: TextDocument | RainDocument,
    position: Position,
    setting?: LanguageServiceParams 
): Promise<CompletionItem[] | null> {
    const _triggers = /[a-zA-Z0-9-.]/;
    let _documentionType: MarkupKind = "plaintext";
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
    if (format && format[0]) _documentionType = format[0];

    try {
        if (
            !_triggers.test(_td.getText(
                Range.create(
                    position, 
                    { line: position.line, character: position.character + 1 }
                )
            ))
        ) {
            let _prefix = "";
            const _prefixText = _td.getText(
                Range.create(Position.create(position.line, 0), position)
            );
            for (let i = 0; i < _prefixText.length; i++) {
                if (_triggers.test(_prefixText[_prefixText.length - i - 1])) {
                    _prefix = _prefixText[_prefixText.length - i - 1] + _prefix;
                }
                else break;
            }
            if (/^(\.?[a-z][0-9a-z-]*)*\.?$/.test(_prefix)) {
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
                                        value: v[1].Element.desc as string,
                                    },
                                    insertText: v[0] + _following
                                };
                            }
                            else if ("operand" in v[1].Element) {
                                const _following = v[1].Element.operand === 0 
                                    ? "()" 
                                    : (v[1].Element.operand as any).find(
                                        (i: any) => i.name !== "inputs"
                                    ) ? "<>()" : "()";
                                return {
                                    label: v[0],
                                    labelDetails: {
                                        detail: _following,
                                        description: "opcode"
                                    },
                                    kind: CompletionItemKind.Function,
                                    detail: "opcode: " + v[0] + _following,
                                    documentation: {
                                        kind: _documentionType,
                                        value: v[1].Element.desc as string
                                    },
                                    insertText: v[0] + _following
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
                    }).filter(v => v !== null) as CompletionItem[];
                    else return null;
                }
                else {
                    const _result = _rd.opmeta.filter(
                        v => v.name.includes(_prefix) || 
                        v.aliases?.find(e => e.includes(_prefix))
                    ).flatMap(v => {
                        const _following = v.operand === 0 
                            ? "()" 
                            : v.operand.find(i => i.name !== "inputs") 
                                ? "<>()" 
                                : "()";
                        const _names: string[] = [];
                        if (v.name.includes(_prefix)) _names.push(v.name);
                        if (v.aliases) v.aliases.forEach(e => {
                            if (e.includes(_prefix)) _names.push(e);
                        });
                        return _names.map(e => {
                            return {
                                label: e,
                                labelDetails: {
                                    detail: _following,
                                    description: "opcode"
                                },
                                kind: CompletionItemKind.Function,
                                detail: "opcode: " + e + _following,
                                documentation: {
                                    kind: _documentionType,
                                    value: v.desc
                                },
                                insertText: e + _following
                            } as CompletionItem;
                        });
                    });
                    Object.keys(_rd.constants).filter(
                        v => v.includes(_prefix)
                    ).forEach(v => {
                        _result.unshift({
                            label: v,
                            labelDetails: {
                                description: "constant alias"
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
                    Object.entries(_rd.namespace).filter(
                        v => v[0].includes(_prefix)
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
                                        value: v[1].Element.desc as string,
                                    },
                                    insertText: v[0] + _following
                                });
                            }
                            else if ("operand" in v[1].Element) {
                                if (!_result.find(e => e.label === v[0])) {
                                    const _following = v[1].Element.operand === 0 
                                        ? "()" 
                                        : (v[1].Element.operand as any).find(
                                            (i: any) => i.name !== "inputs"
                                        ) ? "<>()" : "()";
                                    _result.unshift({
                                        label: v[0],
                                        labelDetails: {
                                            detail: _following,
                                            description: "opcode"
                                        },
                                        kind: CompletionItemKind.Function,
                                        detail: "opcode: " + v[0] + _following,
                                        documentation: {
                                            kind: _documentionType,
                                            value: v[1].Element.desc as string
                                        },
                                        insertText: v[0] + _following
                                    });
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
                                _result.unshift({
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
                    const _currentExp = _rd.bindings.find(
                        v => v.contentPosition[0] <= _offset && v.contentPosition[1] + 1 >= _offset
                    );
                    if (_currentExp) {
                        const _currentSource = _currentExp.exp?.ast.find(v => 
                            v.position[0] + _currentExp.contentPosition[0] <= _offset &&
                            v.position[1] + _currentExp.contentPosition[0]+ 1 >= _offset
                        );
                        if (_currentSource) _currentSource.lines
                            .flatMap(v => v.aliases)
                            .filter(v => v.name.includes(_prefix))
                            .forEach(v => {
                                let _text = "";
                                const _pos = _currentSource.lines
                                    .flatMap(e => e.nodes)
                                    .find(e => {
                                        if (e.lhsAlias?.find(i => i.name === v.name)) return true;
                                        else return false;
                                    })?.position;
                                if (_pos) _text = `${
                                    _rd!.textDocument.getText(
                                        Range.create(
                                            _td.positionAt(_pos[0]),
                                            _td.positionAt(_pos[1] + 1)
                                        )
                                    )
                                }`;
                                _result.unshift({
                                    label: v.name,
                                    labelDetails: {
                                        description: "stack alias"
                                    },
                                    kind: CompletionItemKind.Variable,
                                    detail: "stack alias: " + v.name,
                                    documentation: {
                                        kind: _documentionType,
                                        value: _documentionType === "markdown" 
                                            ? [
                                                "stack alias for:",
                                                "```rainlang",
                                                _text,
                                                "```"
                                            ].join("\n")
                                            : `stack alias for: ${_text}`
                                    },
                                    insertText: v.name
                                });
                            });
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
