use lsp_types::Position;
use regex::{Match, Regex};
use revm::primitives::U256;
use rain_meta::{RainMetaDocumentV1Item, magic::KnownMagic};
use super::types::{
    ast::{ParsedItem, Offsets},
    patterns::{HEX_PATTERN, BINARY_PATTERN, E_PATTERN, INT_PATTERN},
};

pub(crate) mod rainlang;
pub(crate) mod raindocument;

pub use self::rainlang::*;
pub use self::raindocument::*;

/// Trait for converting offset to lsp position
pub trait PositionAt {
    fn position_at(&self, offset: usize) -> Position;
}

/// trait for converting lsp position to offset
pub trait OffsetAt {
    fn offset_at(&self, position: &Position) -> usize;
}

impl PositionAt for &str {
    fn position_at(&self, offset: usize) -> Position {
        let o = 0.max(offset.min(self.len()));
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc = v.len() + acc;
        });
        let mut low = 0;
        let mut high = line_offsets.len();
        if high == 0 {
            return Position {
                line: 0,
                character: o as u32,
            };
        }
        while low < high {
            let mid = (low + high) / 2;
            if line_offsets[mid] > o {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        let line = low - 1;
        return Position {
            line: line as u32,
            character: (o - line_offsets[line]) as u32,
        };
    }
}

impl OffsetAt for &str {
    fn offset_at(&self, position: &Position) -> usize {
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc = v.len() + acc;
        });
        if position.line >= line_offsets.len() as u32 {
            return self.len();
        }
        let line_offset = line_offsets[position.line as usize];
        let next_line_offset = if position.line + 1 < line_offsets.len() as u32 {
            line_offsets[position.line as usize + 1]
        } else {
            self.len()
        };
        return line_offset.max((line_offset + position.character as usize).min(next_line_offset));
    }
}

impl PositionAt for String {
    fn position_at(&self, offset: usize) -> Position {
        let o = 0.max(offset.min(self.len()));
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc = v.len() + acc;
        });
        let mut low = 0;
        let mut high = line_offsets.len();
        if high == 0 {
            return Position {
                line: 0,
                character: o as u32,
            };
        }
        while low < high {
            let mid = (low + high) / 2;
            if line_offsets[mid] > o {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        let line = low - 1;
        return Position {
            line: line as u32,
            character: (o - line_offsets[line]) as u32,
        };
    }
}

impl OffsetAt for String {
    fn offset_at(&self, position: &Position) -> usize {
        let mut line_offsets = vec![];
        let mut acc = 0;
        self.split_inclusive('\n').for_each(|v| {
            line_offsets.push(acc);
            acc = v.len() + acc;
        });
        if position.line >= line_offsets.len() as u32 {
            return self.len();
        }
        let line_offset = line_offsets[position.line as usize];
        let next_line_offset = if position.line + 1 < line_offsets.len() as u32 {
            line_offsets[position.line as usize + 1]
        } else {
            self.len()
        };
        return line_offset.max((line_offset + position.character as usize).min(next_line_offset));
    }
}

/// Parses an string by extracting matching strings.
pub fn inclusive_parse(text: &str, pattern: &Regex, offset: usize) -> Vec<ParsedItem> {
    pattern
        .find_iter(text)
        .map(|m| {
            ParsedItem(
                m.as_str().to_owned(),
                [m.start() + offset, m.end() + offset],
            )
        })
        .collect()
}

/// Parses an string by extracting the strings outside of matches
pub fn exclusive_parse(
    text: &str,
    pattern: &Regex,
    offset: usize,
    include_empty_ends: bool,
) -> Vec<ParsedItem> {
    let matches: Vec<Match> = pattern.find_iter(text).collect();
    let strings: Vec<_> = pattern.split(text).collect();
    let mut result: Vec<ParsedItem> = vec![];
    let count = strings.len();
    for (i, &s) in strings.iter().enumerate() {
        if i == 0 {
            if !s.is_empty() || include_empty_ends {
                result.push(ParsedItem(
                    s.to_owned(),
                    [
                        0 + offset,
                        match matches.len() {
                            0 => text.len() + offset,
                            _ => matches[0].start() + offset,
                        },
                    ],
                ))
            }
        } else if i == count - 1 {
            if !s.is_empty() || include_empty_ends {
                result.push(ParsedItem(
                    s.to_owned(),
                    [
                        matches[matches.len() - 1].start() + 1 + offset,
                        text.len() + offset,
                    ],
                ))
            }
        } else {
            result.push(ParsedItem(
                s.to_owned(),
                [matches[i - 1].end() + offset, matches[i].start() + offset],
            ))
        }
    }
    result
}

/// Fills a poistion in a text with whitespaces by keeping line structure intact
pub fn fill_in(text: &mut String, position: Offsets) -> anyhow::Result<()> {
    text.replace_range(
        position[0]..position[1],
        &text
            .get(position[0]..position[1])
            .ok_or(anyhow::anyhow!("text contains invalid chars!"))?
            .chars()
            .map(|c| if c.is_whitespace() { c } else { ' ' })
            .collect::<String>(),
    );
    Ok(())
}

