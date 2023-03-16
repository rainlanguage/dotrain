import { RainDocument } from "../parser/rainParser";
import { 
    Diagnostic,
    TextDocument,
    Range,
    DiagnosticSeverity,
    ErrorCode,
    LanguageServiceParams 
} from "../../shared/rainLanguageTypes";


/**
 * Rain Diagnostics class
 */
export class RainDiagnostics {
    private hasRelatedInformation = false;

    constructor(setting?: LanguageServiceParams) {
        const option = setting
            ?.clientCapabilities
            ?.textDocument
            ?.publishDiagnostics
            ?.relatedInformation;
        if (option !== undefined) this.hasRelatedInformation = option;
    }

    /**
     * @public Validate Rain documents
     * 
     * @param document - The RainDocument
     * @param opmeta - The op meta
     * @returns Diagnostics promise
     */
    public doValidation(document: RainDocument): Promise<Diagnostic[]>

    /**
     * @public Validate Rain documents
     * 
     * @param document - The TextDocument
     * @param opmeta - The op meta
     * @returns Diagnostics promise
     */
    public doValidation(
        document: TextDocument, 
        opmeta: Uint8Array | string
    ): Promise<Diagnostic[]>

    public doValidation(
        document: RainDocument | TextDocument, 
        opmeta: Uint8Array | string = ""
    ): Promise<Diagnostic[]> {
        let _rd: RainDocument;
        let _td: TextDocument;
        if (document instanceof RainDocument) {
            _rd = document;
            _td = _rd.getTextDocument();
        }
        else {
            _rd = new RainDocument(document, opmeta );
            _td = document;
        }
        if (this.hasRelatedInformation) return Promise.resolve(_rd.getProblems().map(v => {
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
}
