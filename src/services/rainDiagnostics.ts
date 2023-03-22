import { RainDocument } from "../parser/rainParser";
import { 
    Range, 
    ErrorCode, 
    Diagnostic, 
    TextDocument,     
    DiagnosticSeverity,
    LanguageServiceParams 
} from "../rainLanguageTypes";


/**
 * @public Provides diagnostics
 * 
 * @param document - The TextDocument
 * @param opmeta - The op meta
 * @param setting - (optional) Language service params
 * @returns Diagnostics promise
 */
export function getRainDiagnostics(
    document: TextDocument, 
    opmeta: Uint8Array | string,
    setting?: LanguageServiceParams
): Promise<Diagnostic[]>

/**
 * @public Provides diagnostics
 * 
 * @param document - The RainDocument
 * @param setting - (optional) Language service params
 * @returns Diagnostics promise
 */
export function getRainDiagnostics(
    document: RainDocument,
    setting?: LanguageServiceParams
): Promise<Diagnostic[]>

export function getRainDiagnostics(
    document: RainDocument | TextDocument, 
    settingOrOpemta?: Uint8Array | string | LanguageServiceParams,
    setting?: LanguageServiceParams 
): Promise<Diagnostic[]> {
    let _hasRelatedInformation = false;
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
    const option = _setting
        ?.clientCapabilities
        ?.textDocument
        ?.publishDiagnostics
        ?.relatedInformation;
    if (option !== undefined) _hasRelatedInformation = option;

    if (_hasRelatedInformation) return Promise.resolve(_rd.getProblems().map(v => {
        return Diagnostic.create(
            Range.create(
                _td.positionAt(v.position[0]),
                _td.positionAt(v.position[1] + 1)
            ),
            ErrorCode[v.code].replace(/[A-Z]+/g, (v, i) => {
                if (i === 0) return v;
                else return ` ${v}`;
            }),
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
    else return Promise.resolve(_rd.getProblems().map(v => {
        return Diagnostic.create(
            Range.create(
                _td.positionAt(v.position[0]),
                _td.positionAt(v.position[1] + 1)
            ),
            v.msg,
            DiagnosticSeverity.Error,
            v.code,
            "rain"
        );
    })); 
}
