import { Meta } from "@rainprotocol/meta";
import { Rainlang } from "./parser/rainlang";
import { RainDocument } from "./parser/rainDocument";
import { MarkupKind } from "vscode-languageserver-types";
import { BigNumberish, BytesLike, ParsedChunk } from "./utils";
import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";


export * from "vscode-languageserver-types";
export { TextDocument, TextDocumentContentChangeEvent, Meta };

/**
 * @public Illegal character pattern 
 */
export const ILLEGAL_CHAR = /[^ -~\s]+/;

/**
 * @public Rainlang word pattern 
 */
export const WORD_PATTERN = /^[a-z][0-9a-z-]*$/;

/**
 * @public Import hash pattern 
 */
export const HASH_PATTERN = /^0x[a-zA-F0-9]{64}$/;

/**
 * @public Rainlang numeric pattern 
 */
export const NUMERIC_PATTERN = /^0x[0-9a-zA-Z]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/;

/**
 * @public Hex pattern
 */
export const HEX_PATTERN = /^0x[a-fA-F0-9]+$/;

/**
 * @public RainDocument Namespace pattern
 */
export const NAMESPACE_PATTERN = /^(\.?[a-z][0-9a-z-]*)*\.?$/;

/**
 * @public the default elided binding msg
 */
export const DEFAULT_ELISION = "elided binding, requires rebinding";

/**
 * @public
 * Error codes of Rainlang/RainDocument problem and LSP Diagnostics
 */
export enum ErrorCode {
    IllegalChar = 0,
    RuntimeError = 1,
    CircularDependency = 2,
    UnresolvableDependencies = 3,
    DeepImport = 4,
    DeepNamespace = 5,
    // CorruptImport = 6,
    CorruptMeta = 6, 
    // ForbiddenId = 8,
    ElidedBinding = 7,
    SingletonWords = 8,
    MultipleWords = 9,
    SingleWordModify = 10,
    InconsumableMeta = 11,

    UndefinedWord = 0x101,
    UndefinedAuthoringMeta = 0x102,
    UndefinedImport = 0x103,
    UndefinedQuote = 0x104,
    UndefinedOpcode = 0x105,
    UndefinedIdentifier = 0x106,

    InvalidWordPattern = 0x201,
    InvalidExpression = 0x202,
    // InvalidNestedNode = 0x203,
    InvalidSelfReference = 0x204,
    InvalidHash = 0x205,
    // InvalidOpMeta = 0x206,
    // InvalidContractMeta = 0x207,
    InvalidImport = 0x208,
    InvalidEmptyBinding = 0x209,
    InvalidBindingId = 0x210,
    InvalidQuote = 0x211,
    InvalidOperandArg = 0x212,
    InvalidReference = 0x213,
    InvalidRainDocument = 0x214,
    // InvalidMetaSequence = 0x213,
    // InvalidElision = 0x214,

    UnexpectedToken = 0x301,
    UnexpectedClosingParen = 0x302,
    UnexpectedNamespacePath = 0x303,
    UnexpectedRebinding = 0x304,
    UnexpectedClosingAngleParen = 0x305,
    UnexpectedEndOfComment = 0x306,
    UnexpectedComment = 0x307,
    UndefinedDISpair = 0x308,
    // UnexpectedSpace = 0x309,
    // UnexpectedBindingIdUsage = 0x303,
    // UnexpectedFragment = 0x304,
    // UnexpectedExpression = 0x305,

    ExpectedOpcode = 0x401,
    ExpectedSpace = 0x402,
    // ExpectedOperandArgs = 0x403,
    ExpectedClosingParen = 0x404,
    ExpectedOpeningParen = 0x405,
    ExpectedClosingAngleBracket = 0x406,
    ExpectedName = 0x407,
    ExpectedSemi = 0x408,
    ExpectedHash = 0x409,
    ExpectedElisionOrRebinding = 0x410,
    // ExpectedImportIdentifier = 0x409,
    // ExpectedConstant = 0x407,

    MismatchRHS = 0x501,
    MismatchLHS = 0x502,
    // MismatchOperandArgs = 0x503,

    // OutOfRangeInputs = 0x601,
    // OutOfRangeOperandArgs = 0x602,
    OutOfRangeValue = 0x603,

