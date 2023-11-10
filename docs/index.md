[Home](./index.md)

# @rainprotocol/rainlang

## Classes

|  Class | Description |
|  --- | --- |
|  [RainDocument](./classes/raindocument.md) | RainDocument aka dotrain is a class object that parses a text to provides data and functionalities in order to be used later on to provide Rain Language Services or in RainDocument compiler to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work. |
|  [Rainlang](./classes/rainlang.md) | Rainlang class is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an authoring meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [CompletionTriggerKind](./enums/completiontriggerkind.md) | How a completion was triggered |
|  [ErrorCode](./enums/errorcode.md) | Error codes of Rainlang/RainDocument problem and LSP Diagnostics |

## Functions

|  Function | Description |
|  --- | --- |
|  [deepCopy(variable)](./variables/deepcopy_1.md) | Deep copy an item in a way that all of its properties get new reference |
|  [deepFreeze(object)](./variables/deepfreeze_1.md) | Deeply freezes an object, all of the properties of propterties gets frozen |
|  [exclusiveParse(str, pattern, offset, includeEmptyEnds)](./variables/exclusiveparse_1.md) | Parses an string by extracting the strings outside of matches |
|  [execBytecode(bytecode, abi, fn, args, evm)](./variables/execbytecode_1.md) | Executes a contract bytecode given the contract abi, fnunction name and args |
|  [execBytecode(bytecode, data, evm)](./variables/execbytecode_2.md) | Executes a bytecode with given data |
|  [fillIn(text, position)](./variables/fillin_1.md) | Fills a poistion in a text with whitespaces by keeping line structure intact |
|  [fillOut(text, position)](./variables/fillout_1.md) | Fills a text with whitespaces excluding a position by keeping line structure intact |
|  [getCompletion(document, position, setting)](./variables/getcompletion_1.md) | Provides completion items |
|  [getCompletion(document, position, setting)](./variables/getcompletion_2.md) | Provides completion items |
|  [getDiagnostics(document, setting)](./variables/getdiagnostics_1.md) | Provides diagnostics |
|  [getDiagnostics(document, setting)](./variables/getdiagnostics_2.md) | Provides diagnostics |
|  [getHover(document, position, setting)](./variables/gethover_1.md) | Provides hover items |
|  [getHover(document, position, setting)](./variables/gethover_2.md) | Provides hover items |
|  [getLineText(textDocument, line)](./variables/getlinetext_1.md) | Method to get a line from a TextDocument |
|  [getRainLanguageServices(params)](./variables/getrainlanguageservices_1.md) | Main function to get Rain language services initiated and ready to receive TextDocuments to provide the desired language services |
|  [getRandomInt(max)](./variables/getrandomint_1.md) | Generates random integer between 0(inclusive) and max(exclusive) |
|  [hasDuplicate(arr1, arr2)](./variables/hasduplicate_1.md) | Method to check there is a duplicate id in 2 arrays of string |
|  [inclusiveParse(str, pattern, offset)](./variables/inclusiveparse_1.md) | Parses an string by extracting matching strings |
|  [isBigNumberish(value)](./variables/isbignumberish_1.md) | function to check if the a value is of type BigNumberish, from EthersJS library |
|  [isConsumableMeta(maps)](./variables/isconsumablemeta_1.md) | Method to check if a meta sequence is consumable for a dotrain |
|  [isEmptyRange(range)](./variables/isemptyrange_1.md) | Checks if a range is empty |
|  [isInRange(range, position)](./variables/isinrange_1.md) | Checks if a position is within a range |
|  [matchRange(range1, range2)](./variables/matchrange_1.md) | Checks if 2 ranges match exactly together |
|  [rainlang(stringChunks, vars)](./variables/rainlang_1.md) | Method to be used as Tagged Templates to activate embedded rainlang in javascript/typescript in vscode that highlights the rainlang syntax. Requires rainlang vscode extension to be installed. |
|  [toInteger(value)](./variables/tointeger_1.md) | Convert Rainlang numeric values to interger as string |
|  [trackedTrim(str)](./variables/trackedtrim_1.md) | Trims a text (removing start/end whitespaces) with reporting the number of deletions |
|  [uint8ArrayToString(uint8array)](./variables/uint8arraytostring_1.md) | Method to convert Uint8Array to string |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ClientCapabilities](./interfaces/clientcapabilities.md) | Describes what LSP capabilities the client supports |
|  [LanguageServiceParams](./interfaces/languageserviceparams.md) | Parameters for initiating Language Services |
|  [RainLanguageServices](./interfaces/rainlanguageservices.md) | Interface for Rain language services |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [AST](./namespaces/ast.md) | This namespace provides all types and functionalities for RainDocument and Rainlang AST |
|  [ClientCapabilities](./namespaces/clientcapabilities.md) | Predefined latest client capabilities |
|  [Compile](./namespaces/compile.md) | Compile namespace provides methods for compiling rainlang or rain document text or instances |
|  [ExpressionConfig](./namespaces/expressionconfig.md) | namespace provides additional methods for the Expressionconfig type |
|  [ParsedChunk](./namespaces/parsedchunk.md) | The namespace provides function to type checking |

