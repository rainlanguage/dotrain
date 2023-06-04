import { RainDocument } from "../parser/rainDocument";
import { 
    Range, 
    Position,
    MarkupKind,  
    TextDocument, 
    CompletionItem, 
    CompletionItemKind, 
    LanguageServiceParams 
} from "../rainLanguageTypes";


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
    let _documentionType: MarkupKind = "plaintext";
    let _rd: RainDocument;
    let _td: TextDocument;
    if (document instanceof RainDocument) {
        _rd = document;
        _td = _rd.getTextDocument();
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

    const _regexp = /[a-zA-Z0-9-]/;
    const _prefixText = _td.getText(
        Range.create(Position.create(position.line, 0), position)
    );

    try {
        if (
            !_regexp.test(_td.getText(
                Range.create(
                    position, 
                    { line: position.line, character: position.character + 1 }
                )
            ))
        ) {
            const _opmeta = _rd.getOpMeta();
            const _offset = _td.offsetAt(position);
            const _result = _opmeta.map(v => {
                const _following = v.operand === 0 
                    ? "()" 
                    : v.operand.find(i => i.name !== "inputs") 
                        ? "<>()" 
                        : "()";
                return {
                    label: v.name,
                    labelDetails: {
                        detail: _following,
                        description: "opcode"
                    },
                    kind: CompletionItemKind.Function,
                    detail: "opcode " + v.name + _following,
                    documentation: {
                        kind: _documentionType,
                        value: v.desc
                    },
                    insertText: v.name + _following
                } as CompletionItem;
            });
            _opmeta.forEach(v => {
                v.aliases?.forEach(e => {
                    const _following = v.operand === 0 
                        ? "()" 
                        : v.operand.find(i => i.name !== "inputs") 
                            ? "<>()" 
                            : "()";
                    _result.push({
                        label: e,
                        labelDetails: {
                            detail: _following, 
                            description: "opcode (alias)"
                        },
                        kind: CompletionItemKind.Function,
                        detail: "opcode " + e + _following,
                        documentation: {
                            kind: _documentionType,
                            value: v.desc
                        },
                        insertText: e + _following
                    });
                });
            });
            _rd.getContextAliases().forEach(v => {
                const _following = isNaN(v.row) ? "<>()" : "()";
                _result.unshift({
                    label: v.name,
                    labelDetails: {
                        detail: _following, 
                        description: "context (alias)"
                    },
                    kind: CompletionItemKind.Function,
                    detail: `alias for context ${
                        isNaN(v.row) 
                            ? "column <" + v.column + ">" 
                            : "cell <" + v.column + " " + v.row + ">"
                    } ${v.name + _following}`,
                    documentation: {
                        kind: _documentionType,
                        value: v.desc
                    },
                    insertText: v.name + _following
                });
            });
            const constants = _rd.getConstants();
            Object.keys(constants).forEach(v => {
                _result.unshift({
                    label: v,
                    labelDetails: {
                        description: "constant alias"
                    },
                    kind: CompletionItemKind.Constant,
                    detail: constants[v],
                    documentation: {
                        kind: _documentionType,
                        value: `alias for constant value ${constants[v]}`
                    },
                    insertText: v
                });
            });
            const _exps = _rd.expressions;
            _exps.forEach(v => {
                _result.push({
                    label: v.name,
                    labelDetails: {
                        description: "expression key"
                    },
                    kind: CompletionItemKind.Class,
                    detail: "named expression",
                    documentation: {
                        kind: _documentionType,
                        value: _documentionType === "markdown"
                            ? [
                                "```rainlang",
                                v.text.trim(),
                                "```"
                            ].join("\n")
                            : v.text
                    },
                    insertText: v.name
                });
            });
            let _currentSource = NaN;
            for (let i = 0; i < _exps.length; i++) {
                if (_exps[i].position[0] <= _offset && _exps[i].position[1] + 1 >= _offset) {
                    _currentSource = i;
                    break;
                }
            }
            let _pos: [number, number] | undefined;
            if (!isNaN(_currentSource)) _rd.expressions[_currentSource].parseObj?.ast.lines
                .map(v => v.aliases)
                .flat()
                ?.filter(v => v.name !== "_")
                .forEach(v => {
                    let _text = "";
                    _pos = _exps[_currentSource].parseObj?.ast.lines
                        .map(e => e.nodes)
                        .flat()
                        .find(e => {
                            if (e.lhsAlias?.find(i => i.name === v.name)) return true;
                            else return false;
                        })?.position;
                    if (_pos) _text = `${
                        _rd!.getTextDocument().getText(
                            Range.create(
                                _td.positionAt(_pos[0]),
                                _td.positionAt(_pos[1] + 1)
                            )
                        )
                    }`;
                    _result.unshift({
                        label: v.name,
                        labelDetails: {
                            description: "alias"
                        },
                        kind: CompletionItemKind.Variable,
                        detail: v.name,
                        documentation: {
                            kind: _documentionType,
                            value: _documentionType === "markdown" 
                                ? [
                                    "LHS alias for:",
                                    "```rainlang",
                                    _text,
                                    "```"
                                ].join("\n")
                                : `LHS alias for: ${_text}`
                        },
                        insertText: v.name
                    });
                });
            
            // filter the items based on previous characters
            let _prefixMatch = "";
            for (let i = 0; i < _prefixText.length; i++) {
                if (_regexp.test(_prefixText[_prefixText.length - i - 1])) {
                    _prefixMatch = _prefixText[_prefixText.length - i - 1] + _prefixMatch;
                }
                else break;
            }
            return _result.filter(v => v.label.includes(_prefixMatch));
        }
        else return null;
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
