[Home](./index.md)

# @rainprotocol/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [Formatter](./classes/formatter.md) | The generator of human friendly readable source. |
|  [Parser](./classes/parser.md) | Rain Parser is a compiler written in TypeScript in order to parse, compile and output Rain Expressions into deployable bytes for Rain Protocol's smart contracts and also a parse tree object which contains all the parsed data and info of the opcode, values, errors and ... that can be used by the caller, for example to be make an enriched Rain in-bowser text editor. Rain Parser uses an standard opcode metadata callled OpMeta in order to parse opcodes into deployable bytes of an Rain Interpreter. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [MemoryType](./enums/memorytype.md) |  |

## Functions

|  Function | Description |
|  --- | --- |
|  [constructByBits(args)](./variables/constructbybits_1.md) | Method to construct the operand from operand args |
|  [deepFreeze(object)](./variables/deepfreeze_1.md) | Deeply freezes an object, all of the properties of propterties gets frozen |
|  [extractByBits(value, bits, computation, computationVar)](./variables/extractbybits_1.md) | Method to extract value from operand by specified bits indexes |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properites from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish, from EthersJS library |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [memoryOperand(type, offset)](./variables/memoryoperand_1.md) | Constructs operand for standard STATE opecode |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |

## Variables

|  Variable | Description |
|  --- | --- |
|  [areEqualStateConfigs](./variables/areequalstateconfigs.md) | Checks 2 ExpressionConfig objects to see if they are equal or not |
|  [arrayify](./variables/arrayify.md) | ethers arrayify |
|  [bytesFromMeta](./variables/bytesfrommeta.md) | Convert meta or array of metas or a schema to bytes and compress them for on-chain deployment |
|  [bytify](./variables/bytify.md) | Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified. |
|  [concat](./variables/concat.md) | ethers concat |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [metaFromBytes](./variables/metafrombytes.md) | Decompress and convert bytes to meta |
|  [op](./variables/op.md) | Converts an opcode and operand to bytes, and returns their concatenation. |
|  [paddedUInt128](./variables/paddeduint128.md) | Utility function to produce 128 bits size hexString |
|  [paddedUInt160](./variables/paddeduint160.md) | Utility function that transforms a BigNumberish to an ether address (40 char length hexString) |
|  [paddedUInt256](./variables/paddeduint256.md) | Utility function that transforms a BigNumberish from the output of the ITierV2 contract report |
|  [paddedUInt32](./variables/paddeduint32.md) | Utility function to produce 32 bits size hexString |
|  [paddedUInt64](./variables/paddeduint64.md) | Utility function to produce 64 bits size hexString |
|  [parseUnits](./variables/parseunits.md) | ethers parseUnits |
|  [validateMeta](./variables/validatemeta.md) | Validate a meta or array of metas against a schema |
|  [zeroPad](./variables/zeropad.md) | ethers zeroPad |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Comment\_2](./types/comment_2.md) |  |
|  [ComputedOutput](./types/computedoutput.md) | Data type for computed output |
|  [Config](./types/config.md) | Specific the configuration of the generation method |
|  [Diagnostic](./types/diagnostic.md) | Type of Parser's Diagnostic (error) |
|  [ExpressionConfig](./types/expressionconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [InputArgs](./types/inputargs.md) | Data type for input argguments |
|  [InputMeta](./types/inputmeta.md) | Data type of opcode's inputs that determines the number of inputs an opcode has and provide information about them |
|  [Node\_2](./types/node_2.md) | Type of Parser's Node |
|  [Op](./types/op.md) | Type of Parser's Opcode node |
|  [OperandArgs](./types/operandargs.md) | Data type for computed operand that consists of some arguments |
|  [OperandMeta](./types/operandmeta.md) | Data type of operand arguments, used only for non-constant operands |
|  [OpMeta](./types/opmeta.md) | Type Definitions for opcodes metadata used by RainLang. |
|  [OutputMeta](./types/outputmeta.md) | Data type of opcode's outputs that determines the number of outputs an opcode has and provide information about them |
|  [ParseTree](./types/parsetree.md) | Type of a parse tree object |
|  [Position](./types/position.md) | Type of position start and end indexes, inclusive at both ends |
|  [PrettifyConfig](./types/prettifyconfig.md) | Specifies the configuration of the Prettify method. |
|  [State](./types/state.md) | Type of Parser's State |
|  [Tag](./types/tag.md) |  |
|  [Value](./types/value.md) | Type of Parser's Value node |

