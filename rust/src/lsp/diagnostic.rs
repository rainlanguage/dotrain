use super::super::parser::{PositionAt, raindocument::RainDocument};
use lsp_types::{Diagnostic, Range, DiagnosticSeverity, DiagnosticRelatedInformation, Location};

pub fn get_diagnostics(rain_document: &RainDocument, related_information: bool) -> Vec<Diagnostic> {
    if related_information {
        rain_document
            .all_problems()
            .iter()
            .map(|v| {
                let range = Range::new(
                    rain_document.text.position_at(v.position[0]),
                    rain_document.text.position_at(v.position[1]),
                );
                Diagnostic::new(
                    range.clone(),
                    Some(DiagnosticSeverity::ERROR),
                    Some(lsp_types::NumberOrString::Number(v.code.to_i32())),
                    Some("rainlang".to_owned()),
                    v.msg.clone(),
                    Some(vec![DiagnosticRelatedInformation {
                        message: v.msg.to_owned(),
                        location: Location {
                            uri: rain_document.uri.clone(),
                            range,
                        },
                    }]),
                    None,
                )
            })
            .collect()
    } else {
        rain_document
            .all_problems()
            .iter()
            .map(|v| {
                Diagnostic::new(
                    Range::new(
                        rain_document.text.position_at(v.position[0]),
                        rain_document.text.position_at(v.position[1]),
                    ),
                    Some(DiagnosticSeverity::ERROR),
                    Some(lsp_types::NumberOrString::Number(v.code.to_i32())),
                    Some("rainlang".to_owned()),
                    v.msg.clone(),
                    None,
                    None,
                )
            })
            .collect()
    }
}

// export async function getDiagnostics(
//   document: RainDocument | TextDocument,
//   setting?: LanguageServiceParams
// ): Promise<Diagnostic[]> {
//   let _hasRelatedInformation = false;
//   let _rd: RainDocument;
//   let _td: TextDocument;
//   if (document instanceof RainDocument) {
//       _rd = document;
//       _td = _rd.textDocument;
//       if (setting?.metaStore && _rd.metaStore !== setting.metaStore) {
//           _rd.metaStore.update(setting.metaStore);
//           await _rd.parse();
//       }
//   }
//   else {
//       _td = document;
//       _rd = await RainDocument.create(document, setting?.metaStore);
//   }
//   const option = setting
//       ?.clientCapabilities
//       ?.textDocument
//       ?.publishDiagnostics
//       ?.relatedInformation;
//   if (option !== undefined) _hasRelatedInformation = option;

//   if (_hasRelatedInformation) return Promise.resolve(
//       _rd.getAllProblems().map(v => Diagnostic.create(
//           Range.create(
//               _td.positionAt(v.position[0]),
//               _td.positionAt(v.position[1] + 1)
//           ),
//           ErrorCode[v.code].replace(/[A-Z]+/g, (v, i) => {
//               if (i === 0) return v;
//               else return ` ${v}`;
//           }),
//           DiagnosticSeverity.Error,
//           v.code,
//           "rainlang",
//           [
//               {
//                   location: {
//                       uri: _td.uri,
//                       range: Range.create(
//                           _td.positionAt(v.position[0]),
//                           _td.positionAt(v.position[1] + 1)
//                       )
//                   },
//                   message: v.msg
//               }
//           ]
//       ))
//   );
//   else return Promise.resolve(
//       _rd.getAllProblems().map(v => Diagnostic.create(
//           Range.create(
//               _td.positionAt(v.position[0]),
//               _td.positionAt(v.position[1] + 1)
//           ),
//           v.msg,
//           DiagnosticSeverity.Error,
//           v.code,
//           "rainlang"
//       ))
//   );
// }
