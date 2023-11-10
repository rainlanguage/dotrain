[Home](../index.md) &gt; [NATIVE\_PARSER\_FULL\_SIGHASH](./native_parser_full_sighash.md)

# Variable NATIVE\_PARSER\_FULL\_SIGHASH

Full sighash of all native parser's selectors

<b>Signature:</b>

```typescript
NATIVE_PARSER_FULL_SIGHASH: {
    readonly 3463334474: "event ExpressionAddress(address sender, address expression)";
    readonly 1246295382: "event NewExpression(address sender, bytes bytecode, uint256[] constants, uint256[] minOutputs)";
    readonly 394826522: "event DISpair(address sender, address deployer, address interpreter, address store, bytes opMeta)";
    readonly 2818975809: "error MaxSources()";
    readonly 148155318: "error WriteError()";
    readonly 1647506137: "error ParenOverflow()";
    readonly 2723985969: "error StackOverflow()";
    readonly 2240753103: "error DanglingSource()";
    readonly 73866496: "error StackUnderflow()";
    readonly 2102812150: "error ParserOutOfBounds()";
    readonly 3833587895: "error WordSize(string word)";
    readonly 1495874641: "error DuplicateFingerprint()";
    readonly 2176665819: "error UnknownWord(uint256 offset)";
    readonly 1125551720: "error ExcessLHSItems(uint256 offset)";
    readonly 2028939138: "error ExcessRHSItems(uint256 offset)";
    readonly 604143044: "error ExpectedOperand(uint256 offset)";
    readonly 1954596740: "error OperandOverflow(uint256 offset)";
    readonly 3783254: "error TruncatedHeader(bytes bytecode)";
    readonly 4223140474: "error TruncatedSource(bytes bytecode)";
    readonly 1915540042: "error UnclosedOperand(uint256 offset)";
    readonly 4033828047: "error MissingFinalSemi(uint256 offset)";
    readonly 599115498: "error ExpectedLeftParen(uint256 offset)";
    readonly 1873878236: "error UnclosedLeftParen(uint256 offset)";
    readonly 3987541080: "error UnexpectedComment(uint256 offset)";
    readonly 1428202775: "error UnexpectedLHSChar(uint256 offset)";
    readonly 4162939989: "error UnexpectedOperand(uint256 offset)";
    readonly 1317027318: "error UnexpectedRHSChar(uint256 offset)";
    readonly 3490962013: "error UnexpectedSources(bytes bytecode)";
    readonly 4200956542: "error ZeroLengthDecimal(uint256 offset)";
    readonly 4281293129: "error HexLiteralOverflow(uint256 offset)";
    readonly 2870820519: "error NotAcceptingInputs(uint256 offset)";
    readonly 1777460198: "error MalformedHexLiteral(uint256 offset)";
    readonly 3614284631: "error OddLengthHexLiteral(uint256 offset)";
    readonly 2141041986: "error UnexpectedRightParen(uint256 offset)";
    readonly 3344749833: "error ZeroLengthHexLiteral(uint256 offset)";
    readonly 1407647418: "error DuplicateLHSItem(uint256 errorOffset)";
    readonly 1044846236: "error MalformedCommentStart(uint256 offset)";
    readonly 2401984509: "error DecimalLiteralOverflow(uint256 offset)";
    readonly 401914974: "error TruncatedHeaderOffsets(bytes bytecode)";
    readonly 2967791027: "error UnsupportedLiteralType(uint256 offset)";
    readonly 20654762: "error MalformedExponentDigits(uint256 offset)";
    readonly 2553668610: "error UnexpectedPointers(bytes actualPointers)";
    readonly 3731337882: "error UnexpectedTrailingOffsetBytes(bytes bytecode)";
    readonly 650907628: "error AuthoringMetaHashMismatch(bytes32 expected, bytes32 actual)";
    readonly 810064605: "error SourceIndexOutOfBounds(bytes bytecode, uint256 sourceIndex)";
    readonly 4279464200: "error CallOutputsExceedSource(uint256 sourceOutputs, uint256 outputs)";
    readonly 3941883727: "error StackSizingsNotMonotonic(bytes bytecode, uint256 relativeOffset)";
    readonly 1183445171: "error StackOutputsMismatch(uint256 stackIndex, uint256 bytecodeOutputs)";
    readonly 3367332097: "error BadDynamicLength(uint256 dynamicLength, uint256 standardOpsLength)";
    readonly 4002222209: "error EntrypointNonZeroInput(uint256 entrypointIndex, uint256 inputsLength)";
    readonly 4254997236: "error EntrypointMissing(uint256 expectedEntrypoints, uint256 actualEntrypoints)";
    readonly 1302075612: "error StackAllocationMismatch(uint256 stackMaxIndex, uint256 bytecodeAllocation)";
    readonly 749431807: "error StackUnderflow(uint256 opIndex, uint256 stackIndex, uint256 calculatedInputs)";
    readonly 3936448307: "error OutOfBoundsStackRead(uint256 opIndex, uint256 stackTopIndex, uint256 stackRead)";
    readonly 3723845745: "error BadOpInputsLength(uint256 opIndex, uint256 calculatedInputs, uint256 bytecodeInputs)";
    readonly 465939215: "error StackUnderflowHighwater(uint256 opIndex, uint256 stackIndex, uint256 stackHighwater)";
    readonly 1214343835: "error UnexpectedStoreBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash)";
    readonly 3950548052: "error OutOfBoundsConstantRead(uint256 opIndex, uint256 constantsLength, uint256 constantRead)";
    readonly 4158480799: "error EntrypointMinOutputs(uint256 entrypointIndex, uint256 outputsLength, uint256 minOutputs)";
    readonly 528747054: "error UnexpectedInterpreterBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash)";
    readonly 1491565011: "error UnexpectedConstructionMetaHash(bytes32 expectedConstructionMetaHash, bytes32 actualConstructionMetaHash)";
    readonly 3247711164: "function iStore() view returns (address)";
    readonly 4290926340: "function parseMeta() pure returns (bytes)";
    readonly 4040154423: "function iInterpreter() view returns (address)";
    readonly 3066500954: "function authoringMetaHash() pure returns (bytes32)";
    readonly 2371962257: "function integrityFunctionPointers() view returns (bytes)";
    readonly 4206102650: "function parse(bytes data) pure returns (bytes, uint256[])";
    readonly 2785066250: "function buildParseMeta(bytes authoringMeta) pure returns (bytes)";
    readonly 33540519: "function supportsInterface(bytes4 interfaceId_) view returns (bool)";
    readonly 3417821555: "function integrityCheck(bytes bytecode, uint256[] constants, uint256[] minOutputs) view";
    readonly 832990053: "function deployExpression(bytes bytecode, uint256[] constants, uint256[] minOutputs) returns (address, address, address)";
}
```
