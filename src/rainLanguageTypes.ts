import { MetaStore } from "./parser/metaStore";
import { BigNumberish, BytesLike } from "./utils";
import { MarkupKind } from "vscode-languageserver-types";
import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { RainlangParser } from "./parser/rainlangParser";

export * from "vscode-languageserver-types";
export { TextDocument, TextDocumentContentChangeEvent };


/**
 * @public
 * Error codes used by diagnostics
 */
export enum ErrorCode {
    UndefinedOpMeta = 0,
    UndefinedWord = 1,
    IlligalChar = 2,
    UndefinedMeta = 3,
    UndefinedExpression = 4,

    InvalidWordPattern = 0x101,
    InvalidExpression = 0x102,
    InvalidInputsMeta = 0x103,
    InvalidOutputsMeta = 0x104,
    InvalidNestedNode = 0x105,
    InvalidSelfReferenceLHS = 0x106,
    InvalidHash = 0x107,
    InvalidOpMeta = 0x108,
    InvalidContractMeta = 0x109,
    InvalidImport = 0x110,
    InvalidEmptyExpression = 0x111,
    InvalidExpressionKey = 0x112,

    UnexpectedEndOfComment = 0x201,
    UnexpectedClosingParen = 0x202,
    UnexpectedRHSComment = 0x203,
    UnexpectedBindingKeyUsage = 0x204,
    UnexpectedFragment = 0x205,
    UnexpectedExpression = 0x206,
    UnexpectedString = 0x207,

    ExpectedOpcode = 0x301,
    ExpectedSpace = 0x302,
    ExpectedOperandArgs = 0x303,
    ExpectedClosingParen = 0x304,
    ExpectedOpeningParen = 0x305,
    ExpectedClosingAngleBracket = 0x306,
    ExpectedSemi = 0x307,
    ExpectedConstant = 0x308,
    ExpectedExpressionKey = 0x309,

    MismatchRHS = 0x401,
    MismatchLHS = 0x402,
    MismatchOperandArgs = 0x403,

    OutOfRangeInputs = 0x501,
    OutOfRangeOperandArgs = 0x502,
    OutOfRangeValue = 0x503,

    DuplicateAlias = 0x801,
    DuplicateConetxtColumn = 0x802,
    DuplicateContextCell = 0x803,
    DuplicateExpressionKey = 0x804,

    UnknownOp = 0x700,

    RuntimeError = 0x800,

    CircularDependency = 0x900
}

export const illigalChar = /[^ -~\s]+/;
export const wordPattern = /^[a-z][0-9a-z-]*$/;
export const hashPattern = /^0x[a-zA-F0-9]{64}$/;
export const numericPattern = /^0x[0-9a-zA-Z]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/;

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
 * @public Type of position start and end indexes for RainDocument, inclusive at both ends
 */
export type ASTNodePosition = [number, number];

/**
 * @public The namespace provides functionality to type check
 */
export namespace ASTNodePosition {
    export function is(value: any): value is ASTNodePosition {
        return Array.isArray(value) 
            && value.length === 2 
            && typeof value[0] === "number" 
            && typeof value[1] === "number";
    }
}

/**
 * @public Type of RainDocument's problem
 */
export interface ProblemASTNode {
    msg: string;
    position: ASTNodePosition;
    code: number;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace ProblemASTNode {
    export function is(value: any): value is ProblemASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.msg === "string"
            && ASTNodePosition.is(value.position)
            && typeof value.code === "number";
    }
}

/**
 * @public Type of RainDocument's Value node
 */
export interface ValueASTNode {
    value: string;
    position: ASTNodePosition;
    lhsAlias?: AliasASTNode;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace ValueASTNode {
    export function is(value: any): value is ValueASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.value === "string"
            && ASTNodePosition.is(value.position)
            && (typeof value.lhsAlias === "undefined" || AliasASTNode.is(value.lhsAlias));
    }
}

/**
 * @public Type of RainDocument's Opcode node
 */
export interface OpASTNode {
    opcode: {
        name: string;
        description: string;
        position: ASTNodePosition;
    };
    operand: number;
    output: number;
    position: ASTNodePosition;
    parens: ASTNodePosition;
    parameters: FragmentASTNode[];
    operandArgs?: {
        position: ASTNodePosition;
        args: {
            value: string;
            name: string;
            position: ASTNodePosition;
            description?: string;
        }[];
    };
    lhsAlias?: AliasASTNode[];
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace OpASTNode {
    export function is(value: any): value is OpASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.opcode === "object"
            && typeof value.opcode.name === "string"
            && typeof value.opcode.description === "string"
            && ASTNodePosition.is(value.opcode.position)
            && typeof value.operand === "number"
            && typeof value.output === "number"
            && ASTNodePosition.is(value.position)
            && ASTNodePosition.is(value.parens)
            && Array.isArray(value.parameters)
            && value.parameters.every((v: any) => FragmentASTNode.is(v))
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
                    && ASTNodePosition.is(value.operandArgs.position)
                    && Array.isArray(value.operandArgs.args)
                    && value.operandArgs.args.every(
                        (v: any) => v !== null
                            && typeof v === "object"
                            && typeof v.value === "number"
                            && typeof v.name === "string"
                            && ASTNodePosition.is(v.position)
                            && (
                                typeof v.description === "undefined" || 
                                typeof v.description === "string"
                            )
                    )
                )
            );
    }
}

