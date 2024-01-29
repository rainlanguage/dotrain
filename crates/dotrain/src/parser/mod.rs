use super::error::Error;
use regex::{Match, Regex};
use revm::primitives::U256;
use rain_meta::{RainMetaDocumentV1Item, KnownMagic};
use super::types::{
    ast::{ParsedItem, Offsets},
    patterns::{HEX_PATTERN, E_PATTERN, INT_PATTERN},
};

pub(crate) mod raindocument;
pub(crate) mod rainlangdocument;

pub use self::raindocument::*;
pub use self::rainlangdocument::*;

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

/// Parses a string by extracting the strings outside of matches
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
                        offset,
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
                        matches[matches.len() - 1].end() + offset,
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
pub fn fill_in(text: &mut String, position: Offsets) -> Result<(), Error> {
    text.replace_range(
        position[0]..position[1],
        &text
            .get(position[0]..position[1])
            .ok_or(Error::OutOfCharBoundry)?
            .chars()
            .map(|c| if c.is_whitespace() { c } else { ' ' })
            .collect::<String>(),
    );
    Ok(())
}

/// Fills a text with whitespaces excluding a position by keeping line structure intact
pub fn fill_out(text: &mut String, position: Offsets) -> Result<(), Error> {
    text.replace_range(
        ..position[0],
        &text
            .get(..position[0])
            .ok_or(Error::OutOfCharBoundry)?
            .chars()
            .map(|c| if c.is_whitespace() { c } else { ' ' })
            .collect::<String>(),
    );
    text.replace_range(
        position[1]..,
        &text
            .get(position[1]..)
            .ok_or(Error::OutOfCharBoundry)?
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

/// Calculates the line number of the given position in the given text
pub(crate) fn line_number(text: &str, pos: usize) -> usize {
    let lines: Vec<_> = text.split_inclusive('\n').collect();
    let lines_count = lines.len();
    if pos >= text.len() {
        lines_count
    } else {
        let mut _c = 0;
        for (i, &s) in lines.iter().enumerate() {
            _c += s.len();
            if pos <= _c {
                return i;
            }
        }
        0
    }
}

pub(crate) fn hex_to_u256(val: &str) -> Result<U256, Error> {
    let mut hex = val;
    if let Some(stripped) = val.strip_prefix("0x") {
        hex = stripped
    }
    Ok(U256::from_str_radix(hex, 16)?)
}

pub(crate) fn e_to_u256(value: &str) -> Result<U256, Error> {
    let slices = value.split_once('e').unwrap();
    let int = slices.0.to_owned() + &"0".repeat(slices.1.parse()?);
    Ok(U256::from_str_radix(&int, 10)?)
}

pub(crate) fn to_u256(value: &str) -> Result<U256, Error> {
    if E_PATTERN.is_match(value) {
        Ok(e_to_u256(value)?)
    } else if INT_PATTERN.is_match(value) {
        Ok(U256::from_str_radix(value, 10)?)
    } else if HEX_PATTERN.is_match(value) {
        Ok(hex_to_u256(value)?)
    } else {
        Err(Error::InvalidNumbericValue)
    }
}

/// Method to check if a meta sequence is consumable for a dotrain
pub(crate) fn is_consumable(items: &Vec<RainMetaDocumentV1Item>) -> bool {
    if !items.is_empty() {
        let mut dotrains = 0;
        for v in items {
            if matches!(v.magic, KnownMagic::DotrainV1) {
                dotrains += 1;
            }
            if dotrains > 1 {
                return false;
            }
        }
        !dotrains == 0
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use crate::parser::*;

    #[test]
    fn test_inclusive_parse() -> anyhow::Result<()> {
        let text = r"abcd eb
        qkbjh (aoib 124b)";
        let pattern = Regex::new(r"b\s").unwrap();

        let parsed_items = inclusive_parse(text, &pattern, 0);
        let expected = vec![
            ParsedItem("b\n".to_owned(), [6, 8]),
            ParsedItem("b ".to_owned(), [26, 28]),
        ];

        assert_eq!(parsed_items, expected);
        Ok(())
    }

    #[test]
    fn test_exclusive_parse() -> anyhow::Result<()> {
        let text = r"abcd eb
        qkbjh (aoib 124b)";
        let pattern = Regex::new(r"b\s").unwrap();

        let parsed_items = exclusive_parse(text, &pattern, 0, true);
        let expected = vec![
            ParsedItem("abcd e".to_owned(), [0, 6]),
            ParsedItem("        qkbjh (aoi".to_owned(), [8, 26]),
            ParsedItem("124b)".to_owned(), [28, 33]),
        ];

        assert_eq!(parsed_items, expected);
        Ok(())
    }

    #[test]
    fn test_fill_in() -> anyhow::Result<()> {
        let mut text = r"abcd eb
        qkbjh (aoib 124b)"
            .to_string();

        fill_in(&mut text, [23, 27])?;
        let expected = r"abcd eb
        qkbjh (     124b)";

        assert_eq!(text, expected);
        Ok(())
    }

    #[test]
    fn test_fill_out() -> anyhow::Result<()> {
        let mut text = r"abcd eb
        qkbjh (aoib 124b)"
            .to_string();

        fill_out(&mut text, [23, 27])?;
        let expected = r"       
               aoib      ";

        assert_eq!(text, expected);
        Ok(())
    }

    #[test]
    fn test_tracked_trim() -> anyhow::Result<()> {
        let text = " \n  abcd   \n\t";

        let result = tracked_trim(text);
        let expected = ("abcd", 4, 5);

        assert_eq!(result, expected);
        Ok(())
    }

    #[test]
    fn test_line_number() -> anyhow::Result<()> {
        let text = r"abcd
        efgh (123 876)

        zxcb;
        ";
        let result = line_number(text, 38);
        assert_eq!(result, 3);
        Ok(())
    }

    #[test]
    fn test_to_u256() -> anyhow::Result<()> {
        let hex = "0xabcd123";
        let int = "876123";
        let e = "5e13";

        let result = to_u256(hex)?;
        let expected = U256::from_str_radix("abcd123", 16)?;
        assert_eq!(result, expected);

        let result = to_u256(int)?;
        let expected = U256::from_str_radix("876123", 10)?;
        assert_eq!(result, expected);

        let result = to_u256(e)?;
        let expected = U256::from_str_radix("50000000000000", 10)?;
        assert_eq!(result, expected);

        Ok(())
    }
}