import toposort from "toposort";
import { Rainlang } from "./rainlang";
import { Meta } from "@rainprotocol/meta";
import { 
    fillIn,  
    hexlify, 
    ParsedChunk, 
    trackedTrim, 
    execBytecode, 
    hasDuplicate, 
    getRandomInt, 
    inclusiveParse, 
    exclusiveParse, 
    isConsumableMeta, 
    uint8ArrayToString
} from "./helpers";
import { 
    AST, 
    Range, 
    ErrorCode, 
    HEX_PATTERN,
    HASH_PATTERN, 
    TextDocument, 
    WORD_PATTERN,
    NUMERIC_PATTERN, 
    DEFAULT_ELISION,
    NATIVE_PARSER_ABI 
} from "../languageTypes";


/**
 * @public
 * RainDocument aka dotrain is a class object that parses a text to provides data and 
 * functionalities in order to be used later on to provide Rain Language 
 * Services or in RainDocument compiler to get the ExpressionConfig 
 * (deployable bytes). It uses Rain parser under the hood which does all the 
 * heavy work.
 * 
 * @example
 * ```typescript
 * // to import
 * import { RainDocument } from 'rainlang';
 *
 * // to create a new instance of the RainDocument object which parses right after instantiation
 * const myRainDocument = await RainDocument.create(text)
 *
 * // to get the problems
 * const problems = myRainDocument.getAllProblems()
 *
 * // to update the text
 * await myRainDocument.updateText(newText)
 * ```
 */
export class RainDocument {

    /**
     * @public Reserved constants key/value
     */
    public static readonly CONSTANTS: Record<string, string> = {
        "infinity"      : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256"  : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256"   : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-128"  : "0xffffffffffffffffffffffffffffffff",
        "max-uint128"   : "0xffffffffffffffffffffffffffffffff",
        "max-uint-64"   : "0xffffffffffffffff",
        "max-uint64"    : "0xffffffffffffffff",
        "max-uint-32"   : "0xffffffff",
        "max-uint32"    : "0xffffffff",
    } as const;

    public metaStore: Meta.Store;
    public textDocument: TextDocument;
    public runtimeError: Error | undefined;
    public bindings: AST.Binding[] = [];
    public namespace: AST.Namespace = {};
    public imports: AST.Import[] = [];

    public authoringMeta: Meta.Authoring[] = [];
    public authoringMetaPath = "";
    public bytecode = "";
    public comments: AST.Comment[] = [];
    public problems: AST.Problem[] = [];

    private importDepth = 0;
    private _ignoreAM = false;
    private _ignoreUAM = false;
    private _shouldSearch = true;

    /**
     * @public Constructs a new RainDocument instance, should not be used for instantiating, use "creat()" instead
     * @param textDocument - TextDocument
     * @param metaStore - (optional) Meta.Store object
     */
    constructor(
        textDocument: TextDocument,
        metaStore?: Meta.Store,
        importDepth = 0
    ) {
        this.importDepth = importDepth;
        this.textDocument = textDocument;
        if (metaStore) this.metaStore = metaStore;
        else this.metaStore = new Meta.Store();
    }

    /**
     * @public Creates a new RainDocument object instance with a TextDocument
     * 
     * @param textDocument - The text document
     * @param metaStore - (optional) The initial Meta.Store object
     * @returns A new RainDocument instance
     */
    public static async create(
        textDocument: TextDocument, 
        metaStore?: Meta.Store
    ): Promise<RainDocument>

    /**
     * @public Creates a new RainDocument object instance from a text string
     * 
     * @param text - The text string
     * @param metaStore - (optional) The initial Meta.Store object
     * @param uri - (optional) The URI of the text, URI is the unique identifier of a TextDocument
     * @param version - (optional) The version of the text
     * @returns A new RainDocument instance
     */
    public static async create(
        text: string, 
        metaStore?: Meta.Store, 
        uri?: string, 
        version?: number
    ): Promise<RainDocument>

    public static async create(
        content: TextDocument | string, 
        metaStore?: Meta.Store, 
        uri?: string, 
        version?: number
    ): Promise<RainDocument> {
        let _rainDocument: RainDocument;
        if (typeof content === "string") _rainDocument = new RainDocument(
            TextDocument.create(
                uri ?? "untitled-" + getRandomInt(1000000000).toString() + ".rain", 
                "rainlang", 
                version === undefined || version < 0 ? 0 : version, 
                content
            ), 
            metaStore
        );
        else _rainDocument = new RainDocument(content, metaStore);
        await _rainDocument.parse();
        return _rainDocument;
    }

    /**
     * @public Updates the TextDocument of this RainDocument instance with new text
     * @param newText - The new text
     */
    public async updateText(newText: string): Promise<void>;

    /**
     * @public Updates the TextDocument of this RainDocument instance
     * @param newTextDocument - The new TextDocument
     */
    public async updateText(newTextDocument: TextDocument): Promise<void>;

