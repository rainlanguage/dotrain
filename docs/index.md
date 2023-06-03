[Home](./index.md)

# @rainprotocol/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [MetaStore](./classes/metastore.md) | Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities to easliy utilize them. Hashes must 32 bytes (in hex string format) and will be stored as lower case. Meta bytes must be valid cbor encoded that emitted by the contract.<br><br>Subgraph endpoint URLs specified in "sgBook" from \[rainlang-meta\](https://github.com/rainprotocol/meta/blob/master/src/subgraphBook.ts) are included by default as subgraph endpoint URLs to search for metas.<br><br>Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraph()`<!-- -->, which must be valid starting with `https"//api.thegraph.com/subgraphs/name/`<!-- -->, else they will be ignored.<br><br>Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`<!-- -->, it regenrates the hash from the meta to check the validity of the k/v pair and if the check fails it tries to read the meta from subgraphs and store the result if it finds any. |
|  [RainDocument](./classes/raindocument.md) | RainDocument is a class object that provides data and functionalities in order to be used later on to provide Rain Language Services or in Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [CompletionTriggerKind](./enums/completiontriggerkind.md) | How a completion was triggered |
|  [ErrorCode](./enums/errorcode.md) | Error codes of Rainlang/RainDocument problem and LSP Diagnostics |
|  [MemoryType](./enums/memorytype.md) | Type for read-memory opcode |

## Functions

|  Function | Description |
|  --- | --- |
|  [constructByBits(args)](./variables/constructbybits_1.md) | Method to construct the operand from operand args |
|  [deepCopy(variable)](./variables/deepcopy_1.md) | Deep copy an item in a way that all of its properties get new reference |
|  [deepFreeze(object)](./variables/deepfreeze_1.md) | Deeply freezes an object, all of the properties of propterties gets frozen |
|  [exclusiveParse(str, pattern, offset, includeEmptyEnds)](./variables/exclusiveparse_1.md) | Parses an string by extracting the strings outside of matches |
|  [extractByBits(value, bits, computation, computationVar)](./variables/extractbybits_1.md) | Method to extract value from operand by specified bits indexes |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properites from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [getRainlangCompletion(document, position, setting)](./variables/getrainlangcompletion_1.md) | Provides completion items |
|  [getRainlangCompletion(document, position, setting)](./variables/getrainlangcompletion_2.md) | Provides completion items |
|  [getRainlangDiagnostics(document, setting)](./variables/getrainlangdiagnostics_1.md) | Provides diagnostics |
|  [getRainlangDiagnostics(document, setting)](./variables/getrainlangdiagnostics_2.md) | Provides diagnostics |
|  [getRainlangHover(document, position, setting)](./variables/getrainlanghover_1.md) | Provides hover items |
|  [getRainlangHover(document, position, setting)](./variables/getrainlanghover_2.md) | Provides hover items |
|  [getRainLanguageServices(params)](./variables/getrainlanguageservices_1.md) | Main function to get Rain language services initiated and ready to recieve TextDocuments to provide the desired language services |
|  [inclusiveParse(str, pattern, offset)](./variables/inclusiveparse_1.md) | Parses an string by extracting matching strings |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish, from EthersJS library |
|  [isEmptyRange(range)](./variables/isemptyrange_1.md) | Checks if a range is empty |
|  [isInRange(range, position)](./variables/isinrange_1.md) | Checks if a position is within a range |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [matchRange(range1, range2)](./variables/matchrange_1.md) | Checks if 2 ranges match exactly together |
|  [memoryOperand(offset, type)](./variables/memoryoperand_1.md) | Constructs operand for standard STATE opecode |
|  [rainlang(stringChunks, vars)](./variables/rainlang_1.md) | Method to be used as Tagged Templates to activate embedded rainlang in javascript to typescript that highlights the rainlang syntax. Requires rainlang vscode extension to be installed. |
|  [rainlangc(text, entrypoints, metaStore)](./variables/rainlangc_1.md) | Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes) |
|  [rainlangc(document, entrypoints, metaStore)](./variables/rainlangc_2.md) | Rain Language Compiler (rainlangc), compiles Text Documents into valid ExpressionConfig (deployable bytes) |
|  [rainlangc(rainDocument, entrypoints, metaStore)](./variables/rainlangc_3.md) | Rain Language Compiler (rainlangc), compiles Rain Documents into valid ExpressionConfig (deployable bytes) |
|  [rainlangd(expressionConfig, metaHash, metaStore)](./variables/rainlangd_1.md) | Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rain document |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AliasASTNode](./interfaces/aliasastnode.md) | Type for Rainlang/RainDocument alias |
|  [ClientCapabilities](./interfaces/clientcapabilities.md) | Describes what LSP capabilities the client supports |
|  [CommentASTNode](./interfaces/commentastnode.md) | Type for Rainlang/RainDocument comments |
|  [ImportASTNode](./interfaces/importastnode.md) | Type of import statements specified in a RainDocument |
|  [LanguageServiceParams](./interfaces/languageserviceparams.md) | Parameters for initiating Language Services |
|  [OpASTNode](./interfaces/opastnode.md) | Type for Rainlang AST Opcode node |
|  [ProblemASTNode](./interfaces/problemastnode.md) | Type for Rainlang/RainDocument problem |
|  [RainLanguageServices](./interfaces/rainlanguageservices.md) | Interface for Rain language services |
|  [ValueASTNode](./interfaces/valueastnode.md) | Type Rainlang AST Value node |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [AliasASTNode](./namespaces/aliasastnode.md) | The namespace provides functionality to type check |
|  [ASTNode](./namespaces/astnode.md) | The namespace provides functionality to type check |
|  [ClientCapabilities](./namespaces/clientcapabilities.md) | Predefined latest client capabilities |
|  [CommentASTNode](./namespaces/commentastnode.md) | The namespace provides functionality to type check |
|  [ImportASTNode](./namespaces/importastnode.md) | The namespace provides functionality to type check |
|  [NamedExpression](./namespaces/namedexpression.md) | The namespace provides functionality to type check |
|  [OpASTNode](./namespaces/opastnode.md) | The namespace provides functionality to type check |
|  [PositionOffset](./namespaces/positionoffset.md) | The namespace provides functionality to type check |
|  [ProblemASTNode](./namespaces/problemastnode.md) | The namespace provides functionality to type check |
|  [RainlangAST](./namespaces/rainlangast.md) | The namespace provides functionality to type check |
|  [ValueASTNode](./namespaces/valueastnode.md) | The namespace provides functionality to type check |

