use regex::Regex;
use once_cell::sync::Lazy;

/// Illegal character pattern
pub const ILLEGAL_CHAR: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^ -~\s]+").unwrap());

/// Rainlang word pattern
pub const WORD_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z][0-9a-z-]*$").unwrap());

/// Import hash pattern
pub const HASH_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]{64}$").unwrap());

/// Rainlang numeric pattern
pub const NUMERIC_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$").unwrap());

/// Hex pattern
pub const HEX_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0x[0-9a-fA-F]+$").unwrap());

/// Binary pattern
pub const BINARY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0b[0-1]+$").unwrap());

/// e numberic pattern
pub const E_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[1-9]\d*e\d+$").unwrap());

/// Integer pattern
pub const INT_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d+$").unwrap());

/// RainDocument Namespace pattern
pub const NAMESPACE_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^(\.?[a-z][0-9a-z-]*)*\.?$").unwrap());

/// Comment pattern
pub const COMMENT_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\/\*[\s\S]*?(?:\*\/|$)").unwrap());

/// whitespace pattern
pub const WS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+").unwrap());

/// binding dependency pattern
pub const DEP_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"'\.?[a-z][0-9a-z-]*(\.[a-z][0-9a-z-]*)*").unwrap());

/// import pattern
pub const IMPORTS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new("@").unwrap());

/// binding pattern
pub const BINDING_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new("#").unwrap());

/// non-empty text pattern
pub const NON_EMPTY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"[^\s]").unwrap());

/// operand arguments pattern
pub const OPERAND_ARG_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[0-9]+$|^0x[a-fA-F0-9]+$|^'\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$").unwrap()
});

/// namespace segments delimitier pattern
pub const NAMESPACE_SEGMENT_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\.").unwrap());

/// rainlang source delimiter pattern
pub const SOURCE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(";").unwrap());

/// rainlang line delimiter pattern
pub const SUB_SOURCE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(",").unwrap());

/// any not whitespace pattern
pub const ANY_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\S+").unwrap());

/// rainlang lhs pattern
pub const LHS_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-z][a-z0-9-]*$|^_$").unwrap());

/// the default elided binding msg
pub const DEFAULT_ELISION: &str = "elided binding, requires rebinding";

/// Lint patterns for RainDocument/RainlangDocument
pub struct LintPatterns;
impl LintPatterns {
    /// ignore next line
    pub const IGNORE_NEXT_LINE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"\bignore-next-line\b").unwrap());

    /// ignore words
    pub const IGNORE_WORDS: Lazy<Regex> = Lazy::new(|| Regex::new(r"\bignore-words\b").unwrap());

    /// ignore undefined words
    pub const IGNORE_UNDEFINED_WORDS: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"\bignore-undefined-words\b").unwrap());
}
