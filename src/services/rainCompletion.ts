import { RainDocument } from "../parser/rainParser";
import { LanguageServiceParams, TextDocument, CompletionItem, Position } from "../rainLanguageTypes";
import { CompletionItemKind, MarkupKind } from "vscode-languageserver-types";

/**
 * Rain Completion class
 */
export class RainCompletion {
    private documentionType: MarkupKind = "plaintext";

    constructor(setting?: LanguageServiceParams) {
        const format = setting
            ?.clientCapabilities
            ?.textDocument
            ?.completion
            ?.completionItem
            ?.documentationFormat;
        if (format && format[0]) this.documentionType = format[0];
    }

    /**
     * @public Provides completion items
     * 
     * @param textDocument - The TextDocuemnt
     * @param opmeta - The op meta
     * @param position - Position of the textDocument to get the completion items for
     * @returns Promise of completion items and null if no completion items were available for that position
     */
    public doComplete(
        textDocument: TextDocument,
        opmeta: Uint8Array | string,
        position: Position
    ): Promise<CompletionItem[] | null> {
        const _rd = new RainDocument(textDocument, opmeta);
        const _td = textDocument;
        const _text = _td.getText();
        const _offset = _td.offsetAt(position);
        if (_offset === _text.length - 1 || _text[_offset + 1].match(/[<>(),;\s\n]/)) {
            const _result = _rd.getOpMeta().map(v => {
                return {
                    label: v.name,
                    kind: CompletionItemKind.Function,
                    detail: "opcode " + v.name + (
                        v.operand === 0 
                            ? "()" 
                            : v.operand.find(i => i.name !== "inputs") 
                                ? "<>()" 
                                : "()"
                    ),
                    documentation: {
                        kind: this.documentionType,
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
                        kind: CompletionItemKind.Function,
                        detail: "opcode " + e + (
                            v.operand === 0 
                                ? "()" 
                                : v.operand.find(i => i.name !== "inputs") 
                                    ? "<>()" 
                                    : "()"
                        ),
                        documentation: {
                            kind: this.documentionType,
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
            _rd.getLHSAliases()[_currentSource].forEach(v => {
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
                if (_pos) _text = " to " + `"${_rd.getTextDocument()
                    .getText()
                    .slice(_pos[0], _pos[1] + 1)}"`;
                _result.unshift({
                    label: v.name,
                    kind: CompletionItemKind.Variable,
                    detail: v.name,
                    documentation: {
                        kind: this.documentionType,
                        value: `LHS Alias${_text}`
                    }
                });
            });
            return Promise.resolve(_result);
        }
        else return Promise.resolve(null);
    }
}