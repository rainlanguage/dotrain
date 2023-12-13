use lsp_types::Position;
use num_bigint::BigUint;
use alloy_sol_types::sol;
use regex::{Match, Regex};
use alloy_primitives::Uint;
use std::convert::Infallible;
use serde::{Serialize, Deserialize};
use rain_meta::{RainMetaDocumentV1Item, magic::KnownMagic};
use revm::{
    EVM,
    db::{CacheDB, EmptyDBTyped},
    primitives::{U256, Bytecode, Bytes, AccountInfo, address, TransactTo, ResultAndState},
};
use crate::types::{
    ast::{ParsedItem, Offsets},
    HEX_PATTERN, BINARY_PATTERN, E_PATTERN, INT_PATTERN,
};

pub mod rainlang;
pub mod raindocument;

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

/// converts char offset to utf16 encoded equivelant offset
pub fn str_byte_to_utf16(s: &str, byte_pos: usize) -> anyhow::Result<usize> {
    if let Some(slc) = s.get(..byte_pos) {
        if slc.len() == slc.chars().count() {
            Ok(byte_pos)
        } else {
            Ok(slc.encode_utf16().count())
        }
    } else {
        Err(anyhow::anyhow!("bad byte offset"))
    }
}

/// converts char offset to utf16 encoded equivelant offset
pub fn string_byte_to_utf16(s: &String, byte_pos: usize) -> anyhow::Result<usize> {
    if let Some(slc) = s.get(..byte_pos) {
        if slc.len() == slc.chars().count() {
            Ok(byte_pos)
        } else {
            Ok(slc.encode_utf16().count())
        }
    } else {
        Err(anyhow::anyhow!("bad byte offset"))
    }
}

/// converts byte offset to utf16 encoded equivelant offset
pub fn str_char_to_utf16(s: &str, char_pos: usize) -> anyhow::Result<usize> {
    if let Some((byte_pos, _char)) = s.char_indices().nth(char_pos) {
        if let Some(slc) = s.get(..byte_pos) {
            if slc.len() == slc.chars().count() {
                Ok(byte_pos)
            } else {
                Ok(slc.encode_utf16().count())
            }
        } else {
            Err(anyhow::anyhow!("bad byte offset"))
        }
    } else {
        Err(anyhow::anyhow!("bad char offset"))
    }
}

/// converts byte offset to utf16 encoded equivelant offset
pub fn string_char_to_utf16(s: &String, char_pos: usize) -> anyhow::Result<usize> {
    if let Some((byte_pos, _char)) = s.char_indices().nth(char_pos) {
        if let Some(slc) = s.get(..byte_pos) {
            if slc.len() == slc.chars().count() {
                Ok(byte_pos)
            } else {
                Ok(slc.encode_utf16().count())
            }
        } else {
            Err(anyhow::anyhow!("bad byte offset"))
        }
    } else {
        Err(anyhow::anyhow!("bad char offset"))
    }
}

/// converts utf16 offset to utf8 encoded equivelant offset
pub fn str_utf16_to_utf8(s: &str, pos: usize) -> anyhow::Result<usize> {
    let b: Vec<u16> = s.encode_utf16().take(pos).collect();
    Ok(String::from_utf16(&b).map_err(anyhow::Error::from)?.len())
}

