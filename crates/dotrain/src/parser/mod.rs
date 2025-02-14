use regex::{Match, Regex};
use super::error::{Error, ErrorCode};
use rain_metadata::{RainMetaDocumentV1Item, KnownMagic};
use super::types::{
    ast::*,
    patterns::{NAMESPACE_SEGMENT_PATTERN, WORD_PATTERN},
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
pub fn line_number(text: &str, pos: usize) -> usize {
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

/// Method to check if a meta sequence is consumable for a dotrain
pub(crate) fn is_consumable(items: &Vec<RainMetaDocumentV1Item>) -> bool {
    if !items.is_empty() {
        let mut dotrains = 0;
        for v in items {
            if v.magic == KnownMagic::DotrainV1 {
                dotrains += 1;
            }
            if dotrains > 1 {
                return false;
            }
        }
        dotrains == 1
    } else {
        false
    }
}

/// Search in namespaces for a binding
pub(crate) fn search_binding_ref<'a>(query: &str, namespace: &'a Namespace) -> Option<&'a Binding> {
    let mut segments: &[ParsedItem] = &exclusive_parse(query, &NAMESPACE_SEGMENT_PATTERN, 0, true);
    if query.starts_with('.') {
        segments = &segments[1..];
    }
    if segments.len() > 32 {
        return None;
    }
    if segments[segments.len() - 1].0.is_empty() {
        return None;
    }
    if segments.iter().any(|v| !WORD_PATTERN.is_match(&v.0)) {
        return None;
    }

    if let Some(namespace_item) = namespace.get(&segments[0].0) {
        let mut result = namespace_item;
        let iter = segments[1..].iter();
        for segment in iter {
            match result {
                NamespaceItem::Node(node) => {
                    if let Some(namespace_item) = node.get(&segment.0) {
                        result = namespace_item;
                    } else {
                        return None;
                    }
                }
                _ => {
                    return None;
                }
            }
        }
        match result {
            NamespaceItem::Node(_node) => None,
            NamespaceItem::Leaf(leaf) => Some(&leaf.element),
        }
    } else {
        None
    }
}

// reads quotes recursively up until it is ended by not quote or the level limit is reached
pub(crate) fn deep_read_quote<'a>(
    name: &'a str,
    namespace: &'a Namespace,
    quote_chain: &mut Vec<&'a str>,
    limit: &mut isize,
    position: Offsets,
    original_key: &'a str,
) -> Result<&'a str, Problem> {
    *limit -= 1;
    if *limit >= 0 {
        if let Some(b) = search_binding_ref(name, namespace) {
            match &b.item {
                BindingItem::Elided(e) => {
                    Err(ErrorCode::ElidedBinding.to_problem(vec![original_key, &e.msg], position))
                }
                BindingItem::Literal(_c) => {
                    Err(ErrorCode::InvalidLiteralQuote.to_problem(vec![original_key], position))
                }
                BindingItem::Quote(q) => {
                    if quote_chain.contains(&q.quote.as_str()) {
                        Err(ErrorCode::CircularDependency.to_problem(vec![], position))
                    } else {
                        quote_chain.push(&q.quote);
                        deep_read_quote(
                            &q.quote,
                            namespace,
                            quote_chain,
                            limit,
                            position,
                            original_key,
                        )
                    }
                }
                BindingItem::Exp(_e) => Ok(name),
            }
        } else {
            Err(ErrorCode::UndefinedQuote.to_problem(vec![original_key], position))
        }
    } else {
        Err(ErrorCode::DeepQuote.to_problem(vec![], position))
    }
}

/// Parse a single key-value pair from cli arg.
/// This is implemented from examples in clap crate docs:
/// https://docs.rs/clap/latest/clap/builder/struct.ValueParser.html#example-1
pub fn parse_cli_key_val(
    key_value_pair: &str,
) -> Result<Rebind, Box<dyn std::error::Error + Send + Sync + 'static>> {
    let pos = key_value_pair
        .find('=')
        .ok_or_else(|| format!("invalid key=value: no `=` found in `{key_value_pair}`"))?;
    Ok(Rebind(
        key_value_pair[..pos].to_owned(),
        key_value_pair[pos + 1..].to_owned(),
    ))
}

#[cfg(test)]
mod tests {
    use crate::parser::*;

    #[test]
    fn test_parse_cli_key_val() {
        let key_value_pair = "key=value";
        let result = parse_cli_key_val(key_value_pair).unwrap();

        assert_eq!(result.0, "key");
        assert_eq!(result.1, "value");
    }

    #[test]
    fn test_inclusive_parse() {
        let text = r"abcd eb
        qkbjh (aoib 124b)";
        let pattern = Regex::new(r"b\s").unwrap();

        let parsed_items = inclusive_parse(text, &pattern, 0);
        let expected = vec![
            ParsedItem("b\n".to_owned(), [6, 8]),
            ParsedItem("b ".to_owned(), [26, 28]),
        ];

        assert_eq!(parsed_items, expected);
    }

    #[test]
    fn test_exclusive_parse() {
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
    }

    #[test]
    fn test_fill_in() {
        let mut text = r"abcd eb
        qkbjh (aoib 124b)"
            .to_string();

        fill_in(&mut text, [23, 27]).unwrap();
        let expected = r"abcd eb
        qkbjh (     124b)";

        assert_eq!(text, expected);
    }

    #[test]
    fn test_fill_out() {
        let mut text = r"abcd eb
        qkbjh (aoib 124b)"
            .to_string();

        fill_out(&mut text, [23, 27]).unwrap();
        let expected = r"       
               aoib      ";

        assert_eq!(text, expected);
    }

    #[test]
    fn test_tracked_trim() {
        let text = " \n  abcd   \n\t";

        let result = tracked_trim(text);
        let expected = ("abcd", 4, 5);

        assert_eq!(result, expected);
    }

    #[test]
    fn test_line_number() {
        let text = r"abcd
        efgh (123 876)

        zxcb;
        ";
        let result = line_number(text, 38);
        assert_eq!(result, 3);
    }
}
