import { RainDocument } from "../parser/rainParser";
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
 * @param opmeta - The op meta
 * @param setting - (optional) Language service params
 * @returns Completion items and null if no completion items were available for that position
 */
export function getRainCompletion(
    document: TextDocument, 
    position: Position,
    opmeta: Uint8Array | string,
    setting?: LanguageServiceParams
): CompletionItem[] | null

/**
 * @public Provides completion items
 * 
 * @param document - The RainDocument object instance
 * @param position - Position of the textDocument to get the completion items for
 * @param setting - (optional) Language service params
 * @returns Completion items and null if no completion items were available for that position
 */
export function getRainCompletion(
    document: RainDocument, 
    position: Position,
    setting?: LanguageServiceParams
): CompletionItem[] | null

export function getRainCompletion(
    document: TextDocument | RainDocument,
    position: Position,
    settingOrOpemta?: Uint8Array | string | LanguageServiceParams,
    setting?: LanguageServiceParams 
): CompletionItem[] | null {
    let _documentionType: MarkupKind = "plaintext";
    let _setting: LanguageServiceParams | undefined;
    let _rd: RainDocument;
    let _td: TextDocument;
    if (document instanceof RainDocument) {
        _rd = document;
        _td = _rd.getTextDocument();
        if (settingOrOpemta) _setting = settingOrOpemta as LanguageServiceParams;
    }
    else {
        _rd = new RainDocument(document, settingOrOpemta as Uint8Array | string);
        _td = document;
        if (setting) _setting = setting;
    }
    const format = _setting
        ?.clientCapabilities
        ?.textDocument
        ?.completion
        ?.completionItem
        ?.documentationFormat;
    if (format && format[0]) _documentionType = format[0];

    try {
        if (
            !_td.getText(
                Range.create(
                    position, 
                    { line: position.line, character: position.character + 1 }
                )
            ).match(/\w|-/)
        ) {
            const _offset = _td.offsetAt(position);
            const _result = _rd.getOpMeta().map(v => {
                return {
                    label: v.name,
                    labelDetails: {
                        detail: v.operand === 0 
                            ? "()" 
                            : v.operand.find(i => i.name !== "inputs") 
                                ? "<>()" 
                                : "()",
                        description: "opcode"
                    },
                    kind: CompletionItemKind.Function,
                    detail: "opcode " + v.name + (
                        v.operand === 0 
                            ? "()" 
                            : v.operand.find(i => i.name !== "inputs") 
                                ? "<>()" 
                                : "()"
                    ),
                    documentation: {
                        kind: _documentionType,
                        value: v.desc
                    },
                    insertText: v.name + (
                        v.operand === 0 
                            ? "()" 
                            : v.operand.find(i => i.name !== "inputs") 
                                ? "<>()" 
                                : "()"
                    )
                } as CompletionItem;
            });
            _rd.getOpMeta().forEach(v => {
                v.aliases?.forEach(e =>
                    _result.push({
                        label: e,
                        labelDetails: {
                            detail: v.operand === 0 
                                ? "()" 
                                : v.operand.find(i => i.name !== "inputs") 
                                    ? "<>()" 
                                    : "()",
                            description: "opcode (alias)"
                        },
                        kind: CompletionItemKind.Function,
                        detail: "opcode " + e + (
                            v.operand === 0 
                                ? "()" 
                                : v.operand.find(i => i.name !== "inputs") 
                                    ? "<>()" 
                                    : "()"
                        ),
                        documentation: {
                            kind: _documentionType,
                            value: v.desc
                        },
                        insertText: v.name + (
                            v.operand === 0 
                                ? "()" 
                                : v.operand.find(i => i.name !== "inputs") 
                                    ? "<>()" 
                                    : "()"
                        )
                    })
                );
            });
            const _tree = _rd.getParseTree();
            let _currentSource = 0;
            for (let i = 0; i < _tree.length; i++) {
                if (_tree[i].position[0] <= _offset && _tree[i].position[1] >= _offset) {
                    _currentSource = i;
                    break;
                }
            }
            let _pos: [number, number] | undefined;
            _rd.getLHSAliases()[_currentSource]
                ?.filter(v => v.name !== "_")
                .forEach(v => {
                    let _text = "";
                    _pos = _tree[_currentSource].tree.find(e => {
                        if (e.lhs){
                            if (Array.isArray(e.lhs)) {
                                if (e.lhs.find(i => i.name === v.name)) return true; 
                                else return false;
                            }
                            else {
                                if (e.lhs.name === v.name) return true;
                                else return false;
                            }
                        }
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
                        }
                    });
                });
            
            // filter the items based on previous characters
            let _prefixMatch = "";
            const _prefixText = _td.getText(
                Range.create({ line: position.line, character: 0 }, position)
            );
            for (let i = 0; i < _prefixText.length; i++) {
                if (_prefixText[_prefixText.length - 1].match(/\w|-/)) {
                    _prefixMatch = _prefixText[_prefixText.length - 1] + _prefixMatch;
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
