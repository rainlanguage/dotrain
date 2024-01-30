import { SemanticTokensPartialResult } from "vscode-languageserver-protocol";
import {
    Hover,
    Position,
    MarkupKind,
    Diagnostic,
    CompletionItem,
    TextDocumentItem,
} from "vscode-languageserver-types";
export * from "vscode-languageserver-types";
export * from "vscode-languageserver-protocol";

/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
export declare function rainlang(stringChunks: TemplateStringsArray, ...vars: any[]): string;

/**
 * Calculates solidity keccak256 hash from the given data
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function keccak256(data: Uint8Array): Uint8Array;
/**
 * Checks equality of 2 Uint8Arrays
 * @param {Uint8Array} data1
 * @param {Uint8Array} data2
 * @returns {boolean}
 */
export function eqBytes(data1: Uint8Array, data2: Uint8Array): boolean;
/**
 * Converts a hex string to Uint8Array
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function arrayify(hex: string): Uint8Array;
/**
 * Converts an Uint8Array into a hex string
 * @param {Uint8Array} data
 * @returns {string}
 */
export function hexlify(data: Uint8Array): string;
/**
 * seraches for a meta for a given hash in the given subgraphs
 * @param {string} hash
 * @param {(string)[]} subgraphs
 * @returns {Promise<Uint8Array>}
 */
export function searchMeta(hash: string, subgraphs: string[]): Promise<Uint8Array>;
/**
 * All Error codes of RainlangDocument/RainDocument problem and LSP Diagnostics
 */
export enum ErrorCode {
    IllegalChar = 0,
    RuntimeError = 1,
    CircularDependency = 2,
    CircularDependencyQuote = 3,
    DeepImport = 4,
    DeepNamespace = 5,
    CorruptMeta = 6,
    ElidedBinding = 7,
    NoneTopLevelImport = 8,
    NativeParserError = 9,
    InconsumableMeta = 10,
    OccupiedNamespace = 11,
    OddLenHex = 12,
    CollidingNamespaceNodes = 13,
    UndefinedWord = 257,
    UndefinedImport = 259,
    UndefinedQuote = 260,
    UndefinedNamespaceMember = 261,
    UndefinedIdentifier = 262,
    InvalidWordPattern = 513,
    InvalidExpression = 514,
    InvalidNamespaceReference = 515,
    InvalidEmptyLine = 516,
    InvalidHash = 517,
    InvalidReference = 518,
    InvalidRainDocument = 519,
    InvalidImport = 520,
    InvalidEmptyBinding = 521,
    InvalidQuote = 528,
    InvalidOperandArg = 529,
    UnexpectedToken = 769,
    UnexpectedClosingParen = 770,
    UnexpectedNamespacePath = 771,
    UnexpectedRebinding = 772,
    UnexpectedClosingAngleParen = 773,
    UnexpectedEndOfComment = 774,
    UnexpectedComment = 775,
    UnexpectedPragma = 776,
    UnexpectedRename = 777,
    ExpectedOpcode = 1025,
    ExpectedRename = 1026,
    ExpectedElisionOrRebinding = 1027,
    ExpectedClosingParen = 1028,
    ExpectedOpeningParen = 1029,
    ExpectedClosingAngleBracket = 1030,
    ExpectedHexLiteral = 1031,
    ExpectedSemi = 1032,
    MismatchRHS = 1281,
    MismatchLHS = 1282,
    MismatchOperandArgs = 1283,
    OutOfRangeInputs = 1537,
    OutOfRangeOperandArgs = 1538,
    OutOfRangeValue = 1539,
    DuplicateAlias = 1793,
    DuplicateIdentifier = 1794,
    DuplicateImportStatement = 1795,
    DuplicateImport = 1796,
}

