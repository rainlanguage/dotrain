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
 * seraches for a meta for a given hash in the given subgraphs
 * @param {string} hash
 * @param {(string)[]} subgraphs
 * @returns {Promise<Uint8Array>}
 */
export function searchMeta(hash: string, subgraphs: string[]): Promise<Uint8Array>;
/**
 * seraches for a ExpressionDeployer reproducible data for a given hash in the given subgraphs
 * @param {string} hash
 * @param {(string)[]} subgraphs
 * @returns {Promise<DeployerQueryResponse>}
 */
export function searchDeployer(hash: string, subgraphs: string[]): Promise<DeployerQueryResponse>;
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
 * Calculates kccak256 hash of a DeployerBytecodeMeta constructed from the given deployedBytecode underlying data
 * @param {Uint8Array} deployed_bytecode
 * @returns {Uint8Array}
 */
export function getDeployedBytecodeMetaHash(deployed_bytecode: Uint8Array): Uint8Array;
/**
 * Error codes of Rainlang/RainDocument problem and LSP Diagnostics
 */
export enum ErrorCode {
    IllegalChar = 0,
    RuntimeError = 1,
    CircularDependency = 2,
    UnresolvableDependencies = 3,
    DeepImport = 4,
    DeepNamespace = 5,
    CorruptMeta = 6,
    ElidedBinding = 7,
    SingletonWords = 8,
    MultipleWords = 9,
    SingleWordModify = 10,
    InconsumableMeta = 11,
    NamespaceOccupied = 12,
    UndefinedWord = 257,
    UndefinedAuthoringMeta = 258,
    UndefinedMeta = 259,
    UndefinedQuote = 260,
    UndefinedOpcode = 261,
    UndefinedIdentifier = 262,
    UndefinedDeployer = 263,
    InvalidWordPattern = 513,
    InvalidExpression = 514,
    InvalidNestedNode = 515,
    InvalidSelfReference = 516,
    InvalidHash = 517,
    InvalidImport = 520,
    InvalidEmptyBinding = 521,
    InvalidBindingIdentifier = 528,
    InvalidQuote = 529,
    InvalidOperandArg = 530,
    InvalidReference = 531,
    InvalidRainDocument = 532,
    UnexpectedToken = 769,
    UnexpectedClosingParen = 770,
    UnexpectedNamespacePath = 771,
    UnexpectedRebinding = 772,
    UnexpectedClosingAngleParen = 773,
    UnexpectedEndOfComment = 774,
    UnexpectedComment = 775,
    UndefinedNamespaceMember = 776,
    ExpectedOpcode = 1025,
    ExpectedSpace = 1026,
    ExpectedElisionOrRebinding = 1027,
    ExpectedClosingParen = 1028,
    ExpectedOpeningParen = 1029,
    ExpectedClosingAngleBracket = 1030,
    ExpectedName = 1031,
    ExpectedSemi = 1032,
    ExpectedHash = 1033,
    ExpectedOperandArgs = 1040,
    ExpectedRename = 1041,
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
export interface ExpressionConfig {
    bytecode: string;
    constants: string[];
}

export type RainDocumentCompileError =
    | { Reject: string }
    | { Problems: Problem[] }
    | { Revert: any }
    | { Halt: any };

export type ParseResult = { Success: ExpressionConfig } | { Revert: any } | { Halt: any };

export type Offsets = [number, number];

export type ParsedItem = [string, Offsets];

export interface Problem {
    msg: string;
    position: Offsets;
    code: ErrorCode;
}

export interface Value {
    value: string;
    position: Offsets;
    lhsAlias?: Alias[];
    id?: string;
}

export interface OpcodeDetails {
    name: string;
    description: string;
    position: Offsets;
}

export interface OperandArgItem {
    value: string;
    name: string;
    position: Offsets;
    description: string;
}

export interface OperandArg {
    position: Offsets;
    args: OperandArgItem[];
}

export interface Opcode {
    opcode: OpcodeDetails;
    operand: number | undefined;
    output: number | undefined;
    position: Offsets;
    parens: Offsets;
    parameters: Node[];
    isCtx: [number, number | undefined] | undefined;
    lhsAlias?: Alias[];
    operandArgs?: OperandArg;
}

export interface Alias {
    name: string;
    position: Offsets;
    lhsAlias?: Alias[];
}

export interface Comment {
    comment: string;
    position: Offsets;
}

export interface DispairImportItem {
    constructorMetaHash: Uint8Array;
    constructorMetaBytes: Uint8Array;
    parser: Uint8Array;
    store: Uint8Array;
    interpreter: Uint8Array;
    bytecode: Uint8Array;
    authoringMeta: IAuthoringMeta | undefined;
}

export interface ImportSequence {
    dispair?: DispairImportItem;
    ctxmeta?: ContextAlias[];
    dotrain?: IRainDocument;
}

export interface ImportConfiguration {
    problems: Problem[];
    pairs: [ParsedItem, ParsedItem | undefined][];
}

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

export type Node = Value | Opcode | Alias;

export interface RainlangLine {
    nodes: Node[];
    position: Offsets;
    aliases: Alias[];
}

export interface RainlangSource {
    lines: RainlangLine[];
    position: Offsets;
}

export type RainlangAST = RainlangSource[];

export interface ElidedBindingItem {
    msg: string;
}

export interface ConstantBindingItem {
    value: string;
}

export type BindingItem = ElidedBindingItem | ConstantBindingItem | IRainlangDocument;

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

export type NamespaceNodeElement = Binding | ContextAlias | DispairImportItem;

export interface NamespaceNode {
    hash: string;
    importIndex: number;
    element: NamespaceNodeElement;
}

export type NamespaceItem = NamespaceNode | Namespace;

export type Namespace = Map<string, NamespaceItem>;

export interface ContextAlias {
    name: string;
    description: string;
    column: number;
    row: number | undefined;
}

export interface IRainDocument {
    version: number;
    uri: string;
    text: string;
    error: string | undefined;
    bindings: Binding[];
    imports: Import[];
    comments: Comment[];
    problems: Problem[];
    importDepth: number;
    ignoreWords: boolean;
    ignoreUndefinedWords: boolean;
    namespace: Namespace;
    authoringMeta: IAuthoringMeta | undefined;
    deployer: INPE2Deployer;
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
     * All the cached NPE2 deployers
     */
    readonly deployerCache: Map<Uint8Array, INPE2Deployer>;

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
     * Get the NPE2 deployer details of the given deployer bytecode hash if it is cached
     * @param {Uint8Array} hash
     * @returns {INPE2Deployer | undefined}
     */
    getDeployer(hash: Uint8Array): INPE2Deployer | undefined;
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
     * Sets deployer record
     * @param {DeployerQueryResponse} deployer_response
     */
    setDeployer(deployer_response: DeployerQueryResponse): INPE2Deployer;
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
    /**
     * Searches for NPE2 deployer details in the subgraphs given the deployer hash
     * @param {Uint8Array} hash
     * @returns {Promise<INPE2Deployer | undefined>}
     */
    searchDeployer(hash: Uint8Array): Promise<INPE2Deployer | undefined>;
    /**
     * If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer()
     * @param {Uint8Array} hash
     * @returns {Promise<INPE2Deployer | undefined>}
     */
    searchDeployerCheck(hash: Uint8Array): Promise<INPE2Deployer | undefined>;
}

export interface MetaStoreOptions {
    subgraphs?: string[];
    cache?: Map<Uint8Array, Uint8Array>;
    deployerCache?: Map<Uint8Array, INPE2Deployer>;
    dotrainCache?: Map<string, Uint8Array>;
    includeRainSubgraphs?: boolean;
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
     * @param {boolean} related_information
     * @returns {(Diagnostic)[]}
     */
    doValidateRainDocument(rain_document: RainDocument, related_information: boolean): Diagnostic[];
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
     * @param {Position} position
     * @param {MarkupKind} documentation_format
     * @returns {(CompletionItem)[] | undefined}
     */
    doCompleteRainDocument(
        rain_document: RainDocument,
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

export type IAuthoringMeta = {
    word: string;
    description: string;
    operandParserOffset: number;
}[];

export interface INPE2Deployer {
    metaHash: Uint8Array;
    metaBytes: Uint8Array;
    bytecode: Uint8Array;
    parser: Uint8Array;
    store: Uint8Array;
    interpreter: Uint8Array;
    authoringMeta: IAuthoringMeta | undefined;
}

export interface DeployerQueryResponse {
    txHash: Uint8Array;
    bytecodeMetaHash: Uint8Array;
    metaHash: Uint8Array;
    metaBytes: Uint8Array;
    bytecode: Uint8Array;
    parser: Uint8Array;
    store: Uint8Array;
    interpreter: Uint8Array;
}

export interface IRainlangDocument {
    text: string;
    ast: RainlangSource[];
    problems: Problem[];
    comments: Comment[];
    error: string | undefined;
    ignoreUndefinedAuthoringMeta: boolean;
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
 * // uri must be a valid URL
 * const rainDocument = RainDocument.create(text, uri, meta_store);
 *
 * // alternatively instantiate with remote meta search enabled
 * const rainDocument = await RainDocument.createAsync(text, uri, meta_store);
 *
 * // get all problems
 * const problems = rainDocument.allProblems;
 *
 * // compile this instance to get ExpressionConfig
 * const expConfig = rainDocument.compile(["entrypoint1", "entrypoint2"]);
 * ```
 */
export class RainDocument {
    free(): void;
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search enabled
     * @param {string} text
     * @param {string} uri
     * @param {MetaStore} meta_store
     * @returns {Promise<RainDocument>}
     */
    static createAsync(text: string, uri: string, meta_store: MetaStore): Promise<RainDocument>;
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
     * @param {string} text
     * @param {string} uri
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static create(text: string, uri: string, meta_store: MetaStore): RainDocument;
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
     * Updates the text and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     */
    updateText(new_text: string): void;
    /**
     * Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     * @param {string} uri
     * @param {number} version
     */
    update(new_text: string, uri: string, version: number): void;
    /**
     * Updates the text and parses right away with remote meta search enabled
     * @param {string} new_text
     * @returns {Promise<void>}
     */
    updateTextAsync(new_text: string): Promise<void>;
    /**
     * Updates the text, uri, version and parses right away with remote meta search enabled
     * @param {string} new_text
     * @param {string} uri
     * @param {number} version
     * @returns {Promise<void>}
     */
    updateAsync(new_text: string, uri: string, version: number): Promise<void>;
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
     * @returns {ExpressionConfig}
     */
    compile(entrypoints: string[]): ExpressionConfig;
    /**
     * Compiles a text as RainDocument with remote meta search enabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @param {string | undefined} [uri]
     * @returns {Promise<ExpressionConfig>}
     */
    static compileTextAsync(
        text: string,
        entrypoints: string[],
        meta_store: MetaStore,
        uri?: string,
    ): Promise<ExpressionConfig>;
    /**
     * Compiles a text as RainDocument with remote meta search disabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @param {string | undefined} [uri]
     * @returns {Promise<ExpressionConfig>}
     */
    static compileText(
        text: string,
        entrypoints: string[],
        meta_store: MetaStore,
        uri?: string,
    ): Promise<ExpressionConfig>;
    /**
     * This instance's all problems (bindings + top)
     */
    readonly allProblems: Problem[];
    /**
     * This instance's AuthoringMeta
     */
    readonly authoringMeta: IAuthoringMeta | undefined;
    /**
     * This instance's bindings problems
     */
    readonly bindingProblems: Problem[];
    /**
     * This instance's bindings
     */
    readonly bindings: Binding[];
    /**
     * This instance's comments
     */
    readonly comments: Comment[];
    /**
     * This instance's NPE2 Deployer details
     */
    readonly deployer: INPE2Deployer;
    /**
     * The error msg if parsing had resulted in an error
     */
    readonly error: string | undefined;
    /**
     * If 'ignore_undefined_words' lint option is enabled or not
     */
    readonly ignoreUndefinedWords: boolean;
    /**
     * If 'ignore_words' lint option is enabled or not
     */
    readonly ignoreWords: boolean;
    /**
     * This instance's imports
     */
    readonly imports: Import[];
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
    /**
     * This instance's current URI
     */
    readonly uri: string;
    /**
     * This instance's current version
     */
    readonly version: number;
}
/**
 * Data structure (parse tree) of a Rainlang text
 *
 * RainlangDocument is a data structure of a parsed Rainlang text to its parse tree
 * which are used by the RainDocument and for providing LSP services.
 *
 * it should be noted that generally this should not be used individually outside
 * RainDocument unless there is a justified reason, as prasing a Rainlang text should
 * be done through Rain NativeParser contract and parsing method of this struct has no
 * effect on NativeParser prasing and is totally separate as it only provides AST data
 * generally used in context of RainDocument for LSP services and sourcemap generation.
 */
export class RainlangDocument {
    free(): void;
    /**
     * Creates a new instance
     * @param {string} text
     * @param {IAuthoringMeta | undefined} [authoring_meta]
     * @param {Namespace | undefined} [namespace]
     * @returns {RainlangDocument}
     */
    static create(
        text: string,
        authoring_meta?: IAuthoringMeta,
        namespace?: Namespace,
    ): RainlangDocument;
    /**
     * Updates the text of this instance and parses it right away
     * @param {string} new_text
     * @param {IAuthoringMeta | undefined} [authoring_meta]
     * @param {Namespace | undefined} [namespace]
     */
    update(new_text: string, authoring_meta?: IAuthoringMeta, namespace?: Namespace): void;
    /**
     * Creates an instance from interface object
     * @param {IRainlangDocument} value
     * @returns {RainlangDocument}
     */
    static fromInterface(value: IRainlangDocument): RainlangDocument;
    /**
     * Creates an interface object from this instance
     * @returns {IRainlangDocument}
     */
    toInterface(): IRainlangDocument;
    /**
     * Compiles this instance's text given the entrypoints and INPE2Deployer
     * @param {INPE2Deployer} deployer
     * @returns {Promise<ParseResult>}
     */
    compile(deployer: INPE2Deployer): Promise<ParseResult>;
    /**
     * This instance's parse tree (AST)
     */
    readonly ast: RainlangSource[];
    /**
     * This instance's comments
     */
    readonly comments: Comment[];
    /**
     * The error msg if parsing resulted in an error
     */
    readonly error: string | undefined;
    /**
     * This instance's problems
     */
    readonly problems: Problem[];
    /**
     * This instance's text
     */
    readonly text: string;
}
