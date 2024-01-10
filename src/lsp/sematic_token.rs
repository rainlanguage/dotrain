use std::collections::BTreeSet;
use lsp_types::{SemanticTokensPartialResult, Position, SemanticToken};
use super::super::{
    types::ast::{BindingItem, ErrorCode},
    parser::{OffsetAt, PositionAt, raindocument::RainDocument},
};

#[derive(Eq, PartialEq, Copy, Clone, PartialOrd, Ord, Debug)]
struct OrdRange {
    start: Position,
    end: Position,
}

/// Provides semantic tokens for RainDocument's elided fragments
/// token_modifiers bit are set with provided token_modifiers_len ((2 ^ len) - 1) such as a length of 3 equals to 00000111
pub fn get_semantic_token(
    rain_document: &RainDocument,
    token_types_index: u32,
    token_modifiers_len: usize,
) -> SemanticTokensPartialResult {
    let mut ranges: BTreeSet<OrdRange> = BTreeSet::new();
    for b in &rain_document.bindings {
        if let BindingItem::Exp(_) = &b.item {
            b.problems
                .iter()
                .for_each(|p| {
                    if p.code == ErrorCode::ElidedBinding {
                        ranges.insert(OrdRange {
                            start: rain_document.text.position_at(p.position[0]),
                            end: rain_document.text.position_at(p.position[1]),
                        }); 
                    }
                });
        }
        if let BindingItem::Elided(_) = &b.item {
            let start = rain_document.text.position_at(b.content_position[0] + 1);
            let end = rain_document.text.position_at(b.content_position[1]);
            if start.line == end.line {
                ranges.insert(OrdRange { start, end });
            } else {
                ranges.insert(OrdRange {
                    start,
                    end: rain_document.text.position_at(
                        rain_document
                            .text
                            .offset_at(&Position::new(start.line + 1, 0))
                            - 1,
                    ),
                });
                for i in start.line + 1..end.line {
                    ranges.insert(OrdRange {
                        start: Position::new(i, 0),
                        end: rain_document.text.position_at(
                            rain_document.text.offset_at(&Position::new(i + 1, 0)) - 1,
                        ),
                    });
                }
                ranges.insert(OrdRange {
                    start: Position {
                        line: end.line,
                        character: 0,
                    },
                    end,
                });
            }
        }
    }

    let mut last_char = 0u32;
    let mut last_line = 0u32;
    let token_modifiers_bitset = 2u32.pow(8u32.min(token_modifiers_len as u32)) - 1;
    let data = ranges
        .iter()
        .map(|r| {
            crate::js_api::log(&format!("{:?}", r));
            let delta_line = r.start.line - last_line;
            let result = SemanticToken {
                delta_line,
                delta_start: if delta_line == 0 {
                    r.start.character - last_char
                } else {
                    r.start.character
                },
                length: r.end.character - r.start.character,
                token_type: token_types_index,
                token_modifiers_bitset,
            };
            last_line = r.start.line;
            last_char = r.start.character;
            result
        })
        .collect();

    SemanticTokensPartialResult { data }
}
