//! All Regular Expression patterns used for parsing texts

use regex::Regex;
use once_cell::sync::Lazy;

/// pragma keyword in rainlang
pub const PRAGMA_KEYWORD: &str = "using-words-from";

/// reserved keywords in rainlang
pub const KEYWORDS: [&str; 1] = [PRAGMA_KEYWORD];

/// front matter separator
pub const FRONTMATTER_SEPARATOR: &str = "---";

/// Illegal character pattern
pub static ILLEGAL_CHAR: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^ -~\s]+").unwrap());

/// word pattern
pub static WORD_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z][0-9a-z-]*$").unwrap());

/// Import hash pattern
pub static HASH_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]{64}$").unwrap());

/// numeric pattern
pub static NUMERIC_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$|^\d+$|^[1-9]\d*e\d+$").unwrap());

/// string literal pattern
pub static STRING_LITERAL_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"^\"[\s\S]*?\"$"#).unwrap());

/// Hex pattern
pub static HEX_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$").unwrap());

/// e numberic pattern
pub static E_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[1-9]\d*e\d+$").unwrap());

/// Integer pattern
pub static INT_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d+$").unwrap());

/// RainDocument Namespace pattern
pub static NAMESPACE_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(\.?[a-z][0-9a-z-]*)*\.?$").unwrap());

/// Comment pattern
pub static COMMENT_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\/\*[\s\S]*?(?:\*\/|$)").unwrap());

/// whitespace pattern
pub static WS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+").unwrap());

/// binding dependency pattern
pub static DEP_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"'\.?[a-z][0-9a-z-]*(\.[a-z][0-9a-z-]*)*").unwrap());

/// import pattern
pub static IMPORTS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new("@").unwrap());

/// binding pattern
pub static BINDING_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new("#").unwrap());

/// non-empty text pattern
pub static NON_EMPTY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^\s]").unwrap());

/// operand arguments pattern
pub static OPERAND_ARG_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9]+$|^0x[a-fA-F0-9]+$|^'\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$").unwrap()
});

/// namespace segments delimitier pattern
pub static NAMESPACE_SEGMENT_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.").unwrap());

/// rainlang source delimiter pattern
pub static SOURCE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(";").unwrap());

/// rainlang line delimiter pattern
pub static SUB_SOURCE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(",").unwrap());

/// any not whitespace pattern
pub static ANY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\S+").unwrap());

/// rainlang lhs pattern
pub static LHS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z][a-z0-9-]*$|^_$").unwrap());

/// sub parser pattern
pub static SUB_PARSER_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r#"^\[[\s\S]*?\]$"#).unwrap());

/// pragma pattern (keyword + ws + hex)
pub static PRAGMA_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(:?^|\s)using-words-from(\s+0x[0-9a-fA-F]*)?(:?\s|$)").unwrap());

/// pattern of end of a pragma definition
pub static PRAGMA_END_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"0x[0-9a-fA-F]*(\s|$)").unwrap());

/// the default elided binding msg
pub static DEFAULT_ELISION: &str = "elided binding, requires rebinding";

/// Lint patterns for RainDocument/RainlangDocument,
/// these patterns should be wrapped in a [COMMENT_PATTERN](super::COMMENT_PATTERN) when used
pub mod lint_patterns {
    use regex::Regex;
    use once_cell::sync::Lazy;