    public async updateText(newContent: string | TextDocument) {
        if (typeof newContent === "string") this.textDocument = TextDocument.update(
            this.textDocument, 
            [{ text: newContent }], 
            this.textDocument.version + 1
        );
        else this.textDocument = newContent;
        await this.parse();
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getText(): string {
        return this.textDocument.getText();
    }

    /**
     * @public Get all problems of this RainDocument instance
     */
    public getAllProblems(): AST.Problem[] {
        return [...this.problems, ...this.getBindingsProblems()];
    }

    /**
     * @public Get the expression problems of this RainDocument instance
     */
    public getBindingsProblems(): AST.Problem[] {
        return this.bindings.flatMap(v => v.problems);
    }

    /**
     * @public
     * Parses this instance of RainDocument
     */
    public async parse() {
        if (/[^\s]/.test(this.textDocument.getText())) {
            try { 
                await this._parse(); 
            }
            catch (runtimeError) {
                if (runtimeError instanceof Error) this.runtimeError = runtimeError;
                else this.runtimeError = new Error(runtimeError as string);
                this.problems.push({
                    msg: `Runtime Error: ${
                        this.runtimeError.message
                    }`,
                    position: [0, -1],
                    code: ErrorCode.RuntimeError
                });
            }
        }
        else {
            this.authoringMeta      = [];
            this.imports            = [];
            this.problems           = [];
            this.comments           = [];
            this.bindings           = [];
            this.namespace          = {};
            this.authoringMetaPath  = "";
            this.bytecode           = "";
            this._ignoreAM          = false;
            this._ignoreUAM         = false;
            this.runtimeError       = undefined;
        }
    }

    // /**
    //  * @internal Method to find index of next element within the text
    //  */
    // private findNextBoundry(str: string): number {
    //     return str.search(/[\s]/g);
    // }

    /**
     * @internal Get context aliases from a contract meta
     */
    private toContextAlias(contractMeta: Meta.Contract): AST.ContextAlias[] {
        const _ctxAliases: AST.ContextAlias[] = [];
        contractMeta.methods.forEach(method => {
            method.expressions.forEach(exp => {
                exp.contextColumns?.forEach(ctxCol => {
                    const colIndex = _ctxAliases.findIndex(e => 
                        e.name === ctxCol.alias && (
                            e.column !== ctxCol.columnIndex || !isNaN(e.row)
                        )
                    );
                    if (colIndex > -1) throw new Error(
                        `duplicate context alias identifier: ${ctxCol.alias}`
                    );
                    else {
                        if (!_ctxAliases.find(e => e.name === ctxCol.alias)) {
                            _ctxAliases.push({
                                name: ctxCol.alias,
                                column: ctxCol.columnIndex,
                                row: NaN,
                                description: ctxCol.desc ?? ""
                            }); 
                        }  
                    }
                    ctxCol.cells?.forEach(ctxCell => {
                        const cellIndex = _ctxAliases.findIndex(
                            e => e.name === ctxCell.alias && (
                                e.column !== ctxCol.columnIndex || 
                                e.row !== ctxCell.cellIndex
                            )
                        );
                        if (cellIndex > -1) throw new Error(
                            `duplicate context alias identifier: ${ctxCell.alias}`
                        );
                        else {
                            if (!_ctxAliases.find(
                                e => e.name === ctxCell.alias
                            )) _ctxAliases.push({
                                name: ctxCell.alias,
                                column: ctxCol.columnIndex,
                                row: ctxCell.cellIndex,
                                description: ctxCell.desc ?? ""
                            });
                        }
                    });
                });
            });
        });
        return _ctxAliases;
    }

    /**
     * @internal Checks if an import is deeper than 32 levels
     */
    private isDeepImport(imp: AST.Import): boolean {
        if (imp.sequence?.dotrain) {
            const _rd = imp.sequence.dotrain;
            if (_rd.problems.find(v => v.code === ErrorCode.DeepImport)) return true;
            else return false;
        }
        else return false;
    }

    /**
     * @internal Processes the configurations of an import asynchronously
     */
    private async processImportConfigs(imp: AST.Import, chunks: ParsedChunk[]) {
        const _reconfigProblems: AST.Problem[] = [];
        const _reconfigs: [ParsedChunk, ParsedChunk][] = [];
        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i][0] === ".") {
                const _key = chunks[i];
                i++;
                if (chunks[i]) {
                    if (chunks[i][0] === "!") {
                        if (_reconfigs.find(v =>  
                            v[0][0] === _key[0] && 
                            v[1][0] === chunks[i][0]
                        )) _reconfigProblems.push({
                            msg: "duplicate statement",
                            position: [_key[1][0], chunks[i][1][1]],
                            code: ErrorCode.DuplicateImportStatement
                        });
                    }
                    else _reconfigProblems.push({
                        msg: "unexpected token",
                        position: chunks[i][1],
                        code: ErrorCode.UnexpectedToken
                    });
                }
                else _reconfigProblems.push({
                    msg: "expected elision syntax",
                    position: _key[1],
                    code: ErrorCode.ExpectedElisionOrRebinding
                });
                _reconfigs.push([_key, chunks[i]]);
            }
            else if (WORD_PATTERN.test(chunks[i][0])) {
                const _key = chunks[i];
                i++;
                if (chunks[i]) {
                    if (NUMERIC_PATTERN.test(chunks[i][0]) || chunks[i][0] === "!") {
                        if (_reconfigs.find(v => 
                            v[0][0] === _key[0] && 
                            v[1][0] === chunks[i][0]
                        )) _reconfigProblems.push({
                            msg: "duplicate statement",
                            position: [_key[1][0], chunks[i][1][1]],
                            code: ErrorCode.DuplicateImportStatement
                        });
                    }
                    else _reconfigProblems.push({
                        msg: "unexpected token",
                        position: chunks[i][1],
                        code: ErrorCode.UnexpectedToken
                    });
                }
                else _reconfigProblems.push({
                    msg: "expected rebinding or elision",
                    position: _key[1],
                    code: ErrorCode.ExpectedElisionOrRebinding
                });
                _reconfigs.push([_key, chunks[i]]);
            }
            else if (chunks[i][0].startsWith("'")) {
                const _key = chunks[i];
                if (WORD_PATTERN.test(_key[0].slice(1))) {
                    i++;
                    if (chunks[i]) {
                        if (WORD_PATTERN.test(chunks[i][0])) {
                            if (_reconfigs.find(v => 
                                v[0][0] === _key[0] && 
                                v[1][0] === chunks[i][0]
                            )) _reconfigProblems.push({
                                msg: "duplicate statement",
                                position: [_key[1][0], chunks[i][1][1]],
                                code: ErrorCode.DuplicateImportStatement
                            });
                        }
                        else _reconfigProblems.push({
                            msg: "invalid word pattern",
                            position: chunks[i][1],
                            code: ErrorCode.InvalidWordPattern
                        });
                    }
                    else _reconfigProblems.push({
                        msg: "expected name",
                        position: _key[1],
                        code: ErrorCode.ExpectedName
                    });
                }
                else {
                    _reconfigProblems.push({
                        msg: "invalid word pattern",
                        position: _key[1],
                        code: ErrorCode.InvalidWordPattern
                    });
                    i++;
                }
                _reconfigs.push([_key, chunks[i]]);
            }
            else {
                _reconfigProblems.push({
                    msg: "unexpected token",
                    position: chunks[i][1],
                    code: ErrorCode.UnexpectedToken
                });
                _reconfigs.push([chunks[i], chunks[++i]]);
            }
        }
        imp.reconfigs = _reconfigs;
        imp.reconfigProblems = _reconfigProblems;
    }

    /**
     * @internal Processes meta maps and stores them into the import instance
     */
    private async processMeta(imp: AST.Import, meta: Map<any, any>) {
        let _mn: Meta.MagicNumbers;
        try {
            _mn = meta.get(1);
            if (!Meta.MagicNumbers.is(_mn)) throw "";
        }
        catch {
            return Promise.reject();
        }
        if (!imp.sequence) imp.sequence = {};
        if (_mn === Meta.MagicNumbers.EXPRESSION_DEPLOYER_V2_BYTECODE_V1) {
            try {
                const _bytecode = Meta.decodeMap(meta);
                if (typeof _bytecode === "string") throw "";
                let _authoringMeta: Meta.Authoring[] = [];
                if (!this._ignoreAM) {
                    const _authoringMetaHash = (await execBytecode(
                        _bytecode,
                        NATIVE_PARSER_ABI,
                        "authoringMetaHash",
                        []
                    ))[0]?.toLowerCase();
                    let _authoringMetaBytes = await this.metaStore.getAuthoringMeta(
                        _authoringMetaHash,
                        "authoring-meta-hash"
                    );
                    if (!_authoringMetaBytes) _authoringMetaBytes = 
                        await this.metaStore.getAuthoringMeta(
                            await Meta.hash([meta], false),
                            "deployer-bytecode-hash"
                        );
                    if (!_authoringMetaBytes) {
                        if (!this._ignoreUAM) this.problems.push({
                            msg: "cannot find any settlement for authoring meta of specified dispair",
                            position: imp.hashPosition,
                            code: ErrorCode.UndefinedAuthoringMeta
                        });
                    }
                    else _authoringMeta = Meta.Authoring.abiDecode(_authoringMetaBytes);
                }
                imp.sequence.dispair = {
                    bytecode: hexlify(_bytecode, { allowMissingPrefix: true }),
                    authoringMeta: _authoringMeta
                };
            }
            catch (error) { return Promise.reject(); }
        }
        else if (_mn === Meta.MagicNumbers.CONTRACT_META_V1) {
            try {
                const _parsed = Meta.Contract.get(meta);
                imp.sequence.ctxmeta = this.toContextAlias(_parsed);
            }
            catch (error) { return Promise.reject(); }
        }
        else if (_mn === Meta.MagicNumbers.DOTRAIN_V1) {
            try {
                // const _str = String.fromCharCode(
                //     ...Meta.decodeMap(meta) as Uint8Array
                // );
                const _str = uint8ArrayToString(
                    Meta.decodeMap(meta) as Uint8Array
                );
                imp.sequence.dotrain = new RainDocument(
                    TextDocument.create(
                        `imported-dotrain-${imp.hash}`, 
                        "rainlang", 
                        0, 
                        _str as string
                    ),
                    this.metaStore,
                    this.importDepth + 1
                );
                await imp.sequence.dotrain.parse();
                if (imp.sequence.dotrain.problems.length) imp.problems.push({
                    msg: "imported rain document contains top level errors",
                    position: imp.hashPosition,
                    code: ErrorCode.InvalidRainDocument
                });
            }
            catch (error) { return Promise.reject(); }
        }
        else return Promise.reject();
        return Promise.resolve();
    }

    /**
     * @internal Handles an import statement
     */
    private async processImport(imp: ParsedChunk): Promise<AST.Import> {
        // let _record: string | null | undefined;
        let _metaPromise: Promise<void> | undefined;
        let _configPromise: Promise<void> | undefined;
        const _atPos: AST.Offsets = [imp[1][0] - 1, imp[1][0] - 1];
        // let _configChunks: ParsedChunk[] = [];
        const _result: AST.Import = {
            name: ".",
            hash: "",
            namePosition: _atPos,
            hashPosition: _atPos,
            problems: [],
            position: [imp[1][0] - 1, imp[1][1]]
        };

        const _chunks = exclusiveParse(imp[0], /\s+/gd, imp[1][0]);
        if (_chunks.length) {
            const _nameOrHash = _chunks.splice(0, 1)[0];
            if (!HEX_PATTERN.test(_nameOrHash[0])) {
                _result.name = _nameOrHash[0];
                _result.namePosition = _nameOrHash[1];
                if (!WORD_PATTERN.test(_nameOrHash[0])) _result.problems.push({
                    msg: "invalid word pattern",
                    position: _nameOrHash[1],
                    code: ErrorCode.InvalidWordPattern
                });
            }
            else {
                _result.name = ".";
                _result.namePosition = _nameOrHash[1];
                if (HASH_PATTERN.test(_nameOrHash[0])) {
                    _result.hash = _nameOrHash[0].toLowerCase();
                    _result.hashPosition = _nameOrHash[1];
                    _metaPromise = this.metaStore.update(_result.hash);
                    // if (this._shouldSearch) {
                    //     _metaPromise.then(() => _record = this.metaStore.getMeta(_result.hash));
                    // }
                }
                else _result.problems.push({
                    msg: "invalid hash, must be 32 bytes",
                    position: _nameOrHash[1],
                    code: ErrorCode.ExpectedHash
                });
            }
            if (_result.name !== ".") {
                if (_chunks.length) {
                    const _hash = _chunks.splice(0, 1)[0];
                    if (HEX_PATTERN.test(_hash[0])) {
                        if (!HASH_PATTERN.test(_hash[0])) _result.problems.push({
                            msg: "invalid hash, must be 32 bytes",
                            position: _hash[1],
                            code: ErrorCode.InvalidHash
                        });
                        else {
                            _result.hash = _hash[0].toLowerCase();
                            _result.hashPosition = _hash[1];
                            _metaPromise = this.metaStore.update(_result.hash);
                            // if (this._shouldSearch) {
                            //     _metaPromise.then(
                            //         () => _record = this.metaStore.getMeta(_result.hash)
                            //     );
                            // }
                        }
                    }
                    else _result.problems.push({
                        msg: "expected hash",
                        position: _hash[1],
                        code: ErrorCode.ExpectedHash
                    });
                }
                else {
                    _result.problems.push({
                        msg: "expected import hash",
                        position: _atPos,
                        code: ErrorCode.ExpectedHash
                    });
                }
            }
            _configPromise = this.processImportConfigs(_result, _chunks);
        }
        else _result.problems.push({
            msg: "expected a valid name or hash",
            position: _atPos,
            code: ErrorCode.InvalidImport
        });

        if (this._shouldSearch) await _metaPromise;
        const _record = this.metaStore.getMeta(_result.hash);

        if (_metaPromise !== undefined) {
            if (!_record) _result.problems.push({
                msg: `cannot find any settlement for hash: ${_result.hash}`,
                position: _result.hashPosition,
                code: ErrorCode.UndefinedMeta
            });
            else {
                let _metaMaps;
                try {
                    _metaMaps = Meta.decode(_record);
                }
                catch {
                    _metaMaps = undefined;
                }
                if (_metaMaps === undefined) _result.problems.push({
                    msg: "corrupt meta",
                    position: _result.hashPosition,
                    code: ErrorCode.CorruptMeta
                });
                else if (!isConsumableMeta(_metaMaps)) {
                    _result.problems.push({
                        msg: "inconsumable import",
                        position: _result.hashPosition,
                        code: ErrorCode.InconsumableMeta
                    });
                }
                else {
                    _result.sequence = {};
                    const _mm: Map<any, any>[] = [];
                    _mm.push(..._metaMaps.filter(v => 
                        v.get(1) === Meta.MagicNumbers.EXPRESSION_DEPLOYER_V2_BYTECODE_V1
                    ));
                    _mm.push(..._metaMaps.filter(
                        v => v.get(1) === Meta.MagicNumbers.CONTRACT_META_V1
                    ));
                    _mm.push(..._metaMaps.filter(
                        v => v.get(1) === Meta.MagicNumbers.DOTRAIN_V1
                    ));
                    try {
                        await Promise.all(
                            _mm.map(metamap => this.processMeta(_result, metamap))
                        );
                    }
                    catch {
                        _result.sequence = {};
                        _result.problems.push({
                            msg: "corrupt meta",
                            position: _result.hashPosition,
                            code: ErrorCode.CorruptMeta
                        });
                    }
                }
            }
        }
        await _configPromise;
        this.problems.push(..._result.problems, ...(_result.reconfigProblems ?? []));
        return _result as AST.Import;
    }

    /**
     * @internal 
     * The main workhorse of RainDocument which parses the words used in an
     * expression and is responsible for building the AST and collect problems
     */
    private async _parse() {
        this.authoringMeta      = [];
        this.imports            = [];
        this.problems           = [];
        this.comments           = [];
        this.bindings           = [];
        this.namespace          = {};
        this.authoringMetaPath  = "";
        this.bytecode           = "";
        this._ignoreAM          = false;
        this._ignoreUAM         = false;
        this.runtimeError       = undefined;
        let document            = this.textDocument.getText();

        // parse comments
        inclusiveParse(document, /\/\*[^]*?(?:\*\/|$)/gd).forEach(v => {
            if (!v[0].endsWith("*/")) this.problems.push({
                msg: "unexpected end of comment",
                position: v[1],
                code: ErrorCode.UnexpectedEndOfComment
            });
            this.comments.push({
                comment: v[0],
                position: v[1]
            });
            document = fillIn(document, v[1]);
        });

        // search for the actionable comments
        if (this.comments.find(v => /\bignore-authoring-meta\b/.test(v.comment))) 
            this._ignoreAM = true;
        if (this.comments.find(v => /\bignore-undefined-authoring-meta\b/.test(v.comment))) 
            this._ignoreUAM = true;
        if (this._ignoreAM) this._ignoreUAM = true;

        const _importStatements = exclusiveParse(document, /@/gd, undefined, true).slice(1);
        for (let i = 0; i < _importStatements.length; i++) {
            // filter out irrevelant parts
            const _index = _importStatements[i][0].indexOf("#");
            if (_index > -1) {
                _importStatements[i][0] = _importStatements[i][0].slice(0, _index);
                _importStatements[i][1][1] = _importStatements[i][1][0] + _index - 1;
            }
            document = fillIn(
                document, 
                [_importStatements[i][1][0] - 1, _importStatements[i][1][1]]
            );
        }
        if (this.importDepth < 32) (await Promise.all(
            _importStatements.map(importStatement => this.processImport(importStatement))
        )).forEach(imp => {
            if (imp.hash && this.imports.find(v => v.hash === imp.hash)) {
                imp.problems.push({
                    msg: "duplicate import",
                    position: imp.hashPosition,
                    code: ErrorCode.DuplicateImport
                });
                this.problems.push({
                    msg: "duplicate import",
                    position: imp.hashPosition,
                    code: ErrorCode.DuplicateImport
                });
            }
            this.imports.push(imp);
        });
        else _importStatements.forEach(imp => this.problems.push({
            msg: "import too deep",
            position: [imp[1][0] - 1, imp[1][1]],
            code: ErrorCode.DeepImport
        }));

        for (let i = 0; i < this.imports.length; i++) {
            if (this.imports[i].problems.length === 0) {
                const _imp = this.imports[i];
                if (this.namespace[_imp.name] && "Element" in this.namespace[_imp.name]) {
                    this.problems.push({
                        msg: `cannot import into "${_imp.name}", name already taken`,
                        position: _imp.namePosition,
                        code: ErrorCode.InvalidImport
                    });
                }
                else {
                    if (this.isDeepImport(_imp)) this.problems.push({
                        msg: "import too deep",
                        position: _imp.hashPosition,
                        code: ErrorCode.DeepImport
                    });
                    else {
                        let _hasDupKeys = false;
                        let _hasDupWords = false;
                        let _ns: AST.Namespace = {};
                        if (_imp.sequence?.dispair?.authoringMeta) {
                            _ns["Words"] = {
                                Hash: _imp.hash,
                                ImportIndex: i,
                                Element: _imp.sequence.dispair.authoringMeta
                            };
                            (_ns["Words"] as any).bytecode = _imp.sequence.dispair.bytecode;
                            _imp.sequence.dispair.authoringMeta.forEach(
                                v => _ns[v.word] = {
                                    Hash: _imp.hash,
                                    ImportIndex: i,
                                    Element: v
                                }
                            );
                        }
                        if (_imp.sequence?.ctxmeta) {
                            if (
                                hasDuplicate(
                                    _imp.sequence.ctxmeta.map(v => v.name), 
                                    Object.keys(_ns)
                                )
                            ) _hasDupKeys = true;
                            else _imp.sequence.ctxmeta.forEach(v => {
                                _ns[v.name] = {
                                    Hash: _imp.hash,
                                    ImportIndex: i,
                                    Element: v
                                };
                            });
                        }
                        if (_imp.sequence?.dotrain) {
                            if (!_hasDupKeys) {
                                if (_imp.sequence.dotrain) {
                                    const _keys = Object.keys(
                                        _imp.sequence.dotrain.namespace
                                    );
                                    if (_ns["Words"] && _keys.includes("Words")) _hasDupWords = true;
                                    else {
                                        if(hasDuplicate(_keys,Object.keys(_ns))) _hasDupKeys = true;
                                        else _ns = {
                                            ..._ns,
                                            ...this.copyNamespace(
                                                _imp.sequence.dotrain.namespace,
                                                i,
                                                _imp.hash
                                            )
                                        };
                                    }
                                }
                            }
                        }
                        if (_hasDupKeys || _hasDupWords) {
                            if (_hasDupKeys) this.problems.push({
                                msg: "import contains items with duplicate identifiers",
                                position: _imp.hashPosition,
                                code: ErrorCode.DuplicateIdentifier
                            });
                            else this.problems.push({
                                msg: "import contains multiple sets of words in its namespace",
                                position: _imp.hashPosition,
                                code: ErrorCode.MultipleWords
                            });
                        }
                        else {
                            if (_imp.reconfigs) for (let j = 0; j < _imp.reconfigs.length; j++) {
                                const _s: [ParsedChunk, ParsedChunk] = _imp.reconfigs[j];
                                if (_s[0] !== undefined && _s[1] !== undefined) {
                                    if (_s[1][0] === "!") {
                                        if (_s[0][0] === ".") {
                                            if (_ns["Words"]) {
                                                (_ns["Words"].Element as Meta.Authoring[]).forEach(v => {
                                                    delete _ns[v.word];
                                                });
                                                delete _ns["Words"];
                                            }
                                            else this.problems.push({
                                                msg: "cannot elide undefined words",
                                                position: [_s[0][1][0], _s[1][1][1]],
                                                code: ErrorCode.UndefinedDISpair
                                            });
                                        }
                                        else {
                                            if (_ns[_s[0][0]]) {
                                                if (AST.Namespace.isWord(_ns[_s[0][0]])) {
                                                    this.problems.push({
                                                        msg: `cannot elide single word: "${_s[0][0]}"`,
                                                        position: [_s[0][1][0], _s[1][1][1]],
                                                        code: ErrorCode.SingleWordModify
                                                    });
                                                }
                                                else delete _ns[_s[0][0]];
                                            }
                                            else this.problems.push({
                                                msg: `undefined identifier "${_s[0][0]}"`,
                                                position: _s[0][1],
                                                code: ErrorCode.UndefinedIdentifier
                                            });
                                        }
                                    }
                                    else {
                                        const _key = _s[0][0].startsWith("'") 
                                            ? _s[0][0].slice(1) 
                                            : _s[0][0];
                                        if (_ns[_key]) {
                                            if (AST.Namespace.isWord(_ns[_key])) {
                                                this.problems.push({
                                                    msg: `cannot rename or rebind single word: "${_s[0][0]}"`,
                                                    position: [_s[0][1][0], _s[1][1][1]],
                                                    code: ErrorCode.SingleWordModify
                                                });
                                            }
                                            else {
                                                if (_s[0][0].startsWith("'")) {
                                                    if (_ns[_s[1][0]]) this.problems.push({
                                                        msg: `cannot rename, name "${_s[1][0]}" already exists`,
                                                        position: _s[1][1],
                                                        code: ErrorCode.DuplicateIdentifier
                                                    });
                                                    else {
                                                        _ns[_s[1][0]] = _ns[_key];
                                                        delete _ns[_key];
                                                    }
                                                }
                                                else {
                                                    if (!AST.Namespace.isBinding(_ns[_key])) {
                                                        this.problems.push({
                                                            msg: "unexpected rebinding",
                                                            position: [_s[0][1][0], _s[1][1][1]],
                                                            code: ErrorCode.UnexpectedRebinding
                                                        });
                                                    }
                                                    else {
                                                        (_ns[_key].Element as AST.Binding)
                                                            .constant = _s[1][0];
                                                            
                                                        // eslint-disable-next-line max-len
                                                        if ((_ns[_key].Element as AST.Binding).elided) {
                                                            delete (
                                                                _ns[_key].Element as AST.Binding
                                                            ).elided;
                                                        }
                                                        if((_ns[_key].Element as AST.Binding).exp) {
                                                            delete (
                                                                _ns[_key].Element as AST.Binding
                                                            ).exp;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        else this.problems.push({
                                            msg: `undefined identifier "${_key}"`,
                                            position: _s[0][1],
                                            code: ErrorCode.UndefinedIdentifier
                                        });
                                    }
                                }
                            }
                        }
                        this.mergeNamespace(_imp, _ns);
                    }
                }
            }
        }

        // parse bindings
        exclusiveParse(document, /#/gd, undefined, true).slice(1).forEach((v) => {
            // if (i > 0) {
            const _index = v[0].search(/\s/);
            const position = v[1];
            let name: string;
            let namePosition: AST.Offsets;
            let content: string;
            let contentPosition: AST.Offsets;
            let elided: string;
            let _invalidId = false;
            let _dupId = false;
            let _noCmContent: string;
            if (_index === -1) {
                name = v[0];
                namePosition = v[1];
                contentPosition = [v[1][1] + 1, v[1][1]];
                content = "";
                _noCmContent = "";
            }
            else {
                const _noCmTrimmed = trackedTrim(v[0].slice(_index + 1));
                _noCmContent = !_noCmTrimmed.text ? v[0].slice(_index + 1) : _noCmTrimmed.text;

                const _contentText = this.textDocument.getText(
                    Range.create(
                        this.textDocument.positionAt(v[1][0]),
                        this.textDocument.positionAt(v[1][1] + 1)
                    )
                );
                const _trimmed = trackedTrim(_contentText.slice(_index + 1));
                name = v[0].slice(0, _index);
                namePosition = [v[1][0], v[1][0] + _index - 1];
                content = !_trimmed.text ? _contentText.slice(_index + 1) : _trimmed.text;
                contentPosition = !_trimmed.text
                    ? [v[1][0] + _index + 1, v[1][1]]
                    : [
                        v[1][0] + _index + 1 + _trimmed.startDelCount, 
                        v[1][1] - _trimmed.endDelCount
                    ];
            }
            if (_invalidId = !name.match(/^[a-z][a-z0-9-]*$/)) this.problems.push({
                msg: "invalid binding name",
                position: namePosition,
                code: ErrorCode.InvalidBindingIdentifier
            });
            if (_dupId = Object.keys(this.namespace).includes(name)) this.problems.push({
                msg: "duplicate identifier",
                position: namePosition,
                code: ErrorCode.DuplicateIdentifier
            });
            if (!_noCmContent || _noCmContent.match(/^\s+$/)) this.problems.push({
                msg: "empty binding are not allowed",
                position: namePosition,
                code: ErrorCode.InvalidEmptyBinding
            });

            if (!_invalidId && !_dupId) {
                if (this.isElided(_noCmContent)) {
                    const _msg = _noCmContent.trim().slice(1).trim();
                    if (_msg) elided = _msg;
                    else elided = DEFAULT_ELISION;
                    this.namespace[name] = {
                        Hash: "",
                        ImportIndex: -1,
                        Element: {
                            name,
                            namePosition,
                            content,
                            contentPosition,
                            position,
                            problems: [],
                            // [{
                            //     msg: _msg,
                            //     position: namePosition,
                            //     code: ErrorCode.ElidedBinding
                            // }],
                            dependencies: [],
                            elided
                        }
                    };
                }
                else {
                    const _val = this.isConstant(_noCmContent);
                    if (_val) {
                        this.namespace[name] = {
                            Hash: "",
                            ImportIndex: -1,
                            Element: {
                                name,
                                namePosition,
                                content,
                                contentPosition,
                                position,
                                problems: [],
                                dependencies: [],
                                constant: _val
                            }
                        };
                    }
                    else this.namespace[name] = {
                        Hash: "",
                        ImportIndex: -1,
                        Element: {
                            name,
                            namePosition,
                            content,
                            contentPosition,
                            position,
                            problems: [],
                            dependencies: [],
                        }
                    };
                }
                this.bindings.push(this.namespace[name].Element as AST.Binding);
            }
            document = fillIn(document, [v[1][0] - 1, v[1][1]]);
        });

        // find non-top level imports
        if (this.bindings.length > 0) this.imports.forEach(v => {
            if (v.position[0] >= this.bindings[0].namePosition[0]) this.problems.push({
                msg: "imports can only be stated at top level",
                position: [...v.position],
                code: ErrorCode.InvalidImport
            });
        });

        // find any remaining strings and include them as errors
        exclusiveParse(document, /\s+/).forEach(v => {
            this.problems.push({
                msg: "unexpected token",
                position: v[1],
                code: ErrorCode.UnexpectedToken
            });
        });

        // resolve dependencies and parse expressions
        this.processDependencies();

        // instantiate rainlang for each expression
        if (this.importDepth === 0) {

            // assign working words for this instance
            this.getWords();

            let hasExp = false;
            this.bindings.forEach(v => {
                if (v.constant === undefined && v.elided === undefined) {
                    hasExp = true;
                    v.exp = new Rainlang(
                        v.content, 
                        this.authoringMeta, 
                        // this.bytecode,
                        "0",
                        {
                            // thisBinding: v,
                            namespaces: this.namespace,
                            ignoreAuthoringMeta: this._ignoreUAM
                            // comments: this.comments.filter(e => 
                            //     e.position[0] >= v.contentPosition[0] && 
                            //     e.position[1] <= v.contentPosition[1]
                            // ).map(e => {
                            //     return {
                            //         comment: e.comment,
                            //         position: [
                            //             e.position[0] - v.contentPosition[0],
                            //             e.position[1] - v.contentPosition[0]
                            //         ]
                            //     };
                            // })
                        }
                    );
                    v.problems.push(
                        ...(v.exp as any).problems.map((e: any) => ({
                            msg: e.msg,
                            position: [
                                e.position[0] + v.contentPosition[0],
                                e.position[1] + v.contentPosition[0]
                            ],
                            code: e.code,
                        }))
                    );
                }
            });
            if (!hasExp && this.problems.length > 0) {
                if (this.problems[this.problems.length - 1].msg === "cannot find any set of words") {
                    this.problems.pop();
                }
                else {
                    const i = this.problems.findIndex(v => v.msg === "cannot find any set of words");
                    if (i > -1) this.problems.splice(i, 1);
                }
            }
        }

        // ignore next line problems
        this.comments.forEach(v => {
            if (/\bignore-next-line\b/.test(v.comment)) {
                const _cmLine = this.textDocument.positionAt(v.position[1] + 1).line;
                let _index;
                while (
                    (_index = this.problems.findIndex(
                        e => this.textDocument.positionAt(e.position[0]).line === _cmLine + 1
                    )) > -1
                ) this.problems.splice(_index, 1);
            }
        });
    }

    /**
     * @public Resolves the expressions dependencies and instantiates RainlangParser for them
     */
    private processDependencies() {
        const _bindings = this.bindings.filter(
            v => v.constant === undefined && v.elided === undefined
        );
        let _edges: [string, string][] = [];
        let _nodes = _bindings.map(v => v.name);
        const regexp = /'\.?[a-z][0-9a-z-]*(\.[a-z][0-9a-z-]*)*/g;
        for (let i = 0; i < _nodes.length; i++) {
            Array.from(
                _bindings[i].content.matchAll(regexp)
            ).map(
                v => v[0]
            ).forEach(v => {
                _bindings[i].dependencies.push(v.slice(1));
                _edges.push([_nodes[i], v.slice(1)]);
            });
        }

        while (_nodes.length && _edges.length) {
            try {
                toposort.array(_nodes, _edges).reverse();
                break;
            }
            catch (error: any) {
                if (error instanceof Error && error.message.includes("Cyclic dependency")) {
                    const errorExp = error.message.slice(error.message.indexOf("\"") + 1, -1);
                    if (!errorExp.includes(" ")) {
                        const nodesToDelete = [errorExp];
                        for (let i = 0; i < nodesToDelete.length; i++) {
                            _edges.forEach(v => {
                                if (v[1] === nodesToDelete[i]) {
                                    if (!nodesToDelete.includes(v[0])) nodesToDelete.push(v[0]);
                                }
                            });
                        }
                        _edges = _edges.filter(
                            v => !nodesToDelete.includes(v[1]) || !nodesToDelete.includes(v[0])
                        );
                        _nodes = _nodes.filter(v => !nodesToDelete.includes(v));
                        for (let i = 0; i < nodesToDelete.length; i++) {
                            const _b = _bindings.find(
                                v => v.name === nodesToDelete[i]
                            );
                            _b?.problems.push({
                                msg: "circular dependency",
                                position: _b.namePosition,
                                code: ErrorCode.CircularDependency
                            });
                        }
                    }
                }
                else {
                    this.problems.push({
                        msg: "cannot resolve dependencies",
                        position: [0, -1],
                        code: ErrorCode.UnresolvableDependencies
                    });
                    break;
                }
            }
        }
    }

    /**
     * @internal Checks if a text contains a single numeric value and returns it
     * @returns The numeric value if present, and an empty string if false
     */
    private isConstant(text: string): string {
        const _items = exclusiveParse(text, /\s+/gd);
        if (_items.length !== 1) return "";
        else {
            if (NUMERIC_PATTERN.test(_items[0][0])) {
                if (/^[1-9]\d*e\d+$/.test(_items[0][0])) {
                    const _index = _items[0][0].indexOf("e");
                    return _items[0][0].slice(0, _index)
                        + "0".repeat(Number(_items[0][0].slice(_index + 1)));
                }
                else {
                    if (/^0x[0-9a-zA-Z]+$/.test(_items[0][0])) return _items[0][0];
                    else return BigInt(_items[0][0]).toString();
                }
            }
            else return "";
        }
    }

    /**
     * @internal Checks if a binding is elided
     */
    private isElided(text: string): boolean {
        return text.trim().startsWith("!");
    }

    /**
     * @internal Method to copy Namespaces
     */
    private copyNamespace(ns: AST.Namespace, index: number, hash: string): AST.Namespace {
        const _ns: AST.Namespace = {};
        const _keys = Object.keys(ns);
        for (let i = 0; i < _keys.length; i++) {
            if ("Element" in ns[_keys[i]]) _ns[_keys[i]] = {
                Hash: ns[_keys[i]].Hash ? ns[_keys[i]].Hash as string : hash,
                ImportIndex: index,
                Element: ns[
                    _keys[i]
                ].Element as Meta.Authoring | Meta.Authoring[] | AST.Binding | AST.ContextAlias
            };
            else _ns[_keys[i]] = this.copyNamespace(ns[_keys[i]] as AST.Namespace, index, hash);
        }
        return _ns;
    }

    private mergeNamespace(imp: AST.Import, ns: AST.Namespace): boolean {
        if (imp.name !== "." && this.namespace[imp.name] === undefined) 
            this.namespace[imp.name] = {};
        const _mns = imp.name === "." 
            ? this.namespace 
            : this.namespace[imp.name] as AST.Namespace;
        const _check = (nns: AST.Namespace, cns: AST.Namespace): string => {
            const _cKeys = Object.keys(cns);
            if (!_cKeys.length) return "ok";
            else {
                if (_cKeys.includes("Element")) return "cannot import into an occupied namespace";
                else {
                    let _dupWords = false;
                    const _nKeys = Object.keys(nns);
                    if (_cKeys.includes("Words")) {
                        if (nns["Words"]) {
                            if (nns["Words"].Hash !== cns["Words"].Hash) {
                                return "namespace already contains a set of words";
                            }
                            else _dupWords = true;
                        }
                    }
                    for (let i = 0; i < _nKeys.length; i++) {
                        for (let j = 0; j < _cKeys.length; j++) {
                            if (_nKeys[i] === _cKeys[j]) {
                                if (!("Element" in nns[_nKeys[i]]) && !("Element" in cns[_cKeys[j]])) {
                                    const _result = _check(
                                        nns[_nKeys[i]] as AST.Namespace, 
                                        cns[_cKeys[j]] as AST.Namespace
                                    );
                                    if (_result !== "ok") return _result;
                                }
                                else if (
                                    AST.Namespace.isNode(nns[_nKeys[i]]) && 
                                    AST.Namespace.isNode(cns[_cKeys[j]])
                                ) {
                                    if (
                                        !AST.Namespace.isWord(nns[_nKeys[i]]) || 
                                        !AST.Namespace.isWord(cns[_cKeys[j]])
                                    ) {
                                        if (
                                            (
                                                AST.Namespace.isBinding(nns[_nKeys[i]]) && 
                                                AST.Namespace.isBinding(cns[_cKeys[j]])
                                            ) || (
                                                AST.Namespace.isContextAlias(nns[_nKeys[i]]) && 
                                                AST.Namespace.isContextAlias(cns[_cKeys[j]])
                                            )
                                        ) {
                                            if (nns[_nKeys[i]].Hash !== cns[_cKeys[j]].Hash) {
                                                return "duplicate identifier";
                                            }
                                        }
                                        else return "duplicate identifier";
                                    }
                                    else {
                                        if (!_dupWords) return "namespace already contains a set of words";
                                    }
                                }
                                else return "cannot import into an occupied namespace";
                            }
                        }
                    }
                    return "ok";
                }
            }
        };
        const _isOk = _check(ns, _mns);
        if (_isOk !== "ok") {
            this.problems.push({
                msg: _isOk,
                position: imp.hashPosition,
                code: _isOk.includes("identifier") 
                    ? ErrorCode.DuplicateIdentifier
                    : _isOk.includes("words")
                        ? ErrorCode.MultipleWords
                        : ErrorCode.InvalidImport
            });
            if (imp.name !== "." && !Object.keys(this.namespace[imp.name]).length) 
                delete this.namespace[imp.name];
            return false;
        }
        else {
            const _merge = (nns: AST.Namespace, cns: AST.Namespace) => {
                const _cKeys = Object.keys(cns);
                const _nKeys = Object.keys(nns);
                if (!_cKeys.length) {
                    for (let i = 0; i < _nKeys.length; i++) cns[_nKeys[i]] = nns[_nKeys[i]];
                }
                else {
                    for (let i = 0; i < _nKeys.length; i++) {
                        if (!_cKeys.includes(_nKeys[i])) cns[_nKeys[i]] = nns[_nKeys[i]];
                        else {
                            if (!("Element" in nns[_nKeys[i]])) _merge(
                                nns[_nKeys[i]] as AST.Namespace,
                                cns[_nKeys[i]] as AST.Namespace
                            );
                        }
                    }
                }
            };
            _merge(ns, _mns);
            return true;
        }
    }

    /**
     * @internal Method to assign working words for this instance and store its path
     */
    private getWords() {
        const _validate = (ns: AST.Namespace, hash: string): [number, string] => {
            let _c = 0;
            // let _h: string;
            if (ns["Words"]) {
                if (hash === "") {
                    _c++;
                    hash = ns["Words"].Hash as string;
                }
                else if ((ns["Words"].Hash as string).toLowerCase() !== hash.toLowerCase()) {
                    return [++_c, hash];
                }
            }
            const _nns = Object.values(ns).filter(v => !v.Element) as AST.Namespace[];
            for (let i = 0; i < _nns.length; i++) {
                const _temp = _validate(_nns[i], hash);
                hash = _temp[1];
                _c += _temp[0];
                if (_c > 1) break;
            }
            return [_c, hash];
        };
        const _wordsCount = _validate(this.namespace, "")[0];
        if (_wordsCount > 1) this.problems.push({
            msg: `words must be singleton, but namespaces include ${_wordsCount} sets of words`,
            position: [0, -1],
            code: ErrorCode.SingletonWords
        });
        else if (_wordsCount === 0) this.problems.push({
            msg: "cannot find any set of words",
            position: [0, -1],
            code: ErrorCode.UndefinedDISpair
        });
        else {
            const _get = (ns: AST.Namespace, path: string): string => {
                if (ns["Words"]) {
                    this.authoringMeta = ns["Words"].Element as Meta.Authoring[];
                    this.bytecode = (ns["Words"] as any).bytecode as string;
                    return path;
                }
                else {
                    const _nns = Object.entries(ns).filter(v => !v[1].Element);
                    for (let i = 0; i < _nns.length; i++) {
                        const _p = _get(_nns[i][1] as AST.Namespace, _nns[i][0]);
                        if (_p) return path + "." + _p;
                    }
                    return "";
                }
            };
            if (this.authoringMetaPath) { /* empty */ }
            const _path = _get(this.namespace, "");
            if (!_path) this.authoringMetaPath = ".";
            else this.authoringMetaPath = _path;
        }
    }
}