/// Fills a text with whitespaces excluding a position by keeping line structure intact
pub fn fill_out(text: &mut String, position: Offsets) -> anyhow::Result<()> {
    text.replace_range(
        ..position[0],
        &text
            .get(..position[0])
            .ok_or(anyhow::anyhow!("text contains invalid chars!"))?
            .chars()
            .map(|c| if c.is_whitespace() { c } else { ' ' })
            .collect::<String>(),
    );
    text.replace_range(
        position[1]..,
        &text
            .get(position[1]..)
            .ok_or(anyhow::anyhow!("text contains invalid chars!"))?
            .chars()
            .map(|c| if c.is_whitespace() { c } else { ' ' })
            .collect::<String>(),
    );
    Ok(())
}

/// Trims a text (removing start/end whitespaces) with reporting the number of deletions
pub fn tracked_trim(s: &str) -> (&str, usize, usize) {
    (
        s.trim(),
        s.len() - s.trim_start().len(),
        s.len() - s.trim_end().len(),
    )
}

pub fn line_number(text: &str, pos: usize) -> usize {
    let lines: Vec<_> = text.split_inclusive('\n').collect();
    let lines_count = lines.len();
    if pos >= lines_count {
        return lines_count;
    } else {
        let mut _c = 0;
        for (i, &s) in lines.iter().enumerate() {
            _c += s.len();
            if pos <= _c {
                return i;
            }
        }
        return 0;
    }
}

pub(crate) fn hex_to_u256(val: &str) -> anyhow::Result<U256> {
    let mut hex = val;
    if val.starts_with("0x") {
        hex = &val[2..];
    }
    U256::from_str_radix(hex, 16).map_err(anyhow::Error::from)
}

pub(crate) fn binary_to_u256(value: &str) -> anyhow::Result<U256> {
    let mut binary = value;
    if value.starts_with("0b") {
        binary = &value[2..];
    }
    U256::from_str_radix(binary, 2).map_err(anyhow::Error::from)
}

pub(crate) fn e_to_u256(value: &str) -> anyhow::Result<U256> {
    let slices = value.split_once('e').unwrap();
    let int = slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?);
    U256::from_str_radix(&int, 10).map_err(anyhow::Error::from)
}

pub(crate) fn to_u256(value: &str) -> anyhow::Result<U256> {
    if BINARY_PATTERN.is_match(value) {
        Ok(binary_to_u256(value)?)
    } else if E_PATTERN.is_match(value) {
        Ok(e_to_u256(value)?)
    } else if INT_PATTERN.is_match(value) {
        Ok(U256::from_str_radix(value, 10).map_err(anyhow::Error::from)?)
    } else if HEX_PATTERN.is_match(value) {
        Ok(hex_to_u256(value)?)
    } else {
        Err(anyhow::anyhow!("not valid rainlang numeric value!"))
    }
}

/// Method to check if a meta sequence is consumable for a dotrain
pub(crate) fn is_consumable(items: &Vec<RainMetaDocumentV1Item>) -> bool {
    if items.len() > 0 {
        let mut dotrains = 0;
        let mut dispairs = 0;
        let mut callers = 0;
        items.iter().for_each(|v| match v.magic {
            KnownMagic::DotrainV1 => dotrains += 1,
            KnownMagic::InterpreterCallerMetaV1 => callers += 1,
            KnownMagic::ExpressionDeployerV2BytecodeV1 => dispairs += 1,
            _ => {}
        });
        if dispairs > 1 || callers > 1 || dotrains > 1 || dispairs + callers + dotrains == 0 {
            false
        } else {
            true
        }
    } else {
        false
    }
}

// /// converts utf16 offset to utf8 encoded equivelant offset
// pub(crate) fn str_utf16_to_utf8(s: &str, pos: usize) -> anyhow::Result<usize> {
//     let b: Vec<u16> = s.encode_utf16().take(pos).collect();
//     Ok(String::from_utf16(&b).map_err(anyhow::Error::from)?.len())
// }

// /// Finds illegal chars as utf16 encoded
// pub(crate) fn illegal_char_utf16(text: &str) -> Vec<ParsedItem> {
//     let mut utf16_offset = 0;
//     ILLEGAL_CHAR
//         .find_iter(text)
//         .map(|m| {
//             let c = m.as_str().to_owned();
//             let utf16_len = c.encode_utf16().count();
//             let start = m.start() - utf16_offset;
//             utf16_offset += c.len() - utf16_len;
//             ParsedItem(c, [start, start + utf16_len])
//         })
//         .collect()
// }

// pub(crate) fn binary_to_int(value: &str) -> anyhow::Result<String> {
//     Ok(binary_to_u256(value)?.to_string())
// }

// pub(crate) fn e_to_int(value: &str) -> anyhow::Result<String> {
//     let slices = value.split_once('e').unwrap();
//     Ok(slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
// }