/**
 * @public Type of RainDocument's lhs aliases
 */
export interface AliasASTNode {
    name: string;
    position: ASTNodePosition;
    lhsAlias?: AliasASTNode;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace AliasASTNode {
    export function is(value: any): value is AliasASTNode {
        return value !== null 
            && typeof value === "object"
            && typeof value.name === "string"
            && ASTNodePosition.is(value.position)
            && (typeof value.lhsAlias === "undefined" || AliasASTNode.is(value.lhsAlias));
    }
}

/**
 * @public Type of RainDocument's comments
 */
export interface CommentASTNode {
    comment: string;
    position: ASTNodePosition;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace CommentASTNode {
    export function is(value: any): value is CommentASTNode {
        return value !== null
            && typeof value === "object"
            && typeof value.comment === "string"
            && ASTNodePosition.is(value.position);
    }
}

/**
 * @public Type of meta hash specified in a RainDocument
 */
export interface ImportASTNode {
    name: string;
    hash: string;
    position: ASTNodePosition;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace ImportASTNode {
    export function is(value: any): value is ImportASTNode {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && typeof value.hash === "string"
            && ASTNodePosition.is(value.position);
    }
}

/**
 * @public Type of RainDocument's parse node
 */
export type FragmentASTNode = ValueASTNode | OpASTNode | AliasASTNode;

/**
 * @public The namespace provides functionality to type check
 */
export namespace FragmentASTNode {
    export function is(value: any): value is FragmentASTNode {
        return ValueASTNode.is(value) 
            || AliasASTNode.is(value)
            || OpASTNode.is(value);
    }
}

/**
 * @public Type of a RainDocument parse tree
 */
export type RainlangAST = { 
    lines: {
        nodes: FragmentASTNode[]; 
        position: ASTNodePosition; 
        aliases: AliasASTNode[];
    }[]
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace RainlangAST {
    export function is(value: any): value is RainlangAST {
        return value !== null
            && typeof value === "object"
            && Array.isArray(value.lines)
            && value.lines.every((v: any) => {
                return ASTNodePosition.is(v.position)
                    && Array.isArray(v.nodes)
                    && v.nodes.every((e: any) => FragmentASTNode.is(e))
                    && Array.isArray(v.aliases)
                    && v.aliases.every((e: any) => AliasASTNode.is(e));
            });
    }

    export function isConstant(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && Array.isArray(value.lines)
            && value.lines.length === 1
            && value.lines.every((v: any) => {
                return ASTNodePosition.is(v.position)
                    && Array.isArray(v.nodes)
                    && v.nodes.length === 1
                    && v.nodes.every((e: any) => ValueASTNode.is(e))
                    && Array.isArray(v.aliases)
                    && v.aliases.length === 0;
            });
    }
}

/**
 * @public Type for a named expression
 */
export type BoundExpression = {
    name: string;
    namePosition: ASTNodePosition;
    text: string;
    position: ASTNodePosition;
    doc?: RainlangParser;
}

/**
 * @public The namespace provides functionality to type check
 */
export namespace BoundExpression {
    export function is(value: any): value is BoundExpression {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && ASTNodePosition.is(value.namePosition)
            && typeof value.text === "string"
            && ASTNodePosition.is(value.position)
            && (
                typeof value.doc === "undefined" ||
                value.doc instanceof RainlangParser
            );
    }

    export function isConstant(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && ASTNodePosition.is(value.namePosition)
            && typeof value.text === "string"
            && ASTNodePosition.is(value.position)
            && value.doc instanceof RainlangParser
            && RainlangAST.isConstant(value.doc.ast);
    }

    export function isExpression(value: any): boolean {
        return value !== null
            && typeof value === "object"
            && typeof value.name === "string"
            && ASTNodePosition.is(value.namePosition)
            && typeof value.text === "string"
            && ASTNodePosition.is(value.position)
            && value.doc instanceof RainlangParser
            && !RainlangAST.isConstant(value.doc.ast);
    }
}

/**
 * @public Type of RainParser state
 */
export type RainlangParseState = {
    parse: {
        tree: FragmentASTNode[];
        aliases: AliasASTNode[];
    };
    track: {
        char: number;
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    runtimeError: Error | undefined;
};

/**
 * @public Type for contract context alias
 */
export type ContextAlias = {
    name: string;
    desc: string;
    column: number;
    row: number;
}