    DuplicateAlias = 0x701,
    DuplicateIdentifier = 0x702,
    DuplicateImportStatement = 0x703,
    DuplicateImport = 0x704
    // DuplicateContextAlias = 0x702,
    // DuplicateBindingId = 0x703,
}

// /**
//  * @public Fallback rainlang (native parser) error selectors
//  */
// export enum FallbackErrorSelectors {
//     "AuthoringMetaHashMismatch(bytes32,bytes32)"        = 0x26cc0fec,
//     "BadDynamicLength(uint256,uint256)"                 = 0xc8b56901,
//     "BadOpInputsLength(uint256,uint256,uint256)"        = 0xddf56071,
//     "DanglingSource()"                                  = 0x858f2dcf,
//     "DecimalLiteralOverflow(uint256)"                   = 0x8f2b5ffd,
//     "DuplicateFingerprint()"                            = 0x59293c51,
//     "DuplicateLHSItem(uint256)"                         = 0x53e6feba,
//     "EntrypointMinOutputs(uint256,uint256,uint256)"     = 0xf7dd619f,
//     "EntrypointMissing(uint256,uint256)"                = 0xfd9e1af4,
//     "EntrypointNonZeroInput(uint256,uint256)"           = 0xee8d1081,
//     "ExcessLHSItems(uint256)"                           = 0x43168e68,
//     "ExcessRHSItems(uint256)"                           = 0x78ef2782,
//     "ExpectedLeftParen(uint256)"                        = 0x23b5c6ea,
//     "ExpectedOperand(uint256)"                          = 0x24027dc4,
//     "HexLiteralOverflow(uint256)"                       = 0xff2f5949,
//     "MalformedCommentStart(uint256)"                    = 0x3e47169c,
//     "MalformedExponentDigits(uint256)"                  = 0x013b2aaa,
//     "MalformedHexLiteral(uint256)"                      = 0x69f1e3e6,
//     "MaxSources()"                                      = 0xa8062841,
//     "MissingFinalSemi(uint256)"                         = 0xf06f54cf,
//     "NotAcceptingInputs(uint256)"                       = 0xab1d3ea7,
//     "OddLengthHexLiteral(uint256)"                      = 0xd76d9b57,
//     "OperandOverflow(uint256)"                          = 0x7480c784,
//     "OutOfBoundsConstantRead(uint256,uint256,uint256)"  = 0xeb789454,
//     "OutOfBoundsStackRead(uint256,uint256,uint256)"     = 0xeaa16f33,
//     "ParenOverflow()"                                   = 0x6232f2d9,
//     "ParserOutOfBounds()"                               = 0x7d565df6,
//     "SourceOffsetOutOfBounds(bytes,uint256)"            = 0xd3fc97bd,
//     "StackAllocationMismatch(uint256,uint256)"          = 0x4d9c18dc,
//     "StackOutputsMismatch(uint256,uint256)"             = 0x4689f0b3,
//     "StackOverflow()"                                   = 0xa25cba31,
//     "StackUnderflow(uint256,uint256,uint256)"           = 0x2cab6bff,
//     "StackUnderflow()"                                  = 0x04671d00,
//     "StackUnderflowHighwater(uint256,uint256,uint256)"  = 0x1bc5ab0f,
//     "UnclosedLeftParen(uint256)"                        = 0x6fb11cdc,
//     "UnclosedOperand(uint256)"                          = 0x722cd24a,
//     "UnexpectedComment(uint256)"                        = 0xedad0c58,
//     "UnexpectedConstructionMetaHash(bytes32)"           = 0xc99c7f98,
//     "UnexpectedInterpreterBytecodeHash(bytes32)"        = 0x1dd8527e,
//     "UnexpectedLHSChar(uint256)"                        = 0x5520a517,
//     "UnexpectedOperand(uint256)"                        = 0xf8216c55,
//     "UnexpectedPointers(bytes)"                         = 0x9835e402,
//     "UnexpectedRHSChar(uint256)"                        = 0x4e803df6,
//     "UnexpectedRightParen(uint256)"                     = 0x7f9db542,
//     "UnexpectedStoreBytecodeHash(bytes32)"              = 0xcc0415fd,
//     "UnknownWord(uint256)"                              = 0x81bd48db,
//     "UnsupportedLiteralType(uint256)"                   = 0xb0e4e5b3,
//     "WordSize(string)"                                  = 0xe47fe8b7,
//     "WriteError()"                                      = 0x08d4abb6,
//     "ZeroLengthDecimal(uint256)"                        = 0xfa65827e,
//     "ZeroLengthHexLiteral(uint256)"                     = 0xc75cd509,
// }