/// converts utf16 offset to utf8 encoded equivelant offset
pub fn string_utf16_to_utf8(s: &String, pos: usize) -> anyhow::Result<usize> {
    let b: Vec<u16> = s.encode_utf16().take(pos).collect();
    Ok(String::from_utf16(&b).map_err(anyhow::Error::from)?.len())
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
pub fn fill_in(text: &mut String, position: &Offsets) -> anyhow::Result<()> {
    text.replace_range(
        position[0]..position[1],
        &text
            .get(position[0]..position[1])
            .unwrap()
            .chars()
            .flat_map(|c| {
                if c.is_whitespace() {
                    vec![c]
                } else {
                    let mut x = vec![];
                    for _ in 0..c.len_utf8() {
                        x.push(' ');
                    }
                    x
                }
            })
            .collect::<String>(),
    );
    Ok(())
}

/// Fills a text with whitespaces excluding a position by keeping line structure intact
pub fn fill_out(text: &mut String, position: &Offsets) -> anyhow::Result<()> {
    text.replace_range(
        ..position[0],
        &text
            .get(..position[0])
            .ok_or(anyhow::anyhow!("wrong"))?
            .chars()
            .flat_map(|c| {
                if c.is_whitespace() {
                    vec![c]
                } else {
                    let mut x = vec![];
                    for _ in 0..c.len_utf8() {
                        x.push(' ');
                    }
                    x
                }
            })
            .collect::<String>(),
    );
    text.replace_range(
        position[1]..,
        &text
            .get(position[1]..)
            .ok_or(anyhow::anyhow!("wrong"))?
            .chars()
            .flat_map(|c| {
                if c.is_whitespace() {
                    vec![c]
                } else {
                    let mut x = vec![];
                    for _ in 0..c.len_utf8() {
                        x.push(' ');
                    }
                    x
                }
            })
            .collect::<String>(),
    );
    Ok(())
}

/// Trims a text (removing start/end whitespaces) with reporting the number of deletions
pub fn tracked_trim(s: &String) -> (String, usize, usize) {
    (
        s.trim().to_owned(),
        s.len() - s.trim_start().len(),
        s.len() - s.trim_end().len(),
    )
}

/// Trims a text (removing start/end whitespaces) with reporting the number of deletions
pub fn tracked_trim_str(s: &str) -> (String, usize, usize) {
    (
        s.trim().to_owned(),
        s.len() - s.trim_start().len(),
        s.len() - s.trim_end().len(),
    )
}

pub fn lines_inclusive(text: &String) -> std::str::SplitInclusive<'_, char> {
    text.split_inclusive('\n')
}

pub fn lines_inclusive_str(text: &str) -> std::str::SplitInclusive<'_, char> {
    text.split_inclusive('\n')
}

