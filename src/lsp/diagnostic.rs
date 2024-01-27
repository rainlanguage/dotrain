use once_cell::sync::Lazy;
use regex::{Regex, Captures};
use super::super::parser::{PositionAt, raindocument::RainDocument};
use lsp_types::{Diagnostic, Range, DiagnosticSeverity, DiagnosticRelatedInformation, Location, Url};

/// pattern for uppercase letters
static UPPERCASE_LETTERS: Lazy<Regex> = Lazy::new(|| Regex::new(r"[A-Z]+").unwrap());

/// Provides diagnostics for the given RainDocument by converting all problems to LSP diagnostics
pub fn get_diagnostics(
    rain_document: &RainDocument,
    uri: &Url,
    related_information: bool,
) -> Vec<Diagnostic> {
    let replacement =
        |caps: &Captures| -> String { " ".to_owned() + &caps[0].to_ascii_lowercase() };
    rain_document
        .all_problems()
        .iter()
        .map(|v| {
            let range = Range::new(
                rain_document.text.position_at(v.position[0]),
                rain_document.text.position_at(v.position[1]),
            );
            Diagnostic::new(
                range,
                Some(DiagnosticSeverity::ERROR),
                Some(lsp_types::NumberOrString::Number(v.code.to_i32())),
                Some("rainlang".to_owned()),
                if related_information {
                    UPPERCASE_LETTERS
                        .replace_all(&format!("{:?}", v.code), &replacement)
                        .trim()
                        .to_string()
                } else {
                    v.msg.clone()
                },
                if related_information {
                    Some(vec![DiagnosticRelatedInformation {
                        message: v.msg.to_owned(),
                        location: Location {
                            uri: uri.clone(),
                            range,
                        },
                    }])
                } else {
                    None
                },
                None,
            )
        })
        .collect()
}
