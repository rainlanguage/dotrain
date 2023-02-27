import { RainDocument } from "../parser/rainParser";
import { Diagnostic, TextDocument, Range, DiagnosticSeverity } from "../rainLanguageTypes";

/**
 * @public
 * 
 * @param textDocument 
 * @param opmeta 
 * @returns 
 */
export function doValidation(
    textDocument: TextDocument, 
    opmeta: Uint8Array | string
): Promise<Diagnostic[]> {
    const _rp = new RainDocument(textDocument, opmeta);
    const _td = _rp.getTextDocument();

    return Promise.resolve(_rp.getProblems().map(v => {
        return Diagnostic.create(
            Range.create(
                _td.positionAt(v.position[0]),
                _td.positionAt(v.position[1])
            ),
            v.msg,
            DiagnosticSeverity.Error,
            v.code,
            "rl",
            [
                {
                    location: {
                        uri: _td.uri,
                        range: Range.create(
                            _td.positionAt(v.position[0]),
                            _td.positionAt(v.position[1])
                        )
                    },
                    message: v.msg
                }
            ]
        );
    }));
}