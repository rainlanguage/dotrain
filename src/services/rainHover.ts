import { RainDocument } from "../parser/rainParser";
import { LanguageServiceParams, TextDocument, Position, Hover } from "../rainLanguageTypes";
import { MarkupKind } from "vscode-languageserver-types";
import { RDNode } from "../parser/rainParserTypes";

/**
 * Rain Completion class
 */
export class RainHover {
    private contentType: MarkupKind = "plaintext";

    constructor(setting?: LanguageServiceParams) {
        const format = setting
            ?.clientCapabilities
            ?.textDocument
            ?.completion
            ?.completionItem
            ?.documentationFormat;
        if (format && format[0]) this.contentType = format[0];
    }

    /**
     * @public Provides hover items
     * 
     * @param textDocument - The TextDocuemnt
     * @param opmeta - The op meta
     * @param position - Position of the textDocument to get the completion items for
     * @returns Promise of hover item and null if no item was available for that position
     */
    public doHover(
        textDocument: TextDocument,
        opmeta: Uint8Array | string,
        position: Position
    ): Promise<Hover | null> {
        const _rp = new RainDocument(textDocument, opmeta);
        const _td = textDocument;
        const _offset = _td.offsetAt(position);
        const _tree = _rp.getParseTree().find(v => 
            v.position[0] <= _offset && v.position[1] >= _offset
        );
        const search = (node: RDNode[]): Hover | null => {
            for (let i = 0; i < node.length; i++) {
                const _n = node[i];
                if (node[i].position[0] <= _offset && node[i].position[1] > _offset) {
                    if ("opcode" in _n) {
                        if (_n.parens[0] < _offset && _n.parens[1] > _offset) {
                            return search(_n.parameters);
                        }
                        else return {
                            contents: {
                                kind: this.contentType,
                                value: _n.opcode.description
                            }
                        } as Hover;
                    }
                    else if ("value" in _n) {
                        return {
                            contents: this.contentType,
                            value: _n.value
                        } as Hover;
                    }
                    else return {
                        contents: this.contentType,
                        value: _n.name
                    } as Hover;
                }
                else if (_n.lhs) {
                    let _lhs = _n.lhs;
                    if (!Array.isArray(_lhs)) _lhs = [_lhs];
                    for (let j = 0; j < _lhs.length; j++) {
                        if (_lhs[j].position[0] <= _offset && _lhs[j].position[1] >= _offset) {
                            return {
                                contents: {
                                    kind: this.contentType,
                                    value: "opcode" in _n ? 
                                        "Alias for opcode " + _n.opcode.name 
                                        : "value" in _n 
                                            ? "Alias for value " + _n.value 
                                            : "Alias for alias " + _n.name
                                }
                            } as Hover;
                        }
                    }
                    return null;
                }
            }
            return null;
        };
        if (_tree) return Promise.resolve(search(_tree.tree));
        else return Promise.resolve(null);
    }
}