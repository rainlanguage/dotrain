import { BigNumberish, BytesLike } from "./utils";
import { MarkupKind } from "vscode-languageserver-types";
import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { MetaStore } from "./parser/metaStore";

export * from "vscode-languageserver-types";
export { TextDocument, TextDocumentContentChangeEvent };


/**
 * @public
 * Error codes used by diagnostics
 */
export enum ErrorCode {
    UndefinedOpMeta = 0,
    UndefinedWord = 1,
    NonASCIICharacter = 2,
    NonPrintableASCIICharacter = 3,

    InvalidWordPattern = 0x101,
    InvalidExpression = 0x102,
    InvalidInputsMeta = 0x103,
    InvalidOutputsMeta = 0x104,
    InvalidNestedNode = 0x105,
    InvalidSelfReferenceLHS = 0x106,
    InvalidMetaHash = 0x107,

    UnexpectedEndOfComment = 0x201,
    UnexpectedClosingParen = 0x202,
    UnexpectedRHSComment = 0x203,
    UnexpectedMetaHash = 0x204,

    ExpectedOpcode = 0x301,
    ExpectedSpace = 0x302,
    ExpectedOperandArgs = 0x303,
    ExpectedClosingParen = 0x304,
    ExpectedOpeningParen = 0x305,
    ExpectedClosingOperandArgBracket = 0x306,

    MismatchRHS = 0x401,
    MismatchLHS = 0x402,
    MismatchOperandArgs = 0x403,

    OutOfRangeInputs = 0x501,
    OutOfRangeOperandArgs = 0x502,
    OutOfRangeValue = 0x503,

    UnknownOp = 0x600,

    RuntimeError = 0x700,

    IlligalAlias = 0x800
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
 * @public Type of position start and end indexes for RainDocument, inclusive at both ends
 */
export type RDPosition = [number, number];

/**
 * @public Type of RainDocument's problem
 */
export type RDProblem = {
    msg: string;
    position: RDPosition;
    code: number;
};

/**
 * @public Type of RainDocument's Value node
 */
export type RDValueNode = {
    value: BigNumberish;
    position: RDPosition;
    lhs?: RDAliasNode;
};

/**
 * @public Type of RainDocument's Opcode node
 */
export type RDOpNode = {
    opcode: {
        name: string;
        description: string;
        position: RDPosition;
    };
    operand: number;
    output: number;
    position: RDPosition;
    parens: RDPosition;
    parameters: RDNode[];
    operandArgs?: {
        position: RDPosition;
        args: {
            value: number;
            name: string;
            position: RDPosition;
            description?: string;
        }[];
    };
    lhs?: RDAliasNode[];
};

/**
 * @public Type of RainDocument's lhs aliases
 */
export type RDAliasNode = {
    name: string;
    position: RDPosition;
    lhs?: RDAliasNode;
}

/**
 * @public Type of RainDocument's comments
 */
export type RDComment = {
    comment: string;
    position: RDPosition;
}

/**
 * @public Type of meta hash specified in a RainDocument
 */
export type RDMetaHash = {
    hash: string;
    position: RDPosition;
}

/**
 * @public Type of RainDocument's parse node
 */
export type RDNode = RDValueNode | RDOpNode | RDAliasNode;

/**
* @public Type of a RainDocument parse tree
*/
export type RDParseTree = { tree: RDNode[]; position: RDPosition; }[];

/**
 * @public Type of RainParser state
 */
export type RainParseState = {
    parse: {
        tree: RDNode[];
        aliases: RDAliasNode[];
    };
    track: {
        char: number;
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    operandArgsErr: boolean;
    runtimeError: Error | undefined;
};