/**
 * @public ExpressionDeployerV2 selectors
 */
export const NATIVE_PARSER_ABI = [
    "constructor(tuple(address interpreter, address store, bytes meta) config)",
    "event ExpressionAddress(address sender, address expression)",
    "event NewExpression(address sender, bytes bytecode, uint256[] constants, uint256[] minOutputs)",
    "event DISpair(address sender, address deployer, address interpreter, address store, bytes opMeta)",
    "error MaxSources()",
    "error WriteError()",
    "error ParenOverflow()",
    "error StackOverflow()",
    "error DanglingSource()",
    "error StackUnderflow()",
    "error ParserOutOfBounds()",
    "error WordSize(string word)",
    "error DuplicateFingerprint()",
    "error UnknownWord(uint256 offset)",
    "error ExcessLHSItems(uint256 offset)",
    "error ExcessRHSItems(uint256 offset)",
    "error ExpectedOperand(uint256 offset)",
    "error OperandOverflow(uint256 offset)",
    "error TruncatedHeader(bytes bytecode)",
    "error TruncatedSource(bytes bytecode)",
    "error UnclosedOperand(uint256 offset)",
    "error MissingFinalSemi(uint256 offset)",
    "error ExpectedLeftParen(uint256 offset)",
    "error UnclosedLeftParen(uint256 offset)",
    "error UnexpectedComment(uint256 offset)",
    "error UnexpectedLHSChar(uint256 offset)",
    "error UnexpectedOperand(uint256 offset)",
    "error UnexpectedRHSChar(uint256 offset)",
    "error UnexpectedSources(bytes bytecode)",
    "error ZeroLengthDecimal(uint256 offset)",
    "error HexLiteralOverflow(uint256 offset)",
    "error NotAcceptingInputs(uint256 offset)",
    "error MalformedHexLiteral(uint256 offset)",
    "error OddLengthHexLiteral(uint256 offset)",
    "error UnexpectedRightParen(uint256 offset)",
    "error ZeroLengthHexLiteral(uint256 offset)",
    "error DuplicateLHSItem(uint256 errorOffset)",
    "error MalformedCommentStart(uint256 offset)",
    "error DecimalLiteralOverflow(uint256 offset)",
    "error TruncatedHeaderOffsets(bytes bytecode)",
    "error UnsupportedLiteralType(uint256 offset)",
    "error MalformedExponentDigits(uint256 offset)",
    "error UnexpectedPointers(bytes actualPointers)",
    "error UnexpectedTrailingOffsetBytes(bytes bytecode)",
    "error AuthoringMetaHashMismatch(bytes32 expected, bytes32 actual)",
    "error SourceIndexOutOfBounds(bytes bytecode, uint256 sourceIndex)",
    "error CallOutputsExceedSource(uint256 sourceOutputs, uint256 outputs)",
    "error StackSizingsNotMonotonic(bytes bytecode, uint256 relativeOffset)",
    "error StackOutputsMismatch(uint256 stackIndex, uint256 bytecodeOutputs)",
    "error BadDynamicLength(uint256 dynamicLength, uint256 standardOpsLength)",
    "error EntrypointNonZeroInput(uint256 entrypointIndex, uint256 inputsLength)",
    "error EntrypointMissing(uint256 expectedEntrypoints, uint256 actualEntrypoints)",
    "error StackAllocationMismatch(uint256 stackMaxIndex, uint256 bytecodeAllocation)",
    "error StackUnderflow(uint256 opIndex, uint256 stackIndex, uint256 calculatedInputs)",
    "error OutOfBoundsStackRead(uint256 opIndex, uint256 stackTopIndex, uint256 stackRead)",
    "error BadOpInputsLength(uint256 opIndex, uint256 calculatedInputs, uint256 bytecodeInputs)",
    "error StackUnderflowHighwater(uint256 opIndex, uint256 stackIndex, uint256 stackHighwater)",
    "error UnexpectedStoreBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash)",
    "error OutOfBoundsConstantRead(uint256 opIndex, uint256 constantsLength, uint256 constantRead)",
    "error EntrypointMinOutputs(uint256 entrypointIndex, uint256 outputsLength, uint256 minOutputs)",
    "error UnexpectedInterpreterBytecodeHash(bytes32 expectedBytecodeHash, bytes32 actualBytecodeHash)",
    "error UnexpectedConstructionMetaHash(bytes32 expectedConstructionMetaHash, bytes32 actualConstructionMetaHash)",
    "function iStore() view returns (address)",
    "function parseMeta() pure returns (bytes)",
    "function iInterpreter() view returns (address)",
    "function authoringMetaHash() pure returns (bytes32)",
    "function integrityFunctionPointers() view returns (bytes)",
    "function parse(bytes data) pure returns (bytes, uint256[])",
    "function buildParseMeta(bytes authoringMeta) pure returns (bytes)",
    "function supportsInterface(bytes4 interfaceId_) view returns (bool)",
    "function integrityCheck(bytes bytecode, uint256[] constants, uint256[] minOutputs) view",
    "function deployExpression(bytes bytecode, uint256[] constants, uint256[] minOutputs) returns (address, address, address)"
] as const;