/**
 * Provides LSP services which are methods that return LSP based results (Diagnostics, Hover, etc)
 *
 * Provides methods for getting language services (such as diagnostics, completion, etc)
 * for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked
 * MetaStore instance that holds all the required metadata/functionalities that are required during
 * parsing a text.
 *
 * Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
 * only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
 * position encodings will result in the same LSP provided Position value which is 1 for each char.
 *
 * @example
 * ```javascript
 * // create new MetaStore instance
 * let metaStore = new MetaStore();
 *
 * // crate new instance
 * let langServices = new RainLanguageServices(metaStore);
 *
 * let textDocument = {
 *   text: "some .rain text",
 *   uri:  "file:///name.rain",
 *   version: 0,
 *   languageId: "rainlang"
 * };
 *
 * // creat new RainDocument
 * let rainDocument = langServices.newRainDocument(textdocument);
 *
 * // get LSP Diagnostics
 * let diagnosticsRelatedInformation = true;
 * let diagnostics = langServices.doValidate(textDocument, diagnosticsRelatedInformation);
 * ```
 */
export class RainLanguageServices {
    free(): void;
    /**
     * The meta Store associated with this RainLanguageServices instance
     */
    readonly metaStore: MetaStore;
    /**
     * Instantiates with the given MetaStore
     * @param {MetaStore} meta_store
     */
    constructor(meta_store: MetaStore);
    /**
     * Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
     * @param {TextDocumentItem} text_document
     * @returns {RainDocument}
     */
    newRainDocument(text_document: TextDocumentItem): RainDocument;
    /**
     * Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
     * @param {TextDocumentItem} text_document
     * @returns {Promise<RainDocument>}
     */
    newRainDocumentAsync(text_document: TextDocumentItem): Promise<RainDocument>;
    /**
     * Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
     * @param {TextDocumentItem} text_document
     * @returns {(Diagnostic)[]}
     */
    doValidate(text_document: TextDocumentItem, related_information: boolean): Diagnostic[];
    /**
     * Reports LSP diagnostics from RainDocument's all problems
     * @param {RainDocument} rain_document
     * @param {string} uri
     * @param {boolean} related_information
     * @returns {(Diagnostic)[]}
     */
    doValidateRainDocument(
        rain_document: RainDocument,
        uri: string,
        related_information: boolean,
    ): Diagnostic[];
    /**
     * Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
     * @param {TextDocumentItem} text_document
     * @param {boolean} related_information
     * @returns {Promise<any>}
     */
    doValidateAsync(
        text_document: TextDocumentItem,
        related_information: boolean,
    ): Promise<Diagnostic[]>;
    /**
     * Provides completion items at the given position
     * @param {TextDocumentItem} text_document
     * @param {Position} position
     * @param {MarkupKind} documentation_format
     * @returns {(CompletionItem)[] | undefined}
     */
    doComplete(
        text_document: TextDocumentItem,
        position: Position,
        documentation_format?: MarkupKind,
    ): CompletionItem[] | null;
    /**
     * Provides completion items at the given position
     * @param {RainDocument} rain_document
     * @param {string} uri
     * @param {Position} position
     * @param {MarkupKind} documentation_format
     * @returns {(CompletionItem)[] | undefined}
     */
    doCompleteRainDocument(
        rain_document: RainDocument,
        uri: string,
        position: Position,
        documentation_format?: MarkupKind,
    ): CompletionItem[] | null;
    /**
     * Provides hover for a fragment at the given position
     * @param {TextDocumentItem} text_document
     * @param {Position} position
     * @param {MarkupKind} content_format
     * @returns {Hover | undefined}
     */
    doHover(
        text_document: TextDocumentItem,
        position: Position,
        content_format?: MarkupKind,
    ): Hover | null;
    /**
     * Provides hover for a RainDocument fragment at the given position
     * @param {RainDocument} rain_document
     * @param {Position} position
     * @param {MarkupKind} content_format
     * @returns {Hover | undefined}
     */
    doHoverRainDocument(
        rain_document: RainDocument,
        position: Position,
        content_format?: MarkupKind,
    ): Hover | null;
    /**
     * Provides semantic tokens for elided fragments
     * @param {TextDocumentItem} text_document
     * @param {number} semantic_token_types_index
     * @param {number} semantic_token_modifiers_len
     * @returns {SemanticTokensPartialResult}
     */
    semanticTokens(
        text_document: TextDocumentItem,
        semantic_token_types_index: number,
        semantic_token_modifiers_len: number,
    ): SemanticTokensPartialResult;
    /**
     * Provides semantic tokens for RainDocument's elided fragments
     * @param {RainDocument} rain_document
     * @param {number} semantic_token_types_index
     * @param {number} semantic_token_modifiers_len
     * @returns {SemanticTokensPartialResult}
     */
    rainDocumentSemanticTokens(
        rain_document: RainDocument,
        semantic_token_types_index: number,
        semantic_token_modifiers_len: number,
    ): SemanticTokensPartialResult;
}

