//! Provides helper functions to easily deploy, call and transact with a local [mod@revm]
//!
//! It contains functions from creating a revm with empty in-memory cached database to deploying
//! contracts, executinga contract method and even executing a contracts raw runtime bytecode
//!
//! ## Example
//! ```rust
//! use dotrain::evm_helpers::*;
//!
//! // create a new revm instance with empty database
//! let mut revm = new_evm();
//!
//! // some contract bytecode and construction encoded data
//! let contract_bytecode: Vec<u8> = vec![];
//! let contruction_data : Vec<u8> = vec![];
//!
//! // deploy the contract into revm instance
//! let deployment_result = deploy_contract(&contract_bytecode, &contruction_data, &mut revm);
//! match deployment_result {
//!     Err(e) => println!("failed to deploy {:?}", e),
//!     Ok(address) => {
//!         println!("{:?}", address);
//!         
//!         // some contract function encoded calldata
//!         let function_calldata: Vec<u8> = vec![];
//!         let exec_reult = exec_contract(address, &function_calldata, false, &mut revm, None);
//!     }
//! }
//! ```

use super::ParseResult;
use crate::error::Error;
use rain_meta::NPE2Deployer;
use self::INativeParser::{INativeParserErrors, parseCall, deployExpression2Call};

pub use alloy_primitives::Uint;
pub use alloy_sol_types::{sol, SolCall, SolInterface, SolValue};
pub use revm::{
    EVM,
    db::{CacheDB, EmptyDB},
    primitives::{
        U256, ExecutionResult, Bytes, AccountInfo, Bytecode, TransactTo, Output, SpecId, Address,
        address,
    },
};

/// Parse a text using NativeParser contract bytecode
pub fn npe2_parse(
    text: &str,
    npe2_deployer: &NPE2Deployer,
    evm: Option<&mut EVM<CacheDB<EmptyDB>>>,
) -> Result<ParseResult, Error> {
    let mut revm = &mut new_evm();
    if let Some(_evm) = evm {
        revm = _evm;
    }

    let data = parseCall {
        data: text.as_bytes().to_vec(),
    }
    .abi_encode();

    let parser_address = address!("921232a9244d53d104c3001fbac2d15524158c65");
    match exec_bytecode(
        &npe2_deployer.parser,
        &data,
        parser_address,
        Some(revm),
        None,
    )?
    .try_into()?
    {
        ParseResult::Success(exp_conf) => {
            let store_address = address!("0f6fa4730b95c154f470dff1ba7263f37f2615b6");
            let store_bytecode = Bytecode::new_raw(Bytes::copy_from_slice(&npe2_deployer.store));
            let store_account_info =
                AccountInfo::new(Uint::ZERO, 0, store_bytecode.hash_slow(), store_bytecode);
            insert_acount(store_address, store_account_info, revm)?;

            let interpreter_address = address!("b0de12945c5952cd524704b2de01e5234fddb566");
            let interpreter_bytecode =
                Bytecode::new_raw(Bytes::copy_from_slice(&npe2_deployer.interpreter));
            let interpreter_account_info = AccountInfo::new(
                Uint::ZERO,
                0,
                interpreter_bytecode.hash_slow(),
                interpreter_bytecode,
            );
            insert_acount(interpreter_address, interpreter_account_info, revm)?;

            let constructor_data = NativeParserConstructionConfig {
                interpreter: interpreter_address.0 .0.into(),
                store: store_address.0 .0.into(),
                parser: parser_address.0 .0.into(),
                meta: npe2_deployer.meta_bytes.clone(),
            }
            .abi_encode();

            match deploy_contract(&npe2_deployer.bytecode, &constructor_data, revm) {
                Err(e) => match e {
                    Ok(v) => match v {
                        ExecutionResult::Revert { output, .. } => Ok(ParseResult::Revert(
                            INativeParserErrors::abi_decode(&output.0, true)?,
                        )),
                        ExecutionResult::Halt { reason, .. } => Ok(ParseResult::Halt(reason)),
                        ExecutionResult::Success { .. } => {
                            Err(Error::InvalidExpressionDeployerData)
                        }
                    },
                    Err(e) => Err(e),
                },
                Ok(deployer_address) => {
                    let data = deployExpression2Call {
                        bytecode: exp_conf.bytecode.clone(),
                        constants: exp_conf.constants.clone(),
                    }
                    .abi_encode();
                    match exec_contract(deployer_address, &data, true, revm, None)? {
                        ExecutionResult::Success { .. } => Ok(ParseResult::Success(exp_conf)),
                        ExecutionResult::Revert { output, .. } => Ok(ParseResult::Revert(
                            INativeParserErrors::abi_decode(&output.0, true)?,
                        )),
                        ExecutionResult::Halt { reason, .. } => Ok(ParseResult::Halt(reason)),
                    }
                }
            }
        }
        other => Ok(other),
    }
}

