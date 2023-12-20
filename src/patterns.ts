/** 
 * Illegal character pattern 
 */
export const ILLEGAL_CHAR = /[^ -~\s]+/;

/** 
 * Rainlang word pattern 
 */
export const WORD_PATTERN = /^[a-z][0-9a-z-]*$/;

/** 
 * Import hash pattern 
 */
export const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/** 
 * Rainlang numeric pattern 
 */
export const NUMERIC_PATTERN = /^0x[0-9a-fA-F]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/;

/** 
 * Hex pattern 
 */
export const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;

/** 
 * Binary pattern 
 */
export const BINARY_PATTERN = /^0b[0-1]+$/;

/** 
 * e numberic pattern 
 */
export const E_PATTERN = /^[1-9]\d*e\d+$/;

/** 
 * Integer pattern 
 */
export const INT_PATTERN = /^\d+$/;

/** 
 * RainDocument Namespace pattern 
 */
export const NAMESPACE_PATTERN = /^(\.?[a-z][0-9a-z-]*)*\.?$/;

/** 
 * Comment pattern 
 */
export const COMMENT_PATTERN = /\/\*[\s\S]*?(?:\*\/|$)/;

/** 
 * whitespace pattern 
 */
export const WS_PATTERN = /\s+/;

/** 
 * binding dependency pattern 
 */
export const DEP_PATTERN = /'\.?[a-z][0-9a-z-]*(\.[a-z][0-9a-z-]*)*/;

/** 
 * import pattern 
 */
export const IMPORTS_PATTERN = /@/;

/** 
 * binding pattern 
 */
export const BINDING_PATTERN = /#/;

/** 
 * non-empty text pattern 
 */
export const NON_EMPTY_PATTERN = /[^\s]/;

/** 
 * operand arguments pattern 
 */
export const OPERAND_ARG_PATTERN = /^[0-9]+$|^0x[a-fA-F0-9]+$|^'\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

/** 
 * namespace segments delimitier pattern 
 */
export const NAMESPACE_SEGMENT_PATTERN = /\./;

/** 
 * rainlang source delimiter pattern 
 */
export const SOURCE_PATTERN = /;/;

/** 
 * rainlang line delimiter pattern 
 */
export const SUB_SOURCE_PATTERN = /,/;

/** 
 * any not whitespace pattern 
 */
export const ANY_PATTERN = /\S+/;

/** 
 * rainlang lhs pattern 
 */
export const LHS_PATTERN = /^[a-z][a-z0-9-]*$|^_$/;

/** 
 * Lint patterns for RainDocument/RainlangDocument 
 */
export namespace LintPatterns {
    /** 
     * ignore next line 
     */
    export const IGNORE_NEXT_LINE = /\bignore-next-line\b/;

    /** 
     * ignore words 
     */
    export const IGNORE_WORDS = /\bignore-words\b/;

    /** 
     * ignore undefined words 
     */
    export const IGNORE_UNDEFINED_WORDS = /\bignore-undefined-words\b/;
}