export interface IRainDocument {
    text: string;
    frontMatterOffset: number;
    error: string | undefined;
    bindings: Binding[];
    imports: Import[];
    comments: Comment[];
    problems: Problem[];
    importDepth: number;
    namespace: Namespace;
    knownWords?: IAuthoringMeta;
}

export type ComposeError = { Reject: string } | { Problems: Problem[] };

export type IAuthoringMeta = {
    word: string;
    description: string;
    operandParserOffset: number;
}[];

export type Namespace = Map<string, NamespaceItem>;

export type NamespaceItem = NamespaceLeaf | Namespace;

export interface NamespaceLeaf {
    hash: string;
    importIndex: number;
    element: Binding;
}

export interface Binding {
    name: string;
    namePosition: Offsets;
    content: string;
    contentPosition: Offsets;
    position: Offsets;
    problems: Problem[];
    dependencies: string[];
    item: BindingItem;
}

export type BindingItem = ElidedBindingItem | ConstantBindingItem | RainlangDocument;

export interface ConstantBindingItem {
    value: string;
}

export interface ElidedBindingItem {
    msg: string;
}

export type RainlangAST = RainlangSource[];

export interface RainlangSource {
    lines: RainlangLine[];
    position: Offsets;
}

export interface RainlangLine {
    nodes: Node[];
    position: Offsets;
    aliases: Alias[];
}

export type Node = Literal | Opcode | Alias;

export interface Import {
    name: string;
    namePosition: Offsets;
    hash: string;
    hashPosition: Offsets;
    position: Offsets;
    problems: Problem[];
    configuration?: ImportConfiguration;
    sequence?: ImportSequence;
}

export interface ImportSequence {
    dotrain?: IRainDocument;
}

export interface ImportConfiguration {
    problems: Problem[];
    groups: [ParsedItem, ParsedItem | undefined][];
}

export interface Comment {
    comment: string;
    position: Offsets;
}

export interface Alias {
    name: string;
    position: Offsets;
    lhsAlias?: Alias[];
}

export interface Opcode {
    opcode: OpcodeDetails;
    operand: number | undefined;
    output: number | undefined;
    position: Offsets;
    parens: Offsets;
    inputs: Node[];
    lhsAlias?: Alias[];
    operandArgs?: OperandArg;
}

export interface OperandArg {
    position: Offsets;
    args: OperandArgItem[];
}

export interface OperandArgItem {
    value: string;
    name: string;
    position: Offsets;
    description: string;
}

export interface OpcodeDetails {
    name: string;
    description: string;
    position: Offsets;
}

export interface Literal {
    value: string;
    position: Offsets;
    lhsAlias?: Alias[];
    id?: string;
}

export interface Problem {
    msg: string;
    position: Offsets;
    code: ErrorCode;
}

export type ParsedItem = [string, Offsets];

export type Offsets = [number, number];

export interface RainlangDocument {
    text: string;
    ast: RainlangSource[];
    problems: Problem[];
    comments: Comment[];
    error: string | undefined;
}