/**
 * @public Native Parser known subgraph endpoints
 */
export const NP_SGS = [
    "https://api.thegraph.com/subgraphs/name/rainprotocol/interpreter-registry-np-eth",
    "https://api.thegraph.com/subgraphs/name/rainprotocol/interpreter-registry-np-matic",
    "https://api.thegraph.com/subgraphs/name/rainprotocol/interpreter-registry-np",
] as const;

/**
 * @public
 * Parameters for initiating Language Services
 */
export interface LanguageServiceParams {
    /**
     * Describes the LSP capabilities the client supports.
     */
    clientCapabilities?: ClientCapabilities;
    /**
     * Object that keeps cache of metas
     */
    metaStore?: Meta.Store;
}

/**
 * @public
 * Describes what LSP capabilities the client supports
 */
export interface ClientCapabilities {
    /**
     * The text document client capabilities
     */
    textDocument?: {
        /**
         * Capabilities specific to the `textDocument/publishDiagnostics` notification.
         */
        publishDiagnostics?: {
            /**
             * Whether the clients accepts diagnostics with related information.
             */
            relatedInformation?: boolean;
        };
        /**
         * Capabilities specific to completions.
         */
        completion?: {
            /**
             * The client supports the following `CompletionItem` specific
             * capabilities.
             */
            completionItem?: {
                /**
                 * Client supports the follow content formats for the documentation
                 * property. The order describes the preferred format of the client.
                 */
                documentationFormat?: MarkupKind[];
            };
        };
        /**
         * Capabilities specific to hovers.
         */
        hover?: {
            /**
             * Client supports the follow content formats for the content
             * property. The order describes the preferred format of the client.
             */
            contentFormat?: MarkupKind[];
        };
    };
}

/**
 * @public
 * Predefined latest client capabilities
 */
export namespace ClientCapabilities {
    export const ALL: ClientCapabilities = {
        textDocument: {
            publishDiagnostics: {
                relatedInformation: true
            },
            completion: {
                completionItem: {
                    documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText]
                }
            },
            hover: {
                contentFormat: [MarkupKind.Markdown, MarkupKind.PlainText]
            }
        }
    };
}

/**
 * @public How a completion was triggered
 */
export enum CompletionTriggerKind {
    /**
     * Completion was triggered by typing an identifier (24x7 code
     * complete), manual invocation (e.g Ctrl+Space) or via API.
     */
    Invoked = 1,
    /**
     * Completion was triggered by a trigger character specified by
     * the `triggerCharacters` properties of the `CompletionRegistrationOptions`.
     */
    TriggerCharacter = 2,
    /**
     * Completion was re-triggered as current completion list is incomplete
     */
    TriggerForIncompleteCompletions = 3,
}

/**
 * @public
 * Type of valid parsed expression, i.e. compiled bytes 
 */
