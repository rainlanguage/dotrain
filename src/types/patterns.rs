//! All Regular Expression patterns used for parsing texts

use regex::Regex;
use once_cell::sync::Lazy;

/// Illegal character pattern
pub static ILLEGAL_CHAR: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^ -~\s]+").unwrap());

/// Rainlang word pattern
pub static WORD_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z][0-9a-z-]*$").unwrap());

/// Import hash pattern
pub static HASH_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]{64}$").unwrap());

/// Rainlang numeric pattern
pub static NUMERIC_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$").unwrap());

/// Hex pattern
pub static HEX_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$").unwrap());

/// Binary pattern
pub static BINARY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0b[0-1]+$").unwrap());

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

/// the default elided binding msg
pub static DEFAULT_ELISION: &str = "elided binding, requires rebinding";

/// Lint patterns for RainDocument/RainlangDocument
pub mod lint_patterns {
    use regex::Regex;
    use once_cell::sync::Lazy;

    /// ignore next line
    pub static IGNORE_NEXT_LINE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"\bignore-next-line\b").unwrap());

    /// ignore words
    pub static IGNORE_WORDS: Lazy<Regex> = Lazy::new(|| Regex::new(r"\bignore-words\b").unwrap());

    /// ignore undefined words
    pub static IGNORE_UNDEFINED_WORDS: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"\bignore-undefined-words\b").unwrap());
}