/**
 * In-memory CAS (content addressed storage) for all metadata required for parsing
 * a RainDocument which basically stores k/v pairs of meta hash, meta bytes and
 * ExpressionDeployer reproducible data as well as providing functionalities to easliy
 * read them from the CAS.
 *
 * Hashes are stored as bytes of the underlying value and meta bytes are valid cbor
 * encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to
 * deployedBytecode meta hash and deploy transaction hash.
 *
 * @example
 * ```typescript
 * // to instantiate with including default subgraphs
 * // pass 'false' to not include default rain subgraph endpoints
 * const store = new MetaStore();
 *
 * // or to instantiate with initial arguments
 * const store = MetaStore.create(options);
 *
 * // add a new subgraph endpoint URLs
 * store.addSubgraphs(["sg-url-1", "sg-url-2", ...])
 *
 * // merge another MetaStore instance to this instance
 * store.merge(anotherMetaStore)
 *
 * // updates the meta store with a new meta by searching through subgraphs
 * await store.update(hash)
 *
 * // to get a meta bytes of a corresponding hash from store
 * const meta = store.getMeta(hash);
 * ```
 */
export class MetaStore {
    free(): void;

    /**
     * Creates new instance of Store with given initial values,
     * it checks the validity of each item and only stores those that are valid
     * @param {MetaStoreOptions} options - initial values
     * @returns {MetaStore}
     */
    static create(options: MetaStoreOptions): MetaStore;

    /**
     * Constructs a new instance
     * @param include_rain_subgraphs - (optional) if default Rain subgraphs should be included
     */
    constructor(include_rain_subgraphs?: boolean);

    /**
     * All subgraph endpoint URLs of this instance
     */
    readonly subgraphs: string[];
    /**
     * All the cached meta hash/bytes pairs
     */
    readonly cache: Map<Uint8Array, Uint8Array>;
    /**
     * All the cached dotrain uri/meta hash pairs
     */
    readonly dotrainCache: Map<string, Uint8Array>;

    /**
     * Merges another instance of MetaStore to this instance lazily, avoids duplicates
     * @param {MetaStore} other
     */
    merge(other: MetaStore): void;
    /**
     * Adds new subgraph endpoints
     * @param {string[]} subgraphs
     */
    addSubgraphs(subgraphs: string[]): void;
    /**
     * Get the corresponding meta bytes of the given hash if it is cached
     * @param {Uint8Array} hash
     * @returns {Uint8Array | undefined}
     */
    getMeta(hash: Uint8Array): Uint8Array | undefined;
    /**
     * Get the corresponding dotrain hash of the given dotrain uri if it is cached
     * @param {string} uri
     * @returns {Uint8Array | undefined}
     */
    getDotrainHash(uri: string): Uint8Array | undefined;
    /**
     * Get the corresponding uri of the given dotrain hash if it is cached
     * @param {Uint8Array} hash
     * @returns {string | undefined}
     */
    getDotrainUri(hash: Uint8Array): string | undefined;
    /**
     * Get the corresponding meta bytes of the given dotrain uri if it is cached
     * @param {string} uri
     * @returns {Uint8Array | undefined}
     */
    getDotrainMeta(uri: string): Uint8Array | undefined;
    /**
     * Deletes a dotrain record given its uri
     * @param {string} uri
     */
    deleteDotrain(uri: string, keep_meta: boolean): void;
    /**
     * Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
     * and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in
     * the scope of MetaStore and handling and passing on a correct URI for the given text must be handled
     * externally by the implementer
     * @param {string} text
     * @param {string} uri
     * @param {boolean} keep_old - keeps the old dotrain meta in the cache
     * @returns {Uint8Array[]} new hash and old hash if the given uri was already cached
     */
    setDotrain(text: string, uri: string, keep_old: boolean): Uint8Array[];
    /**
     * Updates the meta cache by the given hash and meta bytes, checks the hash to bytes validity
     * @param {Uint8Array} hash
     * @param {Uint8Array} bytes
     */
    updateWith(hash: Uint8Array, bytes: Uint8Array): void;
    /**
     * Updates the meta cache by searching through all subgraphs for the given hash
     * @param {Uint8Array} hash
     * @returns {Promise<Uint8Array | undefined>}
     */
    update(hash: Uint8Array): Promise<Uint8Array | undefined>;
    /**
     * First checks if the meta is stored and returns it if so, else will perform update()
     * @param {Uint8Array} hash
     * @returns {Promise<Uint8Array | undefined>}
     */
    updateCheck(hash: Uint8Array): Promise<Uint8Array | undefined>;
}