/// creates a fresh revm instance with empty cache databse
pub fn new_evm() -> EVM<CacheDB<EmptyDB>> {
    let db = CacheDB::new(EmptyDB::new());
    let mut evm = EVM::new();
    evm.env.cfg.spec_id = SpecId::LATEST;
    // evm.env.cfg.perf_analyse_created_bytecodes = AnalysisKind::Raw;
    // evm.env.cfg.limit_contract_code_size = Some(0x1000000);
    evm.database(db);
    evm
}

/// Executes a contract runtime bytecode(deployed bytecode) with given data
pub fn exec_bytecode(
    deployed_bytecode: &[u8],
    data: &[u8],
    address: Address, // address to load the bytecode into
    evm: Option<&mut EVM<CacheDB<EmptyDB>>>,
    caller: Option<Address>,
) -> Result<ExecutionResult, Error> {
    let mut revm = &mut new_evm();
    if let Some(_evm) = evm {
        revm = _evm;
    }

    let bcode = Bytecode::new_raw(Bytes::copy_from_slice(deployed_bytecode));
    if revm.db().is_none() {
        return Err(Error::NoDatabaseAttached);
    }
    revm.db().unwrap().insert_account_info(
        address,
        AccountInfo::new(Uint::ZERO, 0, bcode.hash_slow(), bcode),
    );

    if let Some(c) = caller {
        revm.env.tx.caller = c;
    };
    revm.env.tx.transact_to = TransactTo::call(address);
    revm.env.tx.data = Bytes::copy_from_slice(data);
    revm.env.tx.value = U256::ZERO;

    let tx_result = revm.transact_ref();
    match tx_result {
        Ok(result_state) => Ok(result_state.result),
        Err(e) => Err(e)?,
    }
}

/// executes a contract method at the given address and with the given encoded calldata
pub fn exec_contract(
    contract_address: Address,
    calldata: &[u8],
    write_call: bool,
    evm: &mut EVM<CacheDB<EmptyDB>>,
    caller: Option<Address>,
) -> Result<ExecutionResult, Error> {
    if let Some(c) = caller {
        evm.env.tx.caller = c;
    };
    evm.env.tx.transact_to = TransactTo::Call(contract_address);
    evm.env.tx.data = Bytes::copy_from_slice(calldata);
    evm.env.tx.value = U256::ZERO;

    if write_call {
        match evm.transact_commit() {
            Err(e) => Err(e)?,
            Ok(v) => Ok(v),
        }
    } else {
        match evm.transact_ref() {
            Err(e) => Err(e)?,
            Ok(v) => Ok(v.result),
        }
    }
}

/// inserts an account/contract into the revm
pub fn insert_acount(
    address: Address,
    account_info: AccountInfo,
    evm: &mut EVM<CacheDB<EmptyDB>>,
) -> Result<(), Error> {
    if let Some(db) = evm.db() {
        db.insert_account_info(address, account_info);
        Ok(())
    } else {
        Err(Error::NoDatabaseAttached)
    }
}

/// deploys a contract in revm with
pub fn deploy_contract(
    bytecode: &[u8],
    construction_data: &[u8],
    evm: &mut EVM<CacheDB<EmptyDB>>,
) -> Result<Address, Result<ExecutionResult, Error>> {
    let mut data = vec![];
    data.extend_from_slice(bytecode);
    data.extend_from_slice(construction_data);

    evm.env.tx.transact_to = TransactTo::create();
    evm.env.tx.data = Bytes::copy_from_slice(&data);
    evm.env.tx.value = U256::ZERO;

    match evm.transact_commit() {
        Err(e) => Err(Err(Error::EVMError(e))),
        Ok(deploy_result) => {
            if let ExecutionResult::Success {
                output: Output::Create(_, Some(a)),
                ..
            } = &deploy_result
            {
                Ok(*a)
            } else {
                Err(Ok(deploy_result))
            }
        }
    }
}