pub fn line_number(text: &String, pos: usize) -> usize {
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

pub fn line_number_str(text: &str, pos: usize) -> usize {
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

pub fn hex_str_to_u256(val: &str) -> U256 {
    let mut hex = val;
    if val.starts_with("0x") {
        hex = &val[2..];
    }
    U256::from_str_radix(hex, 16).unwrap()
}

pub fn hex_string_to_u256(val: &String) -> U256 {
    let mut hex = val.as_str();
    if val.starts_with("0x") {
        hex = &val[2..];
    }
    U256::from_str_radix(hex, 16).unwrap()
}

pub fn str_binary_to_bigint(value: &str) -> BigUint {
    BigUint::parse_bytes(&value[2..].as_bytes(), 2).unwrap()
}

pub fn string_binary_to_bigint(value: &String) -> BigUint {
    BigUint::parse_bytes(&value[2..].as_bytes(), 2).unwrap()
}

pub fn str_e_to_bigint(value: &str) -> anyhow::Result<BigUint> {
    let slices = value.split_once('e').unwrap();
    Ok(BigUint::parse_bytes(
        (slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
            .as_bytes(),
        10,
    )
    .ok_or(anyhow::anyhow!("out-of-range"))?)
}

pub fn string_e_to_bigint(value: &String) -> anyhow::Result<BigUint> {
    let slices = value.split_once('e').unwrap();
    Ok(BigUint::parse_bytes(
        (slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
            .as_bytes(),
        10,
    )
    .ok_or(anyhow::anyhow!("out-of-range"))?)
}

pub fn str_binary_to_int(value: &str) -> String {
    str_binary_to_bigint(value).to_str_radix(10)
}

pub fn string_binary_to_int(value: &String) -> String {
    string_binary_to_bigint(value).to_str_radix(10)
}

pub fn str_e_to_int(value: &str) -> anyhow::Result<String> {
    let slices = value.split_once('e').unwrap();
    Ok(slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
}

pub fn string_e_to_int(value: &str) -> anyhow::Result<String> {
    let slices = value.split_once('e').unwrap();
    Ok(slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
}

pub fn str_to_bigint(value: &str) -> anyhow::Result<BigUint> {
    if BINARY_PATTERN.is_match(value) {
        Ok(str_binary_to_bigint(value))
    } else if E_PATTERN.is_match(value) {
        Ok(str_e_to_bigint(value)?)
    } else if INT_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 10).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else if HEX_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 16).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else {
        Err(anyhow::anyhow!("value is not valid rainlang number!"))
    }
}

pub fn string_to_bigint(value: &str) -> anyhow::Result<BigUint> {
    if BINARY_PATTERN.is_match(value) {
        Ok(str_binary_to_bigint(value))
    } else if E_PATTERN.is_match(value) {
        Ok(str_e_to_bigint(value)?)
    } else if INT_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 10).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else if HEX_PATTERN.is_match(value) {
        Ok(BigUint::parse_bytes(value.as_bytes(), 16).ok_or(anyhow::anyhow!("out-of-range"))?)
    } else {
        Err(anyhow::anyhow!("value is not valid rainlang number!"))
    }
}

// /// Convert Rainlang numeric values to interger as string
// pub fn to_integer(value: &String) -> anyhow::Result<String> {
//     if BINARY_PATTERN.is_match(value) {
//         Ok(
//             num_bigint::BigUint::parse_bytes(&value[2..].as_bytes(), 2)
//             .ok_or(anyhow::anyhow!("out-of-range"))?
//             .to_str_radix(10)
//         )
//     } else if E_PATTERN.is_match(value) {
//         let slices = value.split_once('e').unwrap();
//         let u64s = num_bigint::BigUint::parse_bytes(slices.1.as_bytes(), 10).unwrap().t.to_u64_digits();
//         x.t
//         Ok(slices.0.to_owned() + &"0".repeat(slices.1.parse().map_err(anyhow::Error::from)?))
//     } else {
//         Ok
//     }
// }

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

sol! {
    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    interface NATIVE_PARSER_INTERFACE {
        // constructor(tuple(address interpreter, address store, bytes meta) config)
        event ExpressionAddress(address sender, address expression);
        event NewExpression(address sender, bytes bytecode, uint256[] constants, uint256[] minOutputs);
        event DISpair(address sender, address deployer, address interpreter, address store, bytes opMeta);
        error MaxSources();
        error WriteError();
        error ParenOverflow();
        error StackOverflow();
        // error StackUnderflow();
        error DanglingSource();
        error ParserOutOfBounds();
        error WordSize(string word);
        error DuplicateFingerprint();
        error UnknownWord(uint256 offset);
        error ExcessLHSItems(uint256 offset);
        error ExcessRHSItems(uint256 offset);
        error ExpectedOperand(uint256 offset);
        error OperandOverflow(uint256 offset);
        error TruncatedHeader(bytes bytecode);
        error TruncatedSource(bytes bytecode);
        error UnclosedOperand(uint256 offset);
        error MissingFinalSemi(uint256 offset);
        error ExpectedLeftParen(uint256 offset);
        error UnclosedLeftParen(uint256 offset);
        error UnexpectedComment(uint256 offset);
        error UnexpectedLHSChar(uint256 offset);
        error UnexpectedOperand(uint256 offset);
        error UnexpectedRHSChar(uint256 offset);
        error UnexpectedSources(bytes bytecode);
        error ZeroLengthDecimal(uint256 offset);
        error HexLiteralOverflow(uint256 offset);
        error NotAcceptingInputs(uint256 offset);
        error MalformedHexLiteral(uint256 offset);
        error OddLengthHexLiteral(uint256 offset);
        error UnexpectedRightParen(uint256 offset);
        error ZeroLengthHexLiteral(uint256 offset);
        error DuplicateLHSItem(uint256 errorOffset);
        error MalformedCommentStart(uint256 offset);
        error DecimalLiteralOverflow(uint256 offset);
        error TruncatedHeaderOffsets(bytes bytecode);
        error UnsupportedLiteralType(uint256 offset);
        error MalformedExponentDigits(uint256 offset);
        error UnexpectedPointers(bytes actualPointers);
        error UnexpectedTrailingOffsetBytes(bytes bytecode);
        error AuthoringMetaHashMismatch(bytes32 expected, bytes32 actual);
        error SourceIndexOutOfBounds(bytes bytecode, uint256 sourceIndex);
        error CallOutputsExceedSource(uint256 sourceOutputs, uint256 outputs);
        error StackSizingsNotMonotonic(bytes bytecode, uint256 relativeOffset);
        error StackOutputsMismatch(uint256 stackIndex, uint256 bytecodeOutputs);
        error BadDynamicLength(uint256 dynamicLength, uint256 standardOpsLength);
        error EntrypointNonZeroInput(uint256 entrypointIndex, uint256 inputsLength);
        error EntrypointMissing(uint256 expectedEntrypoints, uint256 actualEntrypoints);
        error StackAllocationMismatch(uint256 stackMaxIndex, uint256 bytecodeAllocation);
        error StackUnderflow(uint256 opIndex, uint256 stackIndex, uint256 calculatedInputs);
        error OutOfBoundsStackRead(uint256 opIndex, uint256 stackTopIndex, uint256 stackRead);
        error BadOpInputsLength(uint256 opIndex, uint256 calculatedInputs, uint256 bytecodeInputs);
        error StackUnderflowHighwater(uint256 opIndex, uint256 stackIndex, uint256 stackHighwater);
        error UnexpectedStoreBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash);
        error OutOfBoundsConstantRead(uint256 opIndex, uint256 constantsLength, uint256 constantRead);
        error EntrypointMinOutputs(uint256 entrypointIndex, uint256 outputsLength, uint256 minOutputs);
        error UnexpectedInterpreterBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash);
        error UnexpectedConstructionMetaHash(bytes32 expectedConstructionMetaHash, bytes32 actualConstructionMetaHash);
        function iStore() view returns (address);
        function parseMeta() pure returns (bytes);
        function iInterpreter() view returns (address);
        function authoringMetaHash() pure returns (bytes32);
        function integrityFunctionPointers() view returns (bytes);
        function parse(bytes data) pure returns (bytes, uint256[]);
        function buildParseMeta(bytes authoringMeta) pure returns (bytes);
        function supportsInterface(bytes4 interfaceId_) view returns (bool);
        function integrityCheck(bytes bytecode, uint256[] constants, uint256[] minOutputs) view;
        function deployExpression(bytes bytecode, uint256[] constants, uint256[] minOutputs) returns (address, address, address);
    }
}

/// Executes a contract runtime bytecode with given data
pub fn exec_bytecode(
    bytecode: &[u8],
    data: &[u8],
    evm: Option<&mut EVM<CacheDB<EmptyDBTyped<Infallible>>>>,
) -> anyhow::Result<ResultAndState> {
    let mut cache_db = CacheDB::new(revm::db::EmptyDB::default());
    let bcode = Bytecode::new_raw(Bytes::copy_from_slice(bytecode));
    cache_db.insert_account_info(
        address!("dAC17F958D2ee523a2206206994597C13D831ec7"),
        AccountInfo::new(Uint::ZERO, 0, bcode.hash_slow(), bcode),
    );

    let mut revm: &mut EVM<CacheDB<EmptyDBTyped<Infallible>>> = &mut EVM::new();
    if let Some(e) = evm {
        revm = e;
    };

    revm.database(cache_db);

    revm.env.tx.caller = address!("0000000000000000000000000000000000000000");
    revm.env.tx.transact_to =
        TransactTo::Call(address!("dAC17F958D2ee523a2206206994597C13D831ec7"));
    revm.env.tx.data = Bytes::copy_from_slice(data);
    revm.env.tx.value = U256::ZERO;

    let ref_tx = revm.transact_ref();
    match ref_tx {
        Ok(result_state) => return Ok(result_state),
        Err(e) => return Err(anyhow::Error::from(e)),
    }
}
