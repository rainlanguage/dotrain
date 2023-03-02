import { RainDocument } from "../parser/rainParser";
import { Diagnostic, TextDocument, Range, DiagnosticSeverity, ErrorCode } from "../rainLanguageTypes";

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
    const _rd = new RainDocument(textDocument, opmeta);
    const _td = _rd.getTextDocument();

    return Promise.resolve(_rd.getProblems().map(v => {
        return Diagnostic.create(
            Range.create(
                _td.positionAt(v.position[0]),
                _td.positionAt(v.position[1] + 1)
            ),
            ErrorCode[v.code],
            DiagnosticSeverity.Error,
            v.code,
            "rain",
            [
                {
                    location: {
                        uri: _td.uri,
                        range: Range.create(
                            _td.positionAt(v.position[0]),
                            _td.positionAt(v.position[1] + 1)
                        )
                    },
                    message: v.msg
                }
            ]
        );
    }));
}