export type ExpressionConfig = {
    /**
     * Sources verbatim.
     */
    bytecode: BytesLike;
    /**
     * Constants verbatim.
     */
    constants: BigNumberish[];
}

/**
 * @public This namespace provides all types and functionalities for RainDocument and Rainlang ASTs
 */
export namespace AST {
    /**
     * @public Type for start and end indexes of node in a text, inclusive at both ends
     */
    export type Offsets = [number, number];
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Offsets {
        /**
         * @public Checks if a value is a valid Offsets
         * @param value - The value to check
         */
        export function is(value: any): value is Offsets {
            return Array.isArray(value) 
                && value.length === 2 
                && typeof value[0] === "number" 
                && typeof value[1] === "number";
        }
    }

    /**
     * @public Type for Rainlang/RainDocument problem
     */
    export interface Problem {
        msg: string;
        position: Offsets;
        code: number;
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Problem {
        /**
         * @public Checks if a value is a valid ProblemASTNode
         * @param value - The value to check
         */
        export function is(value: any): value is Problem {
            return value !== null 
                && typeof value === "object"
                && typeof value.msg === "string"
                && Offsets.is(value.position)
                && typeof value.code === "number";
        }
    }

    /**
     * @public Type Rainlang AST Value node
     */
    export interface Value {
        value: string;
        position: Offsets;
        lhsAlias?: Alias[];
        id?: string;
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Value {
        /**
         * @public Checks if a value is a valid Value
         * @param value - The value to check
         */
        export function is(value: any): value is Value {
            return value !== null 
                && typeof value === "object"
                && typeof value.value === "string"
                && Offsets.is(value.position)
                && (
                    typeof value.lhsAlias === "undefined" || (
                        Array.isArray(value.lhsAlias) &&
                        value.lhsAlias.length === 1 &&
                        Alias.is(value.lhsAlias[0])
                    )
                );
        }
    }

    /**
     * @public Type for Rainlang AST Opcode node
     */
    export interface Opcode {
        opcode: {
            name: string;
            description: string;
            position: Offsets;
        };
        operand: number;
        output: number;
        position: Offsets;
        parens: Offsets;
        parameters: Node[];
        isCtx?: boolean;
        lhsAlias?: Alias[];
        operandArgs?: {
            position: Offsets;
            args: {
                value: string;
                name: string;
                position: Offsets;
                description: string;
            }[];
        };
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Opcode {
        /**
         * @public Checks if a value is a valid Opcode
         * @param value - The value to check
         */
        export function is(value: any): value is Opcode {
            return value !== null 
                && typeof value === "object"
                && value.opcode !== null
                && typeof value.opcode === "object"
                && typeof value.opcode.name === "string"
                && typeof value.opcode.description === "string"
                && Offsets.is(value.opcode.position)
                && typeof value.operand === "number"
                && typeof value.output === "number"
                && Offsets.is(value.position)
                && Offsets.is(value.parens)
                && Array.isArray(value.parameters)
                && value.parameters.every((v: any) => Node.is(v))
                && (
                    typeof value.lhsAlias === "undefined" || (
                        Array.isArray(value.lhsAlias) &&
                        value.lhsAlias.every((v: any) => Alias.is(v))
                    )
                )
                && (
                    typeof value.operandArgs === "undefined" || (
                        value.operandArgs !== null 
                        && typeof value.operandArgs === "object"
                        && Offsets.is(value.operandArgs.position)
                        && Array.isArray(value.operandArgs.args)
                        && value.operandArgs.args.every(
                            (v: any) => v !== null
                                && typeof v === "object"
                                && typeof v.value === "string"
                                && typeof v.name === "string"
                                && Offsets.is(v.position)
                                && typeof v.description === "string"
                        )
                    )
                );
        }
    }

    /**
     * @public Type for Rainlang/RainDocument alias
     */
    export interface Alias {
        name: string;
        position: Offsets;
        lhsAlias?: Alias[];
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Alias {
        /**
         * @public Checks if a value is a valid Alias
         * @param value - The value to check
         */
        export function is(value: any): value is Alias {
            return value !== null 
                && typeof value === "object"
                && typeof value.name === "string"
                && Offsets.is(value.position)
                && (
                    typeof value.lhsAlias === "undefined" || (
                        Array.isArray(value.lhsAlias) &&
                        value.lhsAlias.length === 1 &&
                        Alias.is(value.lhsAlias[0])
                    )
                );
        }
    }