// @TODO - pull error selectors from the interpreter repo
sol! {
    /// NativeParser construction struct
    ///
    /// Used with [mod@alloy_json_abi] and [mod@alloy_primitives] crates to easily encode
    /// construction data for deploying an ExpressionDeployer contract into
    /// local [mod@revm]
    struct NativeParserConstructionConfig {
        address interpreter;
        address store;
        address parser;
        bytes meta;
    }

    /// NativeParser solidity/rust interface
    ///
    /// Used with [mod@alloy_json_abi] and [mod@alloy_primitives] crates to easily encode/decode
    /// function calldata/return data and decode errors of a NativeParser ExpressionDeployer contract
    /// methods execution result
    #[derive(Debug, serde::Serialize, serde::Deserialize, PartialEq)]
    interface INativeParser {
        event Set(uint256 namespace, uint256 key, uint256 value);
        event NewExpression(address sender, bytes bytecode, uint256[] constants);
        event DISPair(address sender, address interpreter, address store, address parser, bytes meta);
        event DeployedExpression(address sender, address interpreter, address store, address expression, bytes io);

        error ReadError();
        error WriteError();
        error MaxSources();
        error ParenOverflow();
        error DanglingSource();
        error ParserOutOfBounds();
        error ParseStackOverflow();
        error UniswapV2ZeroAmount();
        error ParseStackUnderflow();
        error WordSize(string word);
        error UniswapV2ZeroAddress();
        error UniswapV2ZeroLiquidity();
        error UniswapV2ZeroInputAmount();
        error ZeroLengthBitwiseEncoding();
        error UniswapV2ZeroOutputAmount();
        error UnknownWord(uint256 offset);
        error OddSetLength(uint256 length);
        error UniswapV2IdenticalAddresses();
        error StringTooLong(uint256 offset);
        error ExcessLHSItems(uint256 offset);
        error ExcessRHSItems(uint256 offset);
        error TruncatedHeader(bytes bytecode);
        error TruncatedSource(bytes bytecode);
        error ExpectedOperand(uint256 offset);
        error OperandOverflow(uint256 offset);
        error UnclosedComment(uint256 offset);
        error UnclosedOperand(uint256 offset);
        error MissingFinalSemi(uint256 offset);
        error UnexpectedSources(bytes bytecode);
        error NoConditionsMet(uint256 condCode);
        error ExpectedLeftParen(uint256 offset);
        error UnclosedLeftParen(uint256 offset);
        error UnexpectedComment(uint256 offset);
        error UnexpectedLHSChar(uint256 offset);
        error UnexpectedOperand(uint256 offset);
        error UnexpectedRHSChar(uint256 offset);
        error ZeroLengthDecimal(uint256 offset);
        error HexLiteralOverflow(uint256 offset);
        error NotAcceptingInputs(uint256 offset);
        error NotAnExternContract(address extern);
        error MalformedHexLiteral(uint256 offset);
        error OddLengthHexLiteral(uint256 offset);
        error InvalidAddressLength(uint256 offset);
        error UnexpectedRightParen(uint256 offset);
        error ZeroLengthHexLiteral(uint256 offset);
        error DuplicateLHSItem(uint256 errorOffset);
        error MalformedCommentStart(uint256 offset);
        error UnclosedStringLiteral(uint256 offset);
        error TruncatedHeaderOffsets(bytes bytecode);
        error DecimalLiteralOverflow(uint256 offset);
        error UnsupportedLiteralType(uint256 offset);
        error MalformedExponentDigits(uint256 offset);
        error UnexpectedTrailingOffsetBytes(bytes bytecode);
        error PRBMath_MulDiv18_Overflow(uint256 x, uint256 y);
        error NoWhitespaceAfterUsingWordsFrom(uint256 offset);
        error UnsupportedBitwiseShiftAmount(uint256 shiftAmount);
        error EnsureFailed(uint256 ensureCode, uint256 errorIndex);
        error InputsLengthMismatch(uint256 expected, uint256 actual);
        error TruncatedBitwiseEncoding(uint256 startBit, uint256 length);
        error SourceIndexOutOfBounds(bytes bytecode, uint256 sourceIndex);
        error BadOutputsLength(uint256 expectedLength, uint256 actualLength);
        error CallOutputsExceedSource(uint256 sourceOutputs, uint256 outputs);
        error StackSizingsNotMonotonic(bytes bytecode, uint256 relativeOffset);
        error StackOutputsMismatch(uint256 stackIndex, uint256 bytecodeOutputs);
        error BadDynamicLength(uint256 dynamicLength, uint256 standardOpsLength);
        error PRBMath_MulDiv_Overflow(uint256 x, uint256 y, uint256 denominator);
        error StackAllocationMismatch(uint256 stackMaxIndex, uint256 bytecodeAllocation);
        error StackUnderflow(uint256 opIndex, uint256 stackIndex, uint256 calculatedInputs);
        error OutOfBoundsStackRead(uint256 opIndex, uint256 stackTopIndex, uint256 stackRead);
        error BadOpInputsLength(uint256 opIndex, uint256 calculatedInputs, uint256 bytecodeInputs);
        error StackUnderflowHighwater(uint256 opIndex, uint256 stackIndex, uint256 stackHighwater);
        error UnexpectedStoreBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash);
        error UnexpectedParserBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash);
        error OutOfBoundsConstantRead(uint256 opIndex, uint256 constantsLength, uint256 constantRead);
        error UnexpectedInterpreterBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash);
        error UnexpectedConstructionMetaHash(bytes32 expectedConstructionMetaHash, bytes32 actualConstructionMetaHash);

        function iStore() view returns (address);
        function iParser() view returns (address);
        function iInterpreter() view returns (address);
        function set(uint256 namespace, uint256[] kvs);
        function functionPointers() view returns (bytes);
        function integrityFunctionPointers() view returns (bytes);
        function parse(bytes data) pure returns (bytes, uint256[]);
        function expectedConstructionMetaHash() pure returns (bytes32);
        function supportsInterface(bytes4 interfaceId) view returns (bool);
        function get(uint256 namespace, uint256 key) view returns (uint256);
        function deployExpression2(bytes bytecode, uint256[] constants) returns (address, address, address, bytes);
        function eval2(address store, uint256 namespace, uint256 dispatch, uint256[][] context, uint256[] inputs) view returns (uint256[], uint256[]);
    }
}