## Variables

|  Variable | Description |
|  --- | --- |
|  [areEqualStateConfigs](./variables/areequalstateconfigs.md) | Checks 2 ExpressionConfig objects to see if they are equal or not |
|  [arrayify](./variables/arrayify.md) | ethers arrayify |
|  [bytify](./variables/bytify.md) | Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified. |
|  [concat](./variables/concat.md) | ethers concat |
|  [CONSTANTS](./variables/constants.md) | ethers constants |
|  [HASH\_PATTERN](./variables/hash_pattern.md) | Import hash pattern |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [ILLIGAL\_CHAR](./variables/illigal_char.md) | Illigal character pattern |
|  [isBytes](./variables/isbytes.md) | ethers isBytes |
|  [isBytesLike](./variables/isbyteslike.md) | ethers isBytesLike |
|  [isHexString](./variables/ishexstring.md) | ethers isHexString |
|  [NUMERIC\_PATTERN](./variables/numeric_pattern.md) | Rainlang numeric pattern |
|  [op](./variables/op.md) | Converts an opcode and operand to bytes, and returns their concatenation. |
|  [paddedUInt128](./variables/paddeduint128.md) | Utility function to produce 128 bits size hexString |
|  [paddedUInt160](./variables/paddeduint160.md) | Utility function that transforms a BigNumberish to an ether address (40 char length hexString) |
|  [paddedUInt256](./variables/paddeduint256.md) | Utility function that transforms a BigNumberish from the output of the ITierV2 contract report |
|  [paddedUInt32](./variables/paddeduint32.md) | Utility function to produce 32 bits size hexString |
|  [paddedUInt64](./variables/paddeduint64.md) | Utility function to produce 64 bits size hexString |
|  [parseUnits](./variables/parseunits.md) | ethers parseUnits |
|  [WORD\_PATTERN](./variables/word_pattern.md) | Rainlang word pattern |
|  [zeroPad](./variables/zeropad.md) | ethers zeroPad |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [ASTNode](./types/astnode.md) | Type of an AST node |
|  [ContextAlias](./types/contextalias.md) | Type for context aliases from a contract caller meta |
|  [ExpressionConfig](./types/expressionconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [NamedExpression](./types/namedexpression.md) | Type for a named expression |
|  [PositionOffset](./types/positionoffset.md) | Type for start and end indexes for RainDocument items, inclusive at both ends |
|  [RainlangAST](./types/rainlangast.md) | Type of a Rainlang AST |