    /**
     * @public Type for Rainlang/RainDocument comments
     */
    export interface Comment {
        comment: string;
        position: Offsets;
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Comment {
        /**
         * @public Checks if a value is a valid CommentASTNode
         * @param value - The value to check
         */
        export function is(value: any): value is Comment {
            return value !== null
                && typeof value === "object"
                && typeof value.comment === "string"
                && Offsets.is(value.position);
        }
    }

    /**
     * @public Type of import statements specified in a RainDocument
     */
    export interface Import {
        name: string;
        namePosition: Offsets;
        hash: string;
        hashPosition: Offsets;
        position: Offsets;
        problems: Problem[];
        reconfigs?: [ParsedChunk, ParsedChunk][];
        reconfigProblems?: Problem[];
        sequence?: {
            dispair?: {
                bytecode: string;
                authoringMeta?: Meta.Authoring[];
            }
            ctxmeta?: ContextAlias[];
            dotrain?: RainDocument;
        };
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Import {
        /**
         * @public Checks if a value is a valid ImportASTNode
         * @param value - The value to check
         */
        export function is(value: any): value is Import {
            return value !== null
                && typeof value === "object"
                && typeof value.name === "string"
                && typeof value.hash === "string"
                && Offsets.is(value.namePosition)
                && Offsets.is(value.hashPosition)
                && Offsets.is(value.position);
        }
    }

    /**
     * @public Type of an AST node
     */
    export type Node = Value | Opcode | Alias;
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Node {
        /**
         * @public Checks if a value is a valid Node
         * @param value - The value to check
         */
        export function is(value: any): value is Node {
            return Value.is(value) 
                || Alias.is(value)
                || Opcode.is(value);
        }
    }

    /**
     * @public Type of a Rainlang AST
     */
    export type RainlangAST = { 
        lines: {
            nodes: Node[]; 
            position: Offsets; 
            aliases: Alias[];
        }[];
        position: Offsets;
    }[];
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace RainlangAST {
        /**
         * @public Checks if a value is a valid RainlangAST
         * @param value - The value to check
         */
        export function is(value: any): value is RainlangAST {
            return Array.isArray(value)
                && value.every(v => v !== null
                    && typeof v === "object"
                    && Array.isArray(v.lines)
                    && v.lines.every((l: any) => Offsets.is(l.position)
                            && Array.isArray(l.nodes)
                            && l.nodes.every((n: any) => Node.is(n))
                            && Array.isArray(l.aliases)
                            && l.aliases.every((n: any) => Alias.is(n))
                    )
                );
        }

        /**
         * @public Checks if a value is a valid RainlangAST Expression
         * @param value - The value to check
         */
        export function isExpression(value: any): boolean {
            return Array.isArray(value)
                && value.every(v => v !== null
                    && typeof v === "object"
                    && Array.isArray(v.lines)
                    && v.lines.length > 0
                    && v.lines.every((l: any) => Offsets.is(l.position)
                        && Array.isArray(l.nodes)
                        && Array.isArray(l.aliases)
                        && (
                            l.aliases.length > 0 ||
                            l.nodes.every(
                                (n: any) => Node.is(n) && n.lhsAlias !== undefined
                            )
                        )
                    )
                );
        }
    }