    /// ignores next line diagnostics
    pub static IGNORE_NEXT_LINE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"(:?*|\s)ignore-next-line(:?*|\s)").unwrap());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_patterns() -> anyhow::Result<()> {
        // valids
        for i in [
            "a", "aa", "aA", "aAa", "a0", "aa0", "aA0", "aA0a", "aA0a0", "", "a-", "a-a", "-", " ",
            "a ", "0", "_", "0a", "0A", "`", "```", "\n", "\t", "\r", ":",
        ] {
            assert!(
                !ILLEGAL_CHAR.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }
        // invalids
        for i in ["♥", "∴"] {
            assert!(ILLEGAL_CHAR.is_match(i), "String '{}' considered valid.", i);
        }

        // invalids
        for i in [
            "-abcd",
            "-abcd-efg",
            "1abcd-efg",
            "1234",
            "_abcd-efg",
            "AkjhJ-Qer",
        ] {
            assert!(
                !WORD_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in ["abcd", "abcd-efg", "abcd12-efg8", "a678", "a1876-"] {
            assert!(
                WORD_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in [
            "0x1234abcd",
            "x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefa",
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeg",
        ] {
            assert!(
                !HASH_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        ] {
            assert!(
                HASH_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["x123abcd", "123", "0b101", "4e15"] {
            assert!(!HEX_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in ["0x123abcd", "0x1234567890abcdef", "0x123AbcDeF"] {
            assert!(
                HEX_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["0x123abcdef", "0b10101", "4e15"] {
            assert!(!INT_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in ["123", "1234567890", "83276401"] {
            assert!(
                INT_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["1235657", "0x1234abcdf", "0b101110", "e18"] {
            assert!(!E_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in ["3e16", "2345e12987234", "101e1001"] {
            assert!(E_PATTERN.is_match(i), "String '{}' considered invalid.", i);
        }

        // invalids
        for i in [
            "_abcd-efg.hij10-",
            ".1abcd-jh.",
            "abcd_er",
            "123abcd.ert-ety",
            "qSE.asd98.E87-weR",
        ] {
            assert!(
                !NAMESPACE_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "abcd-efg",
            "abcd-efg.qwe2-wer-.kjh8.poi345.oiu",
            "a-12-asd.lkj8",
        ] {
            assert!(
                NAMESPACE_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in [
            "/ sjdkhfsfsdf /",
            "// asjkhdf",
            "/// kjhfdgd ",
            "\\* jkhjgk */",
        ] {
            assert!(
                !COMMENT_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "/* jhggf jhgj jkgkkytees54368 867 */",
            "/** kjhgkj */",
            "//** hjgjh 453sdratf jkghj */ khkj hjfghf",
        ] {
            assert!(
                COMMENT_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["k", "765", "/*&^", "-)("] {
            assert!(!WS_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in [" ", "\n", "\t", "\r", " \n \t"] {
            assert!(WS_PATTERN.is_match(i), "String '{}' considered invalid.", i);
        }

        // valids
        for i in ["abcd.iuy1-hg", "123jhg-jkkj", "'Ajh", "qwS.oiE34-qwe.qw"] {
            assert!(!DEP_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in ["'abcd123", "'a123.kjh-iuy.oiu12-oiu2-.mnm"] {
            assert!(
                DEP_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in [".sad-kjh", "Abd", "123abcd", "'Abcd.iuy1-oiu"] {
            assert!(
                !OPERAND_ARG_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "123456789",
            "0x123abcdefAdfe",
            "'abcd12-jh2.oiu.lkj89-",
            "'.asd12-wer.jh45-iu78.lk9",
        ] {
            assert!(
                OPERAND_ARG_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["-", "AbkE12", "12kjh", "-abcd-iuy", "sad12.jh5"] {
            assert!(!LHS_PATTERN.is_match(i), "String '{}' considered valid.", i);
        }
        // valids
        for i in ["abced67", "_", "as12-iuy-", "a12-456-678-"] {
            assert!(
                LHS_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in [r#"'ksdf iydsf'"#, r#"`ksdf iydsf`"#, r#"'ksdf iydsf""#] {
            assert!(
                !STRING_LITERAL_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [r#""ksdf iydsf""#, r#""ksdf #$%&$% ()( {} __!@ ksjdhf 487""#] {
            assert!(
                STRING_LITERAL_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in ["{123 jhgsdf}", "jkshdfksd kjshdfi ]", "(khku dtdyt 654)"] {
            assert!(
                !SUB_PARSER_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "[asd wer 123 34 fgh ]",
            "[sdfjkh iuysf idsf 1231- -]",
            "[kjsdf 89435 #$^&$ )_)_}{}]",
        ] {
            assert!(
                SUB_PARSER_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        // invalids
        for i in [
            "using-words-from123",
            "using-word-from 0x123",
            "using-words-from-g",
        ] {
            assert!(
                !PRAGMA_PATTERN.is_match(i),
                "String '{}' considered valid.",
                i
            );
        }
        // valids
        for i in [
            "using-words-from \n\t 0x123abcedf",
            " using-words-from \n\n 0x09835356abcdef84765932342efabcd72305471 ",
        ] {
            assert!(
                PRAGMA_PATTERN.is_match(i),
                "String '{}' considered invalid.",
                i
            );
        }

        Ok(())
    }
}
