use lsp_types::Position;
use num_bigint::BigUint;
use regex::{Match, Regex};
use revm::primitives::U256;
use rain_meta::{RainMetaDocumentV1Item, magic::KnownMagic};
use super::types::{
    ast::{ParsedItem, Offsets},
    patterns::{HEX_PATTERN, BINARY_PATTERN, E_PATTERN, INT_PATTERN, ILLEGAL_CHAR},
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
        let mut o = offset as u32;
        if offset >= self.len() {
            o = (self.len() - 1) as u32;
        };
        let mut line = 0u32;
        let mut character = 0u32;
        let mut counter = 0u32;
        let lines_lens: Vec<_> = self.split_inclusive('\n').map(|v| v.len()).collect();
        for len in lines_lens.iter() {
            if o <= counter + (*len as u32) {
                character = o as u32 - counter;
                return Position { line, character };
            } else {
                counter += *len as u32;
                line += 1;
            }
        }
        return Position { line, character };
    }
}

impl OffsetAt for &str {
    fn offset_at(&self, position: &Position) -> usize {
        let lines_lens: Vec<_> = self.split_inclusive('\n').map(|v| v.len()).collect();
        let mut offset = 0;
        for len in &lines_lens[..position.line as usize] {
            offset += len;
        }
        offset += position.character as usize;
        offset
    }
}

impl PositionAt for String {
    fn position_at(&self, offset: usize) -> Position {
        let mut o = offset as u32;
        if offset >= self.len() {
            o = (self.len() - 1) as u32;
        };
        let mut line = 0u32;
        let mut character = 0u32;
        let mut counter = 0u32;
        let lines_lens: Vec<_> = self.split_inclusive('\n').map(|v| v.len()).collect();
        for len in lines_lens.iter() {
            if o <= counter + (*len as u32) {
                character = o as u32 - counter;
                return Position { line, character };
            } else {
                counter += *len as u32;
                line += 1;
            }
        }
        return Position { line, character };
    }
}

impl OffsetAt for String {
    fn offset_at(&self, position: &Position) -> usize {
        let lines_lens: Vec<_> = self.split_inclusive('\n').map(|v| v.len()).collect();
        let mut offset = 0;
        if position.line > lines_lens.len() as u32 {
            return self.len() - 1;
        } else {
            for len in &lines_lens[..position.line as usize] {
                offset += len;
            }
            if position.character as usize >= lines_lens[position.line as usize] {
                offset += lines_lens[position.line as usize] - 1;
            } else {
                offset += position.character as usize;
            }
            offset
        }
    }
}

/// converts utf16 offset to utf8 encoded equivelant offset
pub fn str_utf16_to_utf8(s: &str, pos: usize) -> anyhow::Result<usize> {
    let b: Vec<u16> = s.encode_utf16().take(pos).collect();
    Ok(String::from_utf16(&b).map_err(anyhow::Error::from)?.len())
}

/// Finds illegal chars as utf16 encoded
pub fn illegal_char_utf16(text: &str) -> Vec<ParsedItem> {
    let mut utf16_offset = 0;
    ILLEGAL_CHAR
        .find_iter(text)
        .map(|m| {
            let c = m.as_str().to_owned();
            let utf16_len = c.encode_utf16().count();
            let start = m.start() - utf16_offset;
            utf16_offset += c.len() - utf16_len;
            ParsedItem(c, [start, start + utf16_len])
        })
        .collect()
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

pub fn hex_to_u256(val: &str) -> U256 {
    let mut hex = val;
    if val.starts_with("0x") {
        hex = &val[2..];
    }
    U256::from_str_radix(hex, 16).unwrap()
}

pub fn binary_to_bigint(value: &str) -> BigUint {
    BigUint::parse_bytes(&value[2..].as_bytes(), 2).unwrap()
}

pub fn e_to_bigint(value: &str) -> anyhow::Result<BigUint> {
    let slices = value.split_once('e').unwrap();
    Ok(BigUint::parse_bytes(
        (slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
            .as_bytes(),
        10,
    )
    .ok_or(anyhow::anyhow!("out-of-range"))?)
}

pub fn binary_to_int(value: &str) -> String {
    binary_to_bigint(value).to_str_radix(10)
}

pub fn e_to_int(value: &str) -> anyhow::Result<String> {
    let slices = value.split_once('e').unwrap();
    Ok(slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
}

pub fn to_bigint(value: &str) -> anyhow::Result<BigUint> {
    if BINARY_PATTERN.is_match(value) {
        Ok(binary_to_bigint(value))
    } else if E_PATTERN.is_match(value) {
        Ok(e_to_bigint(value)?)
    } else if INT_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 10).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else if HEX_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 16).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else {
        Err(anyhow::anyhow!("value is not valid rainlang number!"))
    }
}

/// Method to check if a meta sequence is consumable for a dotrain
pub fn is_consumable(items: &Vec<RainMetaDocumentV1Item>) -> bool {
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