## Variables

|  Variable | Description |
|  --- | --- |
|  [arrayify](./variables/arrayify.md) | ethers arrayify |
|  [concat](./variables/concat.md) | ethers concat |
|  [CONSTANTS](./variables/constants.md) | ethers constants |
|  [DEFAULT\_ELISION](./variables/default_elision.md) | the default elided binding msg |
|  [HASH\_PATTERN](./variables/hash_pattern.md) | Import hash pattern |
|  [HEX\_PATTERN](./variables/hex_pattern.md) | Hex pattern |
|  [hexlify](./variables/hexlify.md) | ethers hexlify |
|  [hexZeroPad](./variables/hexzeropad.md) | ethers hexZeroPad |
|  [ILLEGAL\_CHAR](./variables/illegal_char.md) | Illegal character pattern |
|  [insertAccount](./variables/insertaccount.md) | Inster an account with balance to evm |
|  [isAddress](./variables/isaddress.md) | ethers isAddress |
|  [isBytes](./variables/isbytes.md) | ethers isBytes |
|  [isBytesLike](./variables/isbyteslike.md) | ethers isBytesLike |
|  [isHexString](./variables/ishexstring.md) | ethers isHexString |
|  [keccak256](./variables/keccak256.md) | ethers keccak256 |
|  [NAMESPACE\_PATTERN](./variables/namespace_pattern.md) | RainDocument Namespace pattern |
|  [NATIVE\_PARSER\_ABI](./variables/native_parser_abi.md) | Native Parser ABI (ExpressionDeployerV2 ABI) |
|  [NATIVE\_PARSER\_FULL\_SIGHASH](./variables/native_parser_full_sighash.md) | Full sighash of all native parser's selectors |
|  [NATIVE\_PARSER\_MINIMAL\_SIGHASH](./variables/native_parser_minimal_sighash.md) | Minimal sighash of all native parser's selectors |
|  [NP\_SGS](./variables/np_sgs.md) | Native Parser known subgraph endpoints |
|  [NUMERIC\_PATTERN](./variables/numeric_pattern.md) | Rainlang numeric pattern |
|  [paddedUInt128](./variables/paddeduint128.md) | Utility function to produce 128 bits size hexString |
|  [paddedUInt160](./variables/paddeduint160.md) | Utility function that transforms a BigNumberish to an ether address (40 char length hexString) |
|  [paddedUInt256](./variables/paddeduint256.md) | Utility function that transforms a BigNumberish from the output of the ITierV2 contract report |
|  [paddedUInt32](./variables/paddeduint32.md) | Utility function to produce 32 bits size hexString |
|  [paddedUInt64](./variables/paddeduint64.md) | Utility function to produce 64 bits size hexString |
|  [parseUnits](./variables/parseunits.md) | ethers parseUnits |
|  [stringToUint8Array](./variables/stringtouint8array.md) | Converts a string to uint8array |
|  [VITALIK](./variables/vitalik.md) | vitalik address used for evm simulations |
|  [WORD\_PATTERN](./variables/word_pattern.md) | Rainlang word pattern |
|  [zeroPad](./variables/zeropad.md) | ethers zeroPad |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [ExpressionConfig](./types/expressionconfig.md) | Type of valid parsed expression, i.e. compiled bytes |
|  [ParsedChunk](./types/parsedchunk.md) | Type for result of matches found in a string |

