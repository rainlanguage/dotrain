import { MetaStore } from "./parser/metaStore";
import { BigNumberish, BytesLike } from "./utils";
import { MarkupKind } from "vscode-languageserver-types";
import { RainlangParser } from "./parser/rainlangParser";
import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";

export * from "vscode-languageserver-types";
export { TextDocument, TextDocumentContentChangeEvent };


/**
 * @public Illigal character pattern 
 */
export const ILLIGAL_CHAR = /[^ -~\s]+/;

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
 * @public
 * Error codes of Rainlang/RainDocument problem and LSP Diagnostics
 */
export enum ErrorCode {
    UndefinedOpMeta = 0,
    UndefinedWord = 1,
    IlligalChar = 2,
    UndefinedMeta = 3,
    UndefinedExpression = 4,

    InvalidWordPattern = 0x101,
    InvalidExpression = 0x102,
    InvalidNestedNode = 0x103,
    InvalidSelfReferenceLHS = 0x104,
    InvalidHash = 0x105,
    InvalidOpMeta = 0x106,
    InvalidContractMeta = 0x107,
    InvalidImport = 0x108,
    InvalidEmptyExpression = 0x109,
    InvalidExpressionKey = 0x110,

    UnexpectedEndOfComment = 0x201,
    UnexpectedClosingParen = 0x202,
    UnexpectedExpressionKeyUsage = 0x203,
    UnexpectedFragment = 0x204,
    UnexpectedExpression = 0x205,
    UnexpectedString = 0x206,
    // UnexpectedRHSComment = 0x207,

    ExpectedOpcode = 0x301,
    ExpectedSpace = 0x302,
    ExpectedOperandArgs = 0x303,
    ExpectedClosingParen = 0x304,
    ExpectedOpeningParen = 0x305,
    ExpectedClosingAngleBracket = 0x306,
    ExpectedConstant = 0x307,

    MismatchRHS = 0x401,
    MismatchLHS = 0x402,
    MismatchOperandArgs = 0x403,

    OutOfRangeInputs = 0x501,
    OutOfRangeOperandArgs = 0x502,
    OutOfRangeValue = 0x503,

    DuplicateAlias = 0x801,
    DuplicateContextAlias = 0x802,
    DuplicateExpressionKey = 0x803,

    UnknownOp = 0x700,

    RuntimeError = 0x800,

    CircularDependency = 0x900
}

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
    metaStore?: MetaStore;
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
    sources: BytesLike[];
    /**
     * Constants verbatim.
     */
    constants: BigNumberish[];
}

/**
 * @public Type for read-memory opcode
 */
export enum MemoryType {
    Stack,
    Constant,
}

/**
 * @public Type for start and end indexes for RainDocument items, inclusive at both ends
 */
export type PositionOffset = [number, number];

/**
 * @public The namespace provides functionality to type check
 */
export namespace PositionOffset {

    /**
     * @public Checks if a value is a valid PositionOffset
     * @param value - The value to check
     */
    export function is(value: any): value is PositionOffset {
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
    position: PositionOffset;
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
            && PositionOffset.is(value.position)
            && typeof value.code === "number";
    }
}

/**
 * @public Type Rainlang AST Value node
 */
export interface ValueASTNode {
    value: string;
    position: PositionOffset;
    lhsAlias?: AliasASTNode[];
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace ValueASTNode {

    /**
     * @public Checks if a value is a valid ValueASTNode
     * @param value - The value to check
     */
    export function is(value: any): value is ValueASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.value === "string"
            && PositionOffset.is(value.position)
            && (
                typeof value.lhsAlias === "undefined" || (
                    Array.isArray(value.lhsAlias) &&
                    value.lhsAlias.length === 1 &&
                    AliasASTNode.is(value.lhsAlias[0])
                )
            );
    }
}

/**
 * @public Type for Rainlang AST Opcode node
 */
export interface OpASTNode {
    opcode: {
        name: string;
        description: string;
        position: PositionOffset;
    };
    operand: number;
    output: number;
    position: PositionOffset;
    parens: PositionOffset;
    parameters: ASTNode[];
    operandArgs?: {
        position: PositionOffset;
        args: {
            value: string;
            name: string;
            position: PositionOffset;
            description: string;
        }[];
    };
    lhsAlias?: AliasASTNode[];
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace OpASTNode {

    /**
     * @public Checks if a value is a valid OpASTNode
     * @param value - The value to check
     */
    export function is(value: any): value is OpASTNode {
        return value !== null 
            && typeof value === "object"
            && value.opcode !== null
            && typeof value.opcode === "object"
            && typeof value.opcode.name === "string"
            && typeof value.opcode.description === "string"
            && PositionOffset.is(value.opcode.position)
            && typeof value.operand === "number"
            && typeof value.output === "number"
            && PositionOffset.is(value.position)
            && PositionOffset.is(value.parens)
            && Array.isArray(value.parameters)
            && value.parameters.every((v: any) => ASTNode.is(v))
            && (
                typeof value.lhsAlias === "undefined" || (
                    Array.isArray(value.lhsAlias) &&
                    value.lhsAlias.every((v: any) => AliasASTNode.is(v))
                )
            )
            && (
                typeof value.operandArgs === "undefined" || (
                    value.operandArgs !== null 
                    && typeof value.operandArgs === "object"
                    && PositionOffset.is(value.operandArgs.position)
                    && Array.isArray(value.operandArgs.args)
                    && value.operandArgs.args.every(
                        (v: any) => v !== null
                            && typeof v === "object"
                            && typeof v.value === "string"
                            && typeof v.name === "string"
                            && PositionOffset.is(v.position)
                            && typeof v.description === "string"
                    )
                )
            );
    }
}

/**
 * @public Type for Rainlang/RainDocument alias
 */
export interface AliasASTNode {
    name: string;
    position: PositionOffset;
    lhsAlias?: AliasASTNode[];
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace AliasASTNode {

    /**
     * @public Checks if a value is a valid AliasASTNode
     * @param value - The value to check
     */
    export function is(value: any): value is AliasASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.name === "string"
            && PositionOffset.is(value.position)
            && (
                typeof value.lhsAlias === "undefined" || (
                    Array.isArray(value.lhsAlias) &&
                    value.lhsAlias.length === 1 &&
                    AliasASTNode.is(value.lhsAlias[0])
                )
            );
    }
}

/**
 * @public Type for Rainlang/RainDocument comments
 */
export interface Comment {
    comment: string;
    position: PositionOffset;
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
            && PositionOffset.is(value.position);
    }
}

