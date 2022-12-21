[Home](./index.md)

# @beehiveinnovation/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [Formatter](./classes/formatter.md) | The generator of human friendly readable source. |
|  [Parser](./classes/parser.md) | Rain Parser is a compiler written in TypeScript in order to parse, compile and output Rain Expressions into deployable bytes for Rain Protocol's smart contracts and also a parse tree object which contains all the parsed data and info of the opcode, values, errors and ... that can be used by the caller, for example to be make an enriched Rain in-bowser text editor. Rain Parser uses an standard opcode metadata callled OpMeta in order to parse opcodes into deployable bytes of an Rain Interpreter. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [AllStandardOps](./enums/allstandardops.md) | All the standard Op Codes |
|  [Debug](./enums/debug.md) |  |
|  [MemoryType](./enums/memorytype.md) |  |
|  [Notations](./enums/notations.md) | Expression Notations |
|  [selectLteLogic](./enums/selectltelogic.md) | An enum for selectLte logic |
|  [selectLteMode](./enums/selectltemode.md) | An enum for selectLte mode |
|  [Tier](./enums/tier.md) | All the contract tier levels availables in all ITier contracts. |

## Functions

|  Function | Description |
|  --- | --- |
|  [callOperand(inputSize, outputSize, sourceIndex)](./variables/calloperand_1.md) | Builds the operand for RainInterpreter's `CALL` opcode by packing 3 numbers into a single byte. |
|  [callSize(sourceIndex, loopSize, valSize)](./variables/callsize_1.md) | Constructs the operand for RainVM's `zipmap` opcode by packing 3 numbers into a single byte. All parameters use zero-based counting i.e. an `fnSize` of 0 means to allocate one element (32 bytes) on the stack to define your functions, while an `fnSize` of 3 means to allocate all four elements (4 \* 32 bytes) on the stack. |
|  [deepFreeze(object)](./variables/deepfreeze_1.md) | Deeply freezes an object, all of the properties of propterties gets frozen |
|  [doWhileOperand(inputSize, reserved, sourceIndex)](./variables/dowhileoperand_1.md) | Builds the operand for RainInterpreter's `DO_WHILE` opcode by packing 3 numbers into a single byte. |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properites from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [foldContextOperand(inputs, width, foldColumn, sourceIndex)](./variables/foldcontextoperand_1.md) | Builds the operand for RainInterpreter's `FOLD_CONTEXT` opcode by packing 4 numbers into 2 bytes. |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish |
|  [loopNOperand(n, inputSize, outputSize, sourceIndex)](./variables/loopnoperand_1.md) | Builds the operand for RainInterpreter's `LOOP_N` opcode by packing 4 numbers into a single byte. |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [memoryOperand(type, offset)](./variables/memoryoperand_1.md) | Constructs operand for standard STATE opecode |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |
|  [selectLteOperand(logic, mode, inputSize)](./variables/selectlteoperand_1.md) | function to set up the operand for a SELECT\_LTE opcode |
|  [tierRange(startTier, endTier)](./variables/tierrange_1.md) | function to pack start/end tier range into a byte size number for the UPDATE\_BLOCKS\_FOR\_TIER\_RANGE opcode |

## Variables

|  Variable | Description |
|  --- | --- |
|  [areEqualStateConfigs](./variables/areequalstateconfigs.md) | Checks 2 StateConfig objects to see if they are equal or not |
|  [arrayify](./variables/arrayify.md) | ethers arrayify |
|  [bytify](./variables/bytify.md) | Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified. |
|  [concat](./variables/concat.md) | ethers concat |
|  [eighteenZeros](./variables/eighteenzeros.md) |  |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [op](./variables/op.md) | Converts an opcode and operand to bytes, and returns their concatenation. |
|  [paddedUInt128](./variables/paddeduint128.md) | Utility function to produce 128 bits size hexString |
|  [paddedUInt160](./variables/paddeduint160.md) | Utility function that transforms a BigNumberish to an ether address (40 char length hexString) |
|  [paddedUInt256](./variables/paddeduint256.md) | Utility function that transforms a BigNumberish from the output of the ITierV2 contract report |
|  [paddedUInt32](./variables/paddeduint32.md) | Utility function to produce 32 bits size hexString |
|  [paddedUInt64](./variables/paddeduint64.md) | Utility function to produce 64 bits size hexString |
|  [parseUnits](./variables/parseunits.md) | ethers parseUnits |
|  [rainterpreterOpMeta](./variables/rainterpreteropmeta.md) | All Standard Rainterpreter Op Meta |
|  [virtualGte](./variables/virtualgte.md) | Special opemta-like object for providing GTE in parser |
|  [virtualInEq](./variables/virtualineq.md) | Special opmeta-like object for providing inequality check in parser |
|  [virtualLte](./variables/virtuallte.md) | Special opmeta-like object for providing GTE in parser |
|  [zeroPad](./variables/zeropad.md) | ethers zeroPad |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Comment\_2](./types/comment_2.md) |  |
|  [Config](./types/config.md) | Specific the configuration of the generation method |
|  [Error\_2](./types/error_2.md) | Type of Parser's Error node |
|  [Hexable](./types/hexable.md) | A native type for ethers Hexable |
|  [Node\_2](./types/node_2.md) | Type of Parser's Node |
|  [Op](./types/op.md) | Type of Parser's Opcode node |
|  [OperandArgConstraints](./types/operandargconstraints.md) |  |
|  [OperandDecoder](./types/operanddecoder.md) |  |
|  [OperandEncoder](./types/operandencoder.md) |  |
|  [OperandMeta](./types/operandmeta.md) |  |
|  [OpIO](./types/opio.md) |  |
|  [OpMeta](./types/opmeta.md) |  |
|  [ParamsValidRange](./types/paramsvalidrange.md) | valid number of parameteres an opcode's can have inside its parens |
|  [ParseTree](./types/parsetree.md) | Type of a parse tree object |
|  [PrettifyConfig](./types/prettifyconfig.md) | Specifies the configuration of the Prettify method. |
|  [State](./types/state.md) | Type of Parser's State |
|  [StateConfig](./types/stateconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [Tag](./types/tag.md) |  |
|  [Value](./types/value.md) | Type of Parser's Value node |
|  [virtualOpMeta](./types/virtualopmeta.md) | OpMeta-like type |

