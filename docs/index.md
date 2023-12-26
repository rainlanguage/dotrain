[Home](./index.md)

# @rainlanguage/dotrain

## Classes

|  Class | Description |
|  --- | --- |
|  [MetaStore](./classes/metastore.md) | In-memory CAS (content addressed storage) for all metadata required for parsing a RainDocument which basically stores k/v pairs of meta hash, meta bytes and ExpressionDeployer reproducible data as well as providing functionalities to easliy read them from the CAS.<br><br>Hashes are 32 bytes (in hex string format) and will be stored as lower case and meta bytes are valid cbor encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to deployedBytecode meta hash and deploy transaction hash. |
|  [RainDocument](./classes/raindocument.md) | Data structure of a parsed .rain text<br><br>RainDocument is the main implementation block that enables parsing of a .rain file contents to its building blocks and parse tree by handling and resolving imports, namespaces, etc which later are used by LSP services and compiler as well as providing all the functionalities in between.<br><br>It is a portable, extensible and composable format for describing Rainlang fragments, .rain serve as a wrapper/container/medium for Rainlang to be shared and audited simply in a permissionless and adversarial environment such as a public blockchain. |
|  [RainlangDocument](./classes/rainlangdocument.md) | Data structure (parse tree) of a Rainlang text<br><br>RainlangDocument is a data structure of a parsed Rainlang text to its parse tree which are used by the RainDocument and for providing LSP services.<br><br>it should be noted that generally this should not be used individually outside RainDocument unless there is a justified reason, as prasing a Rainlang text should be done through Rain NativeParser contract and parsing method of this struct has no effect on NativeParser prasing and is totally separate as it only provides AST data generally used in context of RainDocument for LSP services and sourcemap generation. |
|  [RainLanguageServices](./classes/rainlanguageservices.md) | Provides LSP services which are methods that return LSP based results (Diagnostics, Hover, etc)<br><br>Provides methods for getting language services (such as diagnostics, completion, etc) for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked MetaStore instance that holds all the required metadata/functionalities that are required during parsing a text.<br><br>Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any position encodings will result in the same LSP provided Position value which is 1 for each char. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [ErrorCode](./enums/errorcode.md) | Error codes of Rainlang/RainDocument problem and LSP Diagnostics |

## Functions

|  Function | Description |
|  --- | --- |
|  [rainlang(stringChunks, vars)](./variables/rainlang_1.md) | Method to be used as Tagged Templates to activate embedded rainlang in javascript/typescript in vscode that highlights the rainlang syntax. Requires rainlang vscode extension to be installed. |
|  [searchDeployer(hash, subgraphs)](./variables/searchdeployer_1.md) | seraches for a ExpressionDeployer reproducible data for a given hash in the given subgraphs |
|  [searchMeta(hash, subgraphs)](./variables/searchmeta_1.md) | seraches for a meta for a given hash in the given subgraphs |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Alias](./interfaces/alias.md) |  |
|  [Binding](./interfaces/binding.md) |  |
|  [Comment\_2](./interfaces/comment_2.md) |  |
|  [ConstantBindingItem](./interfaces/constantbindingitem.md) |  |
|  [ContextAlias](./interfaces/contextalias.md) |  |
|  [DeployerQueryResponse](./interfaces/deployerqueryresponse.md) |  |
|  [DispairImportItem](./interfaces/dispairimportitem.md) |  |
|  [ElidedBindingItem](./interfaces/elidedbindingitem.md) |  |
|  [ExpressionConfig](./interfaces/expressionconfig.md) |  |
|  [Import](./interfaces/import.md) |  |
|  [ImportConfiguration](./interfaces/importconfiguration.md) |  |
|  [ImportSequence](./interfaces/importsequence.md) |  |
|  [INPE2Deployer](./interfaces/inpe2deployer.md) |  |
|  [IRainDocument](./interfaces/iraindocument.md) |  |
|  [IRainlangDocument](./interfaces/irainlangdocument.md) |  |
|  [MetaStoreOptions](./interfaces/metastoreoptions.md) |  |
|  [NamespaceNode](./interfaces/namespacenode.md) |  |
|  [Opcode](./interfaces/opcode.md) |  |
|  [OpcodeDetails](./interfaces/opcodedetails.md) |  |
|  [OperandArg](./interfaces/operandarg.md) |  |
|  [OperandArgItem](./interfaces/operandargitem.md) |  |
|  [Problem](./interfaces/problem.md) |  |
|  [RainlangLine](./interfaces/rainlangline.md) |  |
|  [RainlangSource](./interfaces/rainlangsource.md) |  |
|  [Value](./interfaces/value.md) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [BindingItem](./types/bindingitem.md) |  |
|  [IAuthoringMeta](./types/iauthoringmeta.md) |  |
|  [Namespace](./types/namespace.md) |  |
|  [NamespaceItem](./types/namespaceitem.md) |  |
|  [NamespaceNodeElement](./types/namespacenodeelement.md) |  |
|  [Node\_2](./types/node_2.md) |  |
|  [Offsets](./types/offsets.md) |  |
|  [ParsedItem](./types/parseditem.md) |  |
|  [ParseResult](./types/parseresult.md) |  |
|  [RainDocumentCompileError](./types/raindocumentcompileerror.md) |  |
|  [RainlangAST](./types/rainlangast.md) |  |