/**
 * @public Type of import statements specified in a RainDocument
 */
export interface Import {
    name: string;
    hash: string;
    position: PositionOffset;
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
            && PositionOffset.is(value.position);
    }
}

/**
 * @public Type of an AST node
 */
export type ASTNode = ValueASTNode | OpASTNode | AliasASTNode;

/**
 * @public The namespace provides functionality to type check
 */
export namespace ASTNode {

    /**
     * @public Checks if a value is a valid ASTNode
     * @param value - The value to check
     */
    export function is(value: any): value is ASTNode {
        return ValueASTNode.is(value) 
            || AliasASTNode.is(value)
            || OpASTNode.is(value);
    }
}

/**
 * @public Type of a Rainlang AST
 */
export type RainlangAST = { 
    lines: {
        nodes: ASTNode[]; 
        position: PositionOffset; 
        aliases: AliasASTNode[];
    }[]
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace RainlangAST {

    /**
     * @public Checks if a value is a valid RainlangAST
     * @param value - The value to check
     */
    export function is(value: any): value is RainlangAST {
        return value !== null
            && typeof value === "object"
            && Array.isArray(value.lines)
            && value.lines.every((v: any) => PositionOffset.is(v.position)
                    && Array.isArray(v.nodes)
                    && v.nodes.every((e: any) => ASTNode.is(e))
                    && Array.isArray(v.aliases)
                    && v.aliases.every((e: any) => AliasASTNode.is(e))
            );
    }

    /**
     * @public Checks if a value is a valid RainlangAST Constant
     * @param value - The value to check
     */
    export function isConstant(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && Array.isArray(value.lines)
            && value.lines.length === 1
            && value.lines.every((v: any) => PositionOffset.is(v.position)
                    && Array.isArray(v.nodes)
                    && v.nodes.length === 1
                    && ValueASTNode.is(v.nodes[0])
                    && typeof v.nodes[0].lhsAlias === "undefined"
                    && Array.isArray(v.aliases)
                    && v.aliases.length === 0
            );
    }

    /**
     * @public Checks if a value is a valid RainlangAST Expression
     * @param value - The value to check
     */
    export function isExpression(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && Array.isArray(value.lines)
            && value.lines.length > 0
            && value.lines.every((v: any) => PositionOffset.is(v.position)
                && Array.isArray(v.nodes)
                && Array.isArray(v.aliases)
                && (
                    v.aliases.length > 0 ||
                    v.nodes.every(
                        (e: any) => ASTNode.is(e) && e.lhsAlias !== undefined
                    )
                )
            );
    }
}

/**
 * @public Type for a named expression
 */
export type NamedExpression = {
    name: string;
    namePosition: PositionOffset;
    text: string;
    position: PositionOffset;
    parseObj?: RainlangParser;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace NamedExpression {

    /**
     * @public Checks if a value is a valid NamedExpression
     * @param value - The value to check
     */
    export function is(value: any): value is NamedExpression {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && PositionOffset.is(value.namePosition)
            && typeof value.text === "string"
            && PositionOffset.is(value.position)
            && (
                typeof value.parseObj === "undefined" ||
                value.parseObj instanceof RainlangParser
            );
    }

    /**
     * @public Checks if a value is a valid NamedExpression Constant
     * @param value - The value to check
     */
    export function isConstant(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && PositionOffset.is(value.namePosition)
            && typeof value.text === "string"
            && PositionOffset.is(value.position)
            && value.parseObj instanceof RainlangParser
            && RainlangAST.isConstant(value.parseObj.ast);
    }

    /**
     * @public Checks if a value is a valid NamedExpression Expression
     * @param value - The value to check
     */
    export function isExpression(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && PositionOffset.is(value.namePosition)
            && typeof value.text === "string"
            && PositionOffset.is(value.position)
            && value.parseObj instanceof RainlangParser
            && RainlangAST.isExpression(value.parseObj.ast);
    }
}

/**
 * @public Type for context aliases from a contract caller meta
 */
export type ContextAlias = {
    name: string;
    desc: string;
    column: number;
    row: number;
}