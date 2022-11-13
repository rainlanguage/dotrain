[Home](./index.md)

# @beehiveinnovation/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [Formatter](./classes/formatter.md) | The generator of human friendly readable source. |
|  [Parser](./classes/parser.md) | Parser is a mini compiler to generate a valid StateConfig (deployable bytes) from a text script |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [AllStandardOps](./enums/allstandardops.md) | All the standard Op Codes |
|  [Notations](./enums/notations.md) | Expression Notations |
|  [selectLteLogic](./enums/selectltelogic.md) | An enum for selectLte logic |
|  [selectLteMode](./enums/selectltemode.md) | An enum for selectLte mode |

## Functions

|  Function | Description |
|  --- | --- |
|  [callSize(sourceIndex, loopSize, valSize)](./variables/callsize_1.md) | Constructs the operand for RainVM's `zipmap` opcode by packing 3 numbers into a single byte. All parameters use zero-based counting i.e. an `fnSize` of 0 means to allocate one element (32 bytes) on the stack to define your functions, while an `fnSize` of 3 means to allocate all four elements (4 \* 32 bytes) on the stack. |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properites from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |
|  [selectLte(logic, mode, length)](./variables/selectlte_1.md) | function to set up the operand for a SELECT\_LTE opcode |
|  [tierRange(startTier, endTier)](./variables/tierrange_1.md) | function to pack start/end tier range into a byte size number for the UPDATE\_BLOCKS\_FOR\_TIER\_RANGE opcode |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [StateConfig](./interfaces/stateconfig.md) | Config required to build a new `State`<!-- -->. |
|  [StorageOpcodesRange](./interfaces/storageopcodesrange.md) | Interface for accessible by vm storage's slots range available for a contract to be used as local opcodes. |

## Variables

|  Variable | Description |
|  --- | --- |
|  [areEqualConfigs](./variables/areequalconfigs.md) | Checks 2 StateConfig objects to see if they are equal or not |
|  [arrayify](./variables/arrayify.md) | ethers arrayify |
|  [bytify](./variables/bytify.md) | Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified. |
|  [concat](./variables/concat.md) | ethers concat |
|  [gteParserOpcode](./variables/gteparseropcode.md) | Special opemta-like object for providing GTE in parser |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [ineqParserOpcode](./variables/ineqparseropcode.md) | Special opmeta-like object for providing inequality check in parser |
|  [lteParserOpcode](./variables/lteparseropcode.md) | Special opmeta-like object for providing GTE in parser |
|  [op](./variables/op.md) | Converts an opcode and operand to bytes, and returns their concatenation. |
|  [paddedUInt128](./variables/paddeduint128.md) | Utility function to produce 128 bits size hexString |
|  [paddedUInt160](./variables/paddeduint160.md) | Utility function that transforms a BigNumberish to an ether address (40 char length hexString) |
|  [paddedUInt256](./variables/paddeduint256.md) | Utility function that transforms a BigNumberish from the output of the ITierV2 contract report |
|  [paddedUInt32](./variables/paddeduint32.md) | Utility function to produce 32 bits size hexString |
|  [paddedUInt64](./variables/paddeduint64.md) | Utility function to produce 64 bits size hexString |
|  [parseUnits](./variables/parseunits.md) | ethers parseUnits |
|  [pnp](./variables/pnp.md) | Class for Opcodes number of stack pushes and pops |
|  [rainOpMeta](./variables/rainopmeta.md) |  |
|  [zeroPad](./variables/zeropad.md) | ethers zeroPad |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Config](./types/config.md) | Specific the configuration of the generation method |
|  [Error\_2](./types/error_2.md) | Type of Parser's Error node |
|  [Hexable](./types/hexable.md) | a native type for ethers Hexable |
|  [IOpMeta](./types/iopmeta.md) |  |
|  [iOpMetaLike](./types/iopmetalike.md) | OpMeta-like type |
|  [Node\_2](./types/node_2.md) | Type of Parser's Node |
|  [Op](./types/op.md) | Type of Parser's Opcode node |
|  [ParseTree](./types/parsetree.md) | Type of a parse tree object |
|  [PrettifyConfig](./types/prettifyconfig.md) | Specifies the configuration of the Prettify method. |
|  [State](./types/state.md) | Type of Parser's State |
|  [Value](./types/value.md) | Type of Parser's Value node |

