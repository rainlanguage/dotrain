[Home](./index.md)

# @rainprotocol/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [MetaStore](./classes/metastore.md) | Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities to easliy utilize them. Hashes must 32 bytes (in hex string format) and will be stored as lower case. Meta bytes must be valid cbor encoded.<br><br>Subgraph endpoint URLs specified in "RAIN\_SUBGRAPHS" from \[rainlang-meta\](https://github.com/rainprotocol/meta/blob/master/src/rainSubgraphs.ts) are included by default as subgraph endpoint URLs to search for metas.<br><br>Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraphs()`<!-- -->.<br><br>Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`<!-- -->, it regenrates the hash from the meta to check the validity of the k/v pair and if the check fails it tries to read the meta from subgraphs and store the result if it finds any. |
|  [RainDocument](./classes/raindocument.md) | RainDocument aka dotrain is a class object that parses a text to provides data and functionalities in order to be used later on to provide Rain Language Services or in RainDocument compiler to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work. |
|  [Rainlang](./classes/rainlang.md) | Rainlang class is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an op meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler |

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
|  [dotrainc(text, entrypoints, metaStore)](./variables/dotrainc_1.md) | RainDocument (dotrain) compiler, compiles a text into valid ExpressionConfig (deployable bytes) |
|  [dotrainc(document, entrypoints, metaStore)](./variables/dotrainc_2.md) | RainDocument (dotrain) compiler, compiles Text Documents into valid ExpressionConfig (deployable bytes) |
|  [dotrainc(rainDocument, entrypoints, metaStore)](./variables/dotrainc_3.md) | RainDocument (dotrain) compiler, compiles Rain Documents into valid ExpressionConfig (deployable bytes) |
|  [dotraind(expressionConfig, metaHash, metaStore)](./variables/dotraind_1.md) | RainDocument (dotrain) decompiler, decompiles ExpressionConfig (bytes) to a valid RainDocument instance |
|  [exclusiveParse(str, pattern, offset, includeEmptyEnds)](./variables/exclusiveparse_1.md) | Parses an string by extracting the strings outside of matches |
|  [extractByBits(value, bits, computation, computationVar)](./variables/extractbybits_1.md) | Method to extract value from operand by specified bits indexes |
|  [extractFromMap(map, properties)](./variables/extractfrommap_1.md) | Extract some of the properties from a Map as a new Map with same keys. |
|  [extractFromRecord(record, properties)](./variables/extractfromrecord_1.md) | Extract some of the properties from a Record as new Record with same keys. |
|  [fillIn(text, position)](./variables/fillin_1.md) | Fills a poistion in a text with whitespaces by keeping line structure intact |
|  [fillOut(text, position)](./variables/fillout_1.md) | Fills a text with whitespaces excluding a position by keeping line structure intact |
|  [getCompletion(document, position, setting)](./variables/getcompletion_1.md) | Provides completion items |
|  [getCompletion(document, position, setting)](./variables/getcompletion_2.md) | Provides completion items |
|  [getDiagnostics(document, setting)](./variables/getdiagnostics_1.md) | Provides diagnostics |
|  [getDiagnostics(document, setting)](./variables/getdiagnostics_2.md) | Provides diagnostics |
|  [getEncodedMetaType(metaBytes)](./variables/getencodedmetatype_1.md) | Checks if metaBytes are a sequence or content or none |
|  [getHover(document, position, setting)](./variables/gethover_1.md) | Provides hover items |
|  [getHover(document, position, setting)](./variables/gethover_2.md) | Provides hover items |
|  [getLineText(textDocument, line)](./variables/getlinetext_1.md) | Method to get a line from a TextDocument |
|  [getRainLanguageServices(params)](./variables/getrainlanguageservices_1.md) | Main function to get Rain language services initiated and ready to receive TextDocuments to provide the desired language services |
|  [getRandomInt(max)](./variables/getrandomint_1.md) | Generates random integer between 0(inclusive) and max(exclusive) |
|  [hasDuplicate(arr1, arr2)](./variables/hasduplicate_1.md) | Method to check there is a duplicate id in 2 arrays of string |
|  [inclusiveParse(str, pattern, offset)](./variables/inclusiveparse_1.md) | Parses an string by extracting matching strings |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish, from EthersJS library |
|  [isConsumableMetaSequence(sequence)](./variables/isconsumablemetasequence_1.md) | Method to check if a meta sequence is consumable for a dotrain |
|  [isEmptyRange(range)](./variables/isemptyrange_1.md) | Checks if a range is empty |
|  [isInRange(range, position)](./variables/isinrange_1.md) | Checks if a position is within a range |
|  [mapToRecord(map, properties)](./variables/maptorecord_1.md) | Conver a Map to a equivalent Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol. |
|  [matchRange(range1, range2)](./variables/matchrange_1.md) | Checks if 2 ranges match exactly together |
|  [memoryOperand(offset, type)](./variables/memoryoperand_1.md) | Constructs operand for standard STATE opecode |
|  [namespaceSearch(name, namespace)](./variables/namespacesearch_1.md) | Search in a Namespace for a given name |
|  [rainlang(stringChunks, vars)](./variables/rainlang_1.md) | Method to be used as Tagged Templates to activate embedded rainlang in javascript/typescript in vscode that highlights the rainlang syntax. Requires rainlang vscode extension to be installed. |
|  [rainlangc(text, opmeta)](./variables/rainlangc_1.md) | Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes) |
|  [rainlangc(text, opmetaHash, metaStore)](./variables/rainlangc_2.md) | Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes) |
|  [rainlangc(rainlang)](./variables/rainlangc_3.md) | Rain Language Compiler (rainlangc), compiles a rainlang instance into valid ExpressionConfig (deployable bytes) |
|  [rainlangd(expressionConfig, opmetaHash, metaStore)](./variables/rainlangd_1.md) | Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rainlang instance |
|  [rainlangd(expressionConfig, opmeta)](./variables/rainlangd_2.md) | Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rainlang instance |
|  [recordToMap(record, properties)](./variables/recordtomap_1.md) | Conver a Record (a key/value pair object) to a equivalent Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol. |
|  [toConvNumber(value)](./variables/toconvnumber_1.md) | Convert Rainlang numeric values to covenient numeric value |
|  [trim(str)](./variables/trim_1.md) | Trims a text (removing start/end whitespaces) with reporting the number of deletions |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AliasASTNode](./interfaces/aliasastnode.md) | Type for Rainlang/RainDocument alias |
|  [ClientCapabilities](./interfaces/clientcapabilities.md) | Describes what LSP capabilities the client supports |
|  [Comment\_2](./interfaces/comment_2.md) | Type for Rainlang/RainDocument comments |
|  [Import](./interfaces/import.md) | Type of import statements specified in a RainDocument |
|  [LanguageServiceParams](./interfaces/languageserviceparams.md) | Parameters for initiating Language Services |
|  [OpASTNode](./interfaces/opastnode.md) | Type for Rainlang AST Opcode node |
|  [Problem](./interfaces/problem.md) | Type for Rainlang/RainDocument problem |
|  [RainLanguageServices](./interfaces/rainlanguageservices.md) | Interface for Rain language services |
|  [ValueASTNode](./interfaces/valueastnode.md) | Type Rainlang AST Value node |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [AliasASTNode](./namespaces/aliasastnode.md) | The namespace provides functionality to type check |
|  [ASTNode](./namespaces/astnode.md) | The namespace provides functionality to type check |
|  [Binding](./namespaces/binding.md) | The namespace provides functionality to type check |
|  [ClientCapabilities](./namespaces/clientcapabilities.md) | Predefined latest client capabilities |
|  [Comment\_2](./namespaces/comment_2.md) | The namespace provides functionality to type check |
|  [ContextAlias](./namespaces/contextalias.md) | The namespace provides functionality to type check |
|  [Import](./namespaces/import.md) | The namespace provides functionality to type check |
|  [Namespace](./namespaces/namespace.md) | The namespace provides functionality to type check |
|  [OpASTNode](./namespaces/opastnode.md) | The namespace provides functionality to type check |
|  [ParsedChunk](./namespaces/parsedchunk.md) | The namespace provides function to type checking |
|  [PositionOffset](./namespaces/positionoffset.md) | The namespace provides functionality to type check |
|  [Problem](./namespaces/problem.md) | The namespace provides functionality to type check |
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
|  [DEFAULT\_ELISION](./variables/default_elision.md) | the default elided binding msg |
|  [HASH\_PATTERN](./variables/hash_pattern.md) | Import hash pattern |
|  [HEX\_PATTERN](./variables/hex_pattern.md) | Hex pattern |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [ILLEGAL\_CHAR](./variables/illegal_char.md) | Illegal character pattern |
|  [isBytes](./variables/isbytes.md) | ethers isBytes |
|  [isBytesLike](./variables/isbyteslike.md) | ethers isBytesLike |
|  [isHexString](./variables/ishexstring.md) | ethers isHexString |
|  [NAMESPACE\_PATTERN](./variables/namespace_pattern.md) | RainDocument Namespace pattern |
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
|  [Binding](./types/binding.md) | Type for a binding (named expressions) |
|  [ContextAlias](./types/contextalias.md) | Type for context aliases from a contract caller meta |
|  [EncodedMetaType](./types/encodedmetatype.md) | Type of encoded meta bytes |
|  [ExpressionConfig](./types/expressionconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [MetaRecord](./types/metarecord.md) | Type for a record in MetaStore cache |
|  [MetaSequence](./types/metasequence.md) | Type of a meta sequence resolved from a meta hash |
|  [Namespace](./types/namespace.md) | Type for a namespace in dotrain |
|  [NamespaceNode](./types/namespacenode.md) | Type for a namespace node |
|  [ParsedChunk](./types/parsedchunk.md) | Type for result of matches found in a string |
|  [PositionOffset](./types/positionoffset.md) | Type for start and end indexes for RainDocument items, inclusive at both ends |
|  [RainlangAST](./types/rainlangast.md) | Type of a Rainlang AST |