export interface MetaStoreOptions {
    subgraphs?: string[];
    cache?: Map<Uint8Array, Uint8Array>;
    dotrainCache?: Map<string, Uint8Array>;
    includeRainSubgraphs?: boolean;
}

/**
 * Data structure of a parsed .rain text
 *
 * RainDocument is the main implementation block that enables parsing of a .rain file contents
 * to its building blocks and parse tree by handling and resolving imports, namespaces, etc which
 * later are used by LSP services and compiler as well as providing all the functionalities in between.
 *
 * It is a portable, extensible and composable format for describing Rainlang fragments, .rain serve as
 * a wrapper/container/medium for Rainlang to be shared and audited simply in a permissionless and
 * adversarial environment such as a public blockchain.
 *
 * @example
 * ```javascript
 * // create a new instane
 * const rainDocument = RainDocument.create(text, meta_store);
 *
 * // alternatively instantiate with remote meta search enabled
 * const rainDocument = await RainDocument.createAsync(text, meta_store);
 *
 * // get all problems
 * const problems = rainDocument.allProblems;
 *
 * // compose this instance to get rainlang string
 * const expConfig = rainDocument.compose(["entrypoint1", "entrypoint2"]);
 * ```
 */
export class RainDocument {
    free(): void;
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search enabled
     * @param {string} text
     * @param {MetaStore} meta_store
     * @returns {Promise<RainDocument>}
     */
    static createAsync(text: string, meta_store: MetaStore): Promise<RainDocument>;
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
     * @param {string} text
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static create(text: string, meta_store: MetaStore): RainDocument;
    /**
     * @param {IRainDocument} value
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static fromInterface(value: IRainDocument, meta_store: MetaStore): RainDocument;
    /**
     * @returns {IRainDocument}
     */
    toInterface(): IRainDocument;
    /**
     * Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     */
    update(new_text: string): void;
    /**
     * Updates the text, uri, version and parses right away with remote meta search enabled
     * @param {string} new_text
     * @returns {Promise<void>}
     */
    updateAsync(new_text: string): Promise<void>;
    /**
     * Parses this instance's text with remote meta search enabled
     * @returns {Promise<void>}
     */
    parseAsync(): Promise<void>;
    /**
     * Parses this instance's text with remote meta search disabled (cached metas only)
     */
    parse(): void;
    /**
     * Compiles this instance
     * @param {(string)[]} entrypoints
     * @returns {string}
     */
    compose(entrypoints: string[]): string;
    /**
     * Compiles a text as RainDocument with remote meta search enabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @returns {Promise<string>}
     */
    static composeTextAsync(
        text: string,
        entrypoints: string[],
        meta_store: MetaStore,
    ): Promise<string>;
    /**
     * Compiles a text as RainDocument with remote meta search disabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @returns {Promise<string>}
     */
    static composeText(text: string, entrypoints: string[], meta_store: MetaStore): Promise<string>;
    /**
     * This instance's all problems (bindings + top)
     */
    readonly allProblems: Problem[];
    /**
     * This instance's bindings problems
     */
    readonly bindingProblems: Problem[];
    /**
     * This instance's bindings
     */
    readonly bindings: Binding[];
    /**
     * This instance's current text
     */
    readonly body: string;
    /**
     * This instance's comments
     */
    readonly comments: Comment[];
    /**
     * The error msg if parsing had resulted in an error
     */
    readonly error: string | undefined;
    /**
     * This instance's current text
     */
    readonly frontMatter: string;
    /**
     * This instance's imports
     */
    readonly imports: Import[];
    /**
     * This instance's AuthoringMeta
     */
    readonly knownWords: IAuthoringMeta | undefined;
    /**
     * This instance's MetaStore
     */
    readonly metaStore: MetaStore;
    /**
     * This instance's namespace
     */
    readonly namespace: Namespace;
    /**
     * This instance's top problems
     */
    readonly problems: Problem[];
    /**
     * This instance's current text
     */
    readonly text: string;
}