    /**
     * @public Type for a binding (named expressions)
     */
    export type Binding = {
        name: string;
        namePosition: Offsets;
        content: string;
        contentPosition: Offsets;
        position: Offsets;
        problems: Problem[];
        dependencies: string[];
        elided?: string;
        constant?: string;
        exp?: Rainlang;
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Binding {
        /**
         * @public Checks if a value is a valid NamedExpression
         * @param value - The value to check
         */
        export function is(value: any): value is Binding {
            return value !== null
                && typeof value === "object"
                && typeof value.name === "string"
                && Offsets.is(value.namePosition)
                && typeof value.content === "string"
                && Offsets.is(value.contentPosition)
                && Offsets.is(value.position)
                && (
                    (
                        value.exp instanceof Rainlang && 
                        typeof value.elided === "undefined" && 
                        typeof value.constant === "undefined"
                    ) || (
                        typeof value.elided === "string" && 
                        typeof value.exp === "undefined" && 
                        typeof value.constant === "undefined"
                    ) || (
                        typeof value.constant === "string" && 
                        typeof value.exp === "undefined" && 
                        typeof value.elided === "undefined"
                    )
                );
        }

        /**
         * @public Checks if a value is a valid NamedExpression Expression
         * @param value - The value to check
         */
        export function isExpression(value: any): boolean {
            return value !== null
                && typeof value === "object"
                && typeof value.name === "string"
                && Offsets.is(value.namePosition)
                && typeof value.content === "string"
                && Offsets.is(value.contentPosition)
                && Offsets.is(value.position)
                && value.exp instanceof Rainlang
                && RainlangAST.isExpression(value.exp.ast);
        }
    }

    /**
     * @public Type for a namespace node
     */
    export type NamespaceNode = { 
        Hash: string;
        ImportIndex: number;
        Element: Meta.Authoring | Meta.Authoring[] | Binding | ContextAlias 
    }
    /**
     * @public Type for a namespace in dotrain
     */
    export type Namespace = { [key: string]: Namespace | NamespaceNode }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace Namespace {
        /**
         * @public Checks if a value is a valid Namespace
         * @param value - The value to check
         */
        export function is(value: any): value is Namespace {
            return value !== null
                && typeof value === "object"
                && (
                    (
                        Object.keys(value).every(v => WORD_PATTERN.test(v)) && 
                        Object.values(value).every(v => Namespace.is(v))
                    ) || (
                        Object.entries(value).every(v => 
                            (
                                v[0] === "Element" && (
                                    ContextAlias.is(v[1]) || 
                                    Binding.is(v[1]) || 
                                    Meta.Authoring.is(v[1]) || 
                                    (Array.isArray(v[1]) && v[1].every(e => Meta.Authoring.is(e)))
                                )
                            ) ||
                            (
                                v[0] === "Hash" && typeof v[1] === "string" && HASH_PATTERN.test(v[1])
                            ) ||
                            (
                                v[0] === "ImportIndex" && typeof v[1] === "number" && !isNaN(v[1])
                            )
                        )
                    )
                );
        }

        export function isNamespace(value: any): value is Namespace {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "undefined"
                && typeof value.Element === "undefined";
        }

        export function isNode(value: any): value is NamespaceNode {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "number"
                && typeof value.Element !== "undefined";
        }

        export function isWords(value: any): value is { 
            Hash: string;
            ImportIndex: number; 
            Element: Meta.Authoring[]
        } {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "number"
                && Array.isArray(value.Element);
        }

        export function isWord(value: any): value is { 
            Hash: string;
            ImportIndex: number; 
            Element: Meta.Authoring
        } {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "number"
                && "Element" in value
                && "word" in value.Element;
        }

        export function isContextAlias(value: any): value is { 
            Hash: string;
            ImportIndex: number; 
            Element: ContextAlias
        } {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "number"
                && "Element" in value
                && "column" in value.Element;
        }

        export function isBinding(value: any): value is { 
            Hash: string;
            ImportIndex: number; 
            Element: Binding
        } {
            return value !== null
                && typeof value === "object"
                && typeof value.ImportIndex === "number"
                && "Element" in value
                && "content" in value.Element;
        }
    }

    /**
     * @public Type for context aliases from a contract caller meta
     */
    export type ContextAlias = {
        name: string;
        description: string;
        column: number;
        row: number;
    }
    /**
     * @public The namespace provides functionality to type check
     */
    export namespace ContextAlias {
        /**
         * @public Checks if a value is a valid ContextAlias
         * @param value - The value to check
         */
        export function is(value: any): value is Namespace {
            return value !== null
                && typeof value === "object"
                && typeof value.name === "string"
                && WORD_PATTERN.test(value.name)
                && typeof value.desc === "string"
                && typeof value.column === "number"
                && Number.isInteger(value.column)
                && typeof value.row === "number"
                && (isNaN(value.row) || Number.isInteger(value.row));
        }
    }
}