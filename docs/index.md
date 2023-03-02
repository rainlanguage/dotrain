[Home](./index.md)

# @rainprotocol/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [RainDocument](./classes/raindocument.md) | RainDocument is a wrapper for RainParser that provides the main functionalities and data types in order to be used later on to provide Rain Language Services or in Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes) |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [ErrorCode](./enums/errorcode.md) | Error codes used by diagnostics |
|  [MemoryType](./enums/memorytype.md) | Type for read-memory opcode |

## Functions

|  Function | Description |
|  --- | --- |
|  [constructByBits(args)](./variables/constructbybits_1.md) | Method to construct the operand from operand args |
|  [deepCopy(variable)](./variables/deepcopy_1.md) | Deep copy an item in a way that all of its properties get new reference |
|  [deepFreeze(object)](./variables/deepfreeze_1.md) | Deeply freezes an object, all of the properties of propterties gets frozen |
|  [extractByBits(value, bits, computation, computationVar)](./variables/extractbybits_1.md) | Method to extract value from operand by specified bits indexes |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properites from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [getLanguageService(params)](./variables/getlanguageservice_1.md) | Main function to get Rain language services initiated and ready to recieve TextDocuments to provide the desired language services |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish, from EthersJS library |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [memoryOperand(offset, type)](./variables/memoryoperand_1.md) | Constructs operand for standard STATE opecode |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |
|  [rlc(document, opmeta)](./variables/rlc_1.md) | Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes) |
|  [rld(expressionConfig, opmeta, prettyFormat)](./variables/rld_1.md) | Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rain document |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ClientCapabilities](./interfaces/clientcapabilities.md) | Describes what LSP capabilities the client supports |
|  [LanguageService](./interfaces/languageservice.md) | Interface for Rain language services |
|  [LanguageServiceParams](./interfaces/languageserviceparams.md) | Parameters for initiating Language Services |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [ClientCapabilities](./namespaces/clientcapabilities.md) | Predefined latest client capabilities |

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
|  [ComputedOutput](./types/computedoutput.md) | Data type for computed output |
|  [ExpressionConfig](./types/expressionconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [InputArgs](./types/inputargs.md) | Data type for input argguments |
|  [InputMeta](./types/inputmeta.md) | Data type of opcode's inputs that determines the number of inputs an opcode has and provide information about them |
|  [OperandArgs](./types/operandargs.md) | Data type for computed operand that consists of some arguments |
|  [OperandMeta](./types/operandmeta.md) | Data type of operand arguments, used only for non-constant operands |
|  [OpMeta](./types/opmeta.md) | Type Definitions for opcodes metadata used by RainLang. |
|  [OutputMeta](./types/outputmeta.md) | Data type of opcode's outputs that determines the number of outputs an opcode has and provide information about them |
|  [RainDocumentResult](./types/raindocumentresult.md) | Type of RainDocument's parse result |
|  [RainParseState](./types/rainparsestate.md) | Type of Parser's State |
|  [RDAliasNode](./types/rdaliasnode.md) | Type of RainDocument's lhs aliases |
|  [RDComment](./types/rdcomment.md) | Type of RainDocument's comments |
|  [RDNode](./types/rdnode.md) | Type of RainDocument's prase node |
|  [RDOpNode](./types/rdopnode.md) | Type of RainDocument's Opcode node |
|  [RDParseTree](./types/rdparsetree.md) | Type of a RainDocument parse tree object |
|  [RDPosition](./types/rdposition.md) | Type of position start and end indexes for RainDocument, inclusive at both ends |
|  [RDProblem](./types/rdproblem.md) | Type of RainDocument's problem (error) |
|  [RDValueNode](./types/rdvaluenode.md) | Type of RainDocument's Value node |

