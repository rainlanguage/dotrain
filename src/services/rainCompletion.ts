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
            const _compOps = _rd.getOpMeta().map(v => {
                return {
                    label: v.name,
                    kind: CompletionItemKind.Operator,
                    detail: v.name,
                    documentation: {
                        kind: this.documentionType,
                        value: v.desc
                    }
                } as CompletionItem;
            });
            return Promise.resolve(_compOps);
        }
        else return Promise.resolve(null);
    }
}