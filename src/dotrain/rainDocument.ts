import toposort from "toposort";
import { MetaStore } from "./metaStore";
import { Rainlang } from "../rainlang/rainlang";
import { 
    trim, 
    fillIn,
    ParsedChunk, 
    hasDuplicate, 
    getRandomInt, 
    inclusiveParse, 
    exclusiveParse, 
    isConsumableMetaSequence 
} from "../utils";
import { 
    Import, 
    Binding, 
    Problem, 
    Comment, 
    ErrorCode, 
    Namespace, 
    HEX_PATTERN,
    HASH_PATTERN, 
    TextDocument, 
    ContextAlias,  
    WORD_PATTERN,
    PositionOffset, 
    NUMERIC_PATTERN, 
    DEFAULT_ELISION, 
} from "../rainLanguageTypes";
import { 
    OpMeta,
    ContractMeta,
    validateOpMeta,
    metaFromBytes, 
    MAGIC_NUMBERS,
} from "@rainprotocol/meta";


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

    public readonly constants: Record<string, string> = {
        "infinity"      : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256"   : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256"  : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    };
    public metaStore: MetaStore;
    public textDocument: TextDocument;
    public runtimeError: Error | undefined;
    public bindings: Binding[] = [];
    public namespace: Namespace = {};
    public imports: Import[] = [];

    public opmeta: OpMeta[] = [];
    public opmetaPath = "";
    public comments: Comment[] = [];
    public problems: Problem[] = [];

    private importDepth = 0;

    /**
     * @public Constructs a new RainDocument instance, should not be used for instantiating, use "creat()" instead
     * @param textDocument - TextDocument
     * @param metaStore - (optional) MetaStore object
     */
    constructor(
        textDocument: TextDocument,
        metaStore?: MetaStore,
        importDepth = 0
    ) {
        this.importDepth = importDepth;
        this.textDocument = textDocument;
        if (metaStore) this.metaStore = metaStore;
        else this.metaStore = new MetaStore();
    }

    /**
     * @public Creates a new RainDocument object instance with a TextDocument
     * 
     * @param textDocument - The text document
     * @param metaStore - (optional) The initial MetaStore object
     * @returns A new RainDocument instance
     */
    public static async create(
        textDocument: TextDocument, 
        metaStore?: MetaStore
    ): Promise<RainDocument>

    /**
     * @public Creates a new RainDocument object instance from a text string
     * 
     * @param text - The text string
     * @param metaStore - (optional) The initial MetaStore object
     * @param uri - (optional) The URI of the text, URI is the unique identifier of a TextDocument
     * @param version - (optional) The version of the text
     * @returns A new RainDocument instance
     */
    public static async create(
        text: string, 
        metaStore?: MetaStore, 
        uri?: string, 
        version?: number
    ): Promise<RainDocument>

    public static async create(
        content: TextDocument | string, 
        metaStore?: MetaStore, 
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
    public getAllProblems(): Problem[] {
        return [...this.problems, ...this.getBindingsProblems()];
    }

    /**
     * @public Get the expression problems of this RainDocument instance
     */
    public getBindingsProblems(): Problem[] {
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
            this.opmeta         = [];
            this.imports        = [];
            this.problems       = [];
            this.comments       = [];
            this.bindings       = [];
            this.namespace      = {};
            this.opmetaPath     = "";
            this.runtimeError   = undefined;
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
    private toContextAlias(contractMeta: ContractMeta): ContextAlias[] {
        const _ctxAliases: ContextAlias[] = [];
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
                                desc: ctxCol.desc ?? ""
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
                                desc: ctxCell.desc ?? ""
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
    private isDeepImport(imp: Import): boolean {
        if (imp.sequence?.dotrain) {
            const _rd = imp.sequence.dotrain;
            if (_rd.problems.find(v => v.code === ErrorCode.DeepImport)) return true;
            else return false;
        }
        else return false;
    }

    /**
     * @internal Handles an import statement
     */
    public async handleImport(imp: ParsedChunk): Promise<Import> {
        const _atPos: PositionOffset = [imp[1][0] - 1, imp[1][0] - 1];
        let _isValid = false;
        let _configChunks: ParsedChunk[] = [];
        const _result: Import = {
            name: ".",
            hash: "",
            namePosition: _atPos,
            hashPosition: _atPos,
            problems: [],
            position: [imp[1][0] - 1, imp[1][1]]
        };

        const _chuncks = exclusiveParse(imp[0], /\s+/gd, imp[1][0]);
        if (WORD_PATTERN.test(_chuncks[0][0]) || HASH_PATTERN.test(_chuncks[0][0])) {
            if (WORD_PATTERN.test(_chuncks[0][0])) {
                _result.name = _chuncks[0][0];
                _result.namePosition = _chuncks[0][1];
            }
            else {
                _result.name = ".";
                _result.namePosition = _chuncks[0][1];
                _result.hash = _chuncks[0][0].toLowerCase();
                _result.hashPosition = _chuncks[0][1];
                _isValid = true;
            }
            if (_result.name !== ".") {
                if (!_chuncks[1]) _result.problems.push({
                    msg: "expected import hash",
                    position: _atPos,
                    code: ErrorCode.ExpectedHash
                });
                else {
                    if (!HASH_PATTERN.test(_chuncks[1][0])) {
                        if (HEX_PATTERN.test(_chuncks[1][0])) _result.problems.push({
                            msg: "invalid hash, must be 32 bytes",
                            position: _chuncks[1][1],
                            code: ErrorCode.InvalidHash
                        });
                        else _result.problems.push({
                            msg: "expected hash",
                            position: _chuncks[1][1],
                            code: ErrorCode.ExpectedHash
                        });
                    }
                    else {
                        _result.hash = _chuncks[1][0].toLowerCase();
                        _result.hashPosition = _chuncks[1][1];
                        _isValid = true;
                    }
                }
                _configChunks = _chuncks.splice(2);
            }
            else _configChunks = _chuncks.splice(1);
        }
        else _result.problems.push({
            msg: "expected a valid name or hash",
            position: _atPos,
            code: ErrorCode.InvalidImport
        });

        if (_result.hash && this.imports.find(v => v.hash === _result.hash)) _result.problems.push({
            msg: "duplicate import",
            position: _result.hashPosition,
            code: ErrorCode.DuplicateImport
        });
        else if (_isValid) {
            await this.metaStore.updateStore(_result.hash as string);
            const _record = this.metaStore.getRecord(_result.hash as string);
            if (!_record) this.problems.push({
                msg: `cannot find any settlement for hash: ${_result.hash}`,
                position: _result.hashPosition,
                code: ErrorCode.UndefinedImport
            });
            else {
                if (!isConsumableMetaSequence(_record.sequence)) {
                    if (!_record.sequence.length) _result.problems.push({
                        msg: "empty import",
                        position: _result.hashPosition,
                        code: ErrorCode.InvalidMetaSequence
                    });
                    else _result.problems.push({
                        msg: "imported hash contains meta sequence that cannot be consumed",
                        position: _result.hashPosition,
                        code: ErrorCode.InvalidMetaSequence
                    });
                }
                else {
                    _result.sequence = {};
                    let _isCorrupt = false;
                    const _opmetaSeq = _record.sequence.find(
                        v => v.magicNumber === MAGIC_NUMBERS.OPS_META_V1
                    );
                    const _contractMetaSeq = _record.sequence.find(
                        v => v.magicNumber === MAGIC_NUMBERS.CONTRACT_META_V1
                    );
                    const _dotrainSeq = _record.sequence.find(
                        v => v.magicNumber === MAGIC_NUMBERS.RAIN_META_DOCUMENT
                    );
                    if (_opmetaSeq) {
                        try {
                            const _parsed = JSON.parse(metaFromBytes(_opmetaSeq.content));
                            try {
                                if (validateOpMeta(_parsed)) {
                                    _result.sequence.opmeta = _parsed;
                                }
                            }
                            catch (error) {
                                const _errorHeader = _record.type === "sequence" 
                                    ? "meta sequence contains invalid OpMeta, reason: " 
                                    : "invalid OpMeta, reason: ";
                                _result.problems.push({
                                    msg: _errorHeader + (
                                        error instanceof Error 
                                            ? error.message 
                                            : typeof error === "string" ? error : ""
                                    ),
                                    position: _result.hashPosition,
                                    code: ErrorCode.InvalidOpMeta
                                });
                            }
                        }
                        catch (error) {
                            _result.problems.push({
                                msg: _record.type === "sequence" 
                                    ? "meta sequence contains corrupt OpMeta" 
                                    : "corrupt OpMeta",
                                position: _result.hashPosition,
                                code: ErrorCode.CorruptImport
                            });
                            _isCorrupt = true;
                        }
                    }
                    if (!_isCorrupt && _contractMetaSeq) {
                        try {
                            const _parsed = JSON.parse(
                                metaFromBytes(_contractMetaSeq.content)
                            );
                            if (ContractMeta.is(_parsed)) {
                                try {
                                    _result.sequence.ctxmeta = 
                                        this.toContextAlias(_parsed);
                                }
                                catch(error) {
                                    _result.problems.push({
                                        msg: (_record.type === "sequence" 
                                            ? "meta sequence contains invalid ContractMeta, reason: " 
                                            : "invalid ContractMeta, reason: ") + (error as Error).message,
                                        position: _result.hashPosition,
                                        code: ErrorCode.InvalidContractMeta
                                    });
                                }
                            }
                            else _result.problems.push({
                                msg: _record.type === "sequence" 
                                    ? "meta sequence contains invalid ContractMeta" 
                                    : "invalid ContractMeta",
                                position: _result.hashPosition,
                                code: ErrorCode.InvalidContractMeta
                            });
                        }
                        catch (error) {
                            const _errorHeader = _record.type === "sequence" 
                                ? "meta sequence contains corrupt ContractMeta, reason: " 
                                : "corrupt ContractMeta, reason: ";
                            _result.problems.push({
                                msg: _errorHeader + (
                                    error instanceof Error 
                                        ? error.message 
                                        : typeof error === "string" ? error : ""
                                ),
                                position: _result.hashPosition,
                                code: ErrorCode.CorruptImport
                            });
                            _isCorrupt = true;
                        }
                    }
                    if (!_isCorrupt && _dotrainSeq) {
                        try {
                            const _dotrainStr = metaFromBytes(_dotrainSeq.content);
                            _result.sequence.dotrain = new RainDocument(
                                TextDocument.create(
                                    `imported-dotrain-${_result.hash}`, 
                                    "rainlang", 
                                    0, 
                                    _dotrainStr
                                ),
                                this.metaStore,
                                this.importDepth + 1
                            );
                            _result.sequence.dotrain.parse();
                            if (_result.sequence.dotrain.problems.length) _result.problems.push({
                                msg: "invalid rain document",
                                position: _result.hashPosition,
                                code: ErrorCode.InvalidRainDocument
                            });
                        }
                        catch (error) {
                            const _errorHeader = _record.type === "sequence" 
                                ? "meta sequence contains corrupt Dotrain, reason: " 
                                : "corrupt Dotrain, reason: ";
                            _result.problems.push({
                                msg: _errorHeader + (
                                    error instanceof Error 
                                        ? error.message 
                                        : typeof error === "string" ? error : ""
                                ),
                                position: _result.hashPosition,
                                code: ErrorCode.CorruptImport
                            });
                            _isCorrupt = true;
                        }
                    }
                    if (!_isCorrupt) {
                        const _reconfigs: [ParsedChunk, ParsedChunk][] = [];
                        for (let i = 0; i < _configChunks.length; i++) {
                            if (_configChunks[i][0] === ".") {
                                const _key = _configChunks[i];
                                i++;
                                if (_configChunks[i]) {
                                    if (_configChunks[i][0] === "!") {
                                        if (_reconfigs.find(v =>  
                                            v[0][0] === _key[0] && 
                                            v[1][0] === _configChunks[i][0]
                                        )) _result.problems.push({
                                            msg: "duplicate statement",
                                            position: [_key[1][0], _configChunks[i][1][1]],
                                            code: ErrorCode.DuplicateImportStatement
                                        });
                                        else _reconfigs.push([_key, _configChunks[i]]);
                                    }
                                    else _result.problems.push({
                                        msg: "unexpected token",
                                        position: _configChunks[i][1],
                                        code: ErrorCode.UnexpectedToken
                                    });
                                }
                                else _result.problems.push({
                                    msg: "expected elision syntax",
                                    position: _atPos,
                                    code: ErrorCode.ExpectedElisionOrRebinding
                                });
                            }
                            else if (WORD_PATTERN.test(_configChunks[i][0])) {
                                const _key = _configChunks[i];
                                i++;
                                if (_configChunks[i]) {
                                    if (NUMERIC_PATTERN.test(_configChunks[i][0]) || _configChunks[i][0] === "!") {
                                        if (_reconfigs.find(v => 
                                            v[0][0] === _key[0] && 
                                            v[1][0] === _configChunks[i][0]
                                        )) _result.problems.push({
                                            msg: "duplicate statement",
                                            position: [_key[1][0], _configChunks[i][1][1]],
                                            code: ErrorCode.DuplicateImportStatement
                                        });
                                        else _reconfigs.push([_key, _configChunks[i]]);
                                    }
                                    else _result.problems.push({
                                        msg: "unexpected token",
                                        position: _configChunks[i][1],
                                        code: ErrorCode.UnexpectedToken
                                    });
                                }
                                else _result.problems.push({
                                    msg: "expected rebinding or elision",
                                    position: _atPos,
                                    code: ErrorCode.ExpectedElisionOrRebinding
                                });
                            }
                            else if (_configChunks[i][0].startsWith("'")) {
                                if (WORD_PATTERN.test(_configChunks[i][0].slice(1))) {
                                    const _key = _configChunks[i];
                                    i++;
                                    if (_configChunks[i]) {
                                        if (WORD_PATTERN.test(_configChunks[i][0])) {
                                            if (_reconfigs.find(v => 
                                                v[0][0] === _key[0] && 
                                                v[1][0] === _configChunks[i][0]
                                            )) _result.problems.push({
                                                msg: "duplicate statement",
                                                position: [_key[1][0], _configChunks[i][1][1]],
                                                code: ErrorCode.DuplicateImportStatement
                                            });
                                            else _reconfigs.push([_key, _configChunks[i]]);
                                        }
                                        else _result.problems.push({
                                            msg: "invalid word pattern",
                                            position: _configChunks[i][1],
                                            code: ErrorCode.InvalidWordPattern
                                        });
                                    }
                                    else _result.problems.push({
                                        msg: "expected name",
                                        position: _atPos,
                                        code: ErrorCode.ExpectedName
                                    });
                                }
                                else {
                                    _result.problems.push({
                                        msg: "invalid word pattern",
                                        position: _configChunks[i][1],
                                        code: ErrorCode.InvalidWordPattern
                                    });
                                    i++;
                                }
                            }
                            else _result.problems.push({
                                msg: "unexpected token",
                                position: _configChunks[i][1],
                                code: ErrorCode.UnexpectedToken
                            });
                        }
                        _result.reconfigs = _reconfigs;
                    }
                }
            }
        }
        this.problems.push(..._result.problems);
        return _result as Import;
    }

    /**
     * @internal 
     * The main workhorse of RainDocument which parses the words used in an
     * expression and is responsible for building the AST and collect problems
     */
    private async _parse() {
        this.opmeta         = [];
        this.imports        = [];
        this.problems       = [];
        this.comments       = [];
        this.bindings       = [];
        this.namespace      = {};
        this.opmetaPath     = "";
        this.runtimeError   = undefined;
        let document        = this.textDocument.getText();

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

        const _importStatements = exclusiveParse(document, /@/gd, undefined, true).slice(1);
        for (let i = 0; i < _importStatements.length; i++) {
            // filter out irrevelant parts
            const _index = _importStatements[i][0].indexOf("#");
            if (_index > -1) {
                _importStatements[i][0] = _importStatements[i][0].slice(0, _index);
                _importStatements[i][1][1] = _importStatements[i][1][0] + _index - 1;
            }
            if (this.importDepth < 32) this.imports.push(
                await this.handleImport(_importStatements[i])
            );
            else this.problems.push({
                msg: "import too deep",
                position: [_importStatements[i][1][0] - 1,_importStatements[i][1][1]],
                code: ErrorCode.DeepImport
            });
            document = fillIn(
                document, 
                [_importStatements[i][1][0] - 1, _importStatements[i][1][1]]
            );
        }

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
                        let _ns: Namespace = {};
                        if (_imp.sequence?.opmeta) {
                            if (_imp.sequence.opmeta) {
                                _ns["Words"] = {
                                    Hash: _imp.hash,
                                    ImportIndex: i,
                                    Element: _imp.sequence.opmeta
                                };
                                _imp.sequence.opmeta.forEach((v, j) => {
                                    _ns[v.name] = {
                                        Hash: _imp.hash,
                                        ImportIndex: i,
                                        Element: (_ns["Words"].Element as OpMeta[])[j]
                                    };
                                    if (v.aliases) v.aliases.forEach(e => {
                                        _ns[e] = {
                                            Hash: _imp.hash,
                                            ImportIndex: i,
                                            Element: (_ns["Words"].Element as OpMeta[])[j]
                                        };
                                    });
                                });
                            }
                        }
                        if (_imp.sequence?.ctxmeta) {
                            if (_imp.sequence.ctxmeta) {
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
                                if (_s[1][0] === "!") {
                                    if (_s[0][0] === ".") {
                                        if (_ns["Words"]) {
                                            (_ns["Words"].Element as OpMeta[]).forEach(v => {
                                                delete _ns[v.name];
                                            });
                                            delete _ns["Words"];
                                        }
                                        else this.problems.push({
                                            msg: "cannot elide undefined words",
                                            position: [_s[0][1][0], _s[1][1][1]],
                                            code: ErrorCode.UndefinedOpMeta
                                        });
                                    }
                                    else {
                                        if (_ns[_s[0][0]]) {
                                            if (Namespace.isWord(_ns[_s[0][0]])) {
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
                                        if (Namespace.isWord(_ns[_key])) {
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
                                                if (!Namespace.isBinding(_ns[_key])) {
                                                    this.problems.push({
                                                        msg: "unexpected rebinding",
                                                        position: [_s[0][1][0], _s[1][1][1]],
                                                        code: ErrorCode.UnexpectedRebinding
                                                    });
                                                }
                                                else {
                                                    (_ns[_key].Element as Binding)
                                                        .constant = _s[1][0];
                                                    if ((_ns[_key].Element as Binding).elided) {
                                                        delete (
                                                            _ns[_key].Element as Binding
                                                        ).elided;
                                                    }
                                                    if ((_ns[_key].Element as Binding).exp) {
                                                        delete (
                                                            _ns[_key].Element as Binding
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
            let namePosition: PositionOffset;
            let content: string;
            let contentPosition: PositionOffset;
            let elided: string;
            let _invalidId = false;
            let _dupId = false;
            if (_index === -1) {
                name = v[0];
                namePosition = v[1];
                contentPosition = [v[1][1] + 1, v[1][1]];
                content = "";
            }
            else {
                const _trimmed =  trim(v[0].slice(_index + 1));
                name = v[0].slice(0, _index);
                namePosition = [v[1][0], v[1][0] + _index - 1];
                content = !_trimmed.text ? v[0].slice(_index + 1) : _trimmed.text;
                contentPosition = !_trimmed.text
                    ? [v[1][0] + _index + 1, v[1][1]]
                    : [
                        v[1][0] + _index + 1 + _trimmed.startDelCount, 
                        v[1][1] - _trimmed.endDelCount
                    ];
            }
            if (_invalidId = !name.match(/^[a-z][a-z0-9-]*$/)) this.problems.push({
                msg: "invalid expression name",
                position: namePosition,
                code: ErrorCode.InvalidBindingId
            });
            if (_dupId = Object.keys(this.namespace).includes(name)) this.problems.push({
                msg: "duplicate identifier",
                position: namePosition,
                code: ErrorCode.DuplicateIdentifier
            });
            if (!content || content.match(/^\s+$/)) this.problems.push({
                msg: "invalid empty binding",
                position: namePosition,
                code: ErrorCode.InvalidEmptyBinding
            });

            if (!_invalidId && !_dupId) {
                if (this.isElided(content)) {
                    const _msg = content.trim().slice(1).trim();
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
                    const _val = this.isConstant(content);
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
                this.bindings.push(this.namespace[name].Element as Binding);
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
        this.resolveDependencies();

        // instantiate rainlang for each expression
        if (this.importDepth === 0) {

            // assign working words for this instance
            this.getWords();

            this.bindings.forEach(v => {
                if (v.constant === undefined && v.elided === undefined) {
                    v.exp = new Rainlang(
                        v.content, 
                        this.opmeta, 
                        {
                            thisBinding: v,
                            namespaces: this.namespace,
                            comments: this.comments.filter(e => 
                                e.position[0] >= v.contentPosition[0] && 
                                e.position[1] <= v.contentPosition[1]
                            ).map(e => {
                                return {
                                    comment: e.comment,
                                    position: [
                                        e.position[0] - v.contentPosition[0],
                                        e.position[1] - v.contentPosition[0]
                                    ]
                                };
                            })
                        }
                    );
                    v.problems.push(...((v.exp as any).problems as Problem[]).map(e => {
                        return {
                            msg: e.msg,
                            position: [
                                e.position[0] + v.contentPosition[0],
                                e.position[1] + v.contentPosition[0]
                            ],
                            code: e.code,
                        } as Problem;
                    }));
                }
            });
        }
    }

    /**
     * @public Resolves the expressions dependencies and instantiates RainlangParser for them
     */
    private resolveDependencies() {
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

        while (!_nodes.length || !_edges.length) {
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
    private copyNamespace(ns: Namespace, index: number, hash: string): Namespace {
        const _ns: Namespace = {};
        const _keys = Object.keys(ns);
        for (let i = 0; i < _keys.length; i++) {
            if ("Element" in ns[_keys[i]]) _ns[_keys[i]] = {
                Hash: ns[_keys[i]].Hash ? ns[_keys[i]].Hash as string : hash,
                ImportIndex: index,
                Element: ns[_keys[i]].Element as OpMeta | OpMeta[] | Binding | ContextAlias
            };
            else _ns[_keys[i]] = this.copyNamespace(ns[_keys[i]] as Namespace, index, hash);
        }
        return _ns;
    }

    private mergeNamespace(imp: Import, ns: Namespace): boolean {
        if (imp.name !== "." && this.namespace[imp.name] === undefined) 
            this.namespace[imp.name] = {};
        const _mns = imp.name === "." 
            ? this.namespace 
            : this.namespace[imp.name] as Namespace;
        const _check = (nns: Namespace, cns: Namespace): string => {
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
                                        nns[_nKeys[i]] as Namespace, 
                                        cns[_cKeys[j]] as Namespace
                                    );
                                    if (_result !== "ok") return _result;
                                }
                                else if (
                                    Namespace.isNode(nns[_nKeys[i]]) && 
                                    Namespace.isNode(cns[_cKeys[j]])
                                ) {
                                    if (
                                        !Namespace.isWord(nns[_nKeys[i]]) || 
                                        !Namespace.isWord(cns[_cKeys[j]])
                                    ) {
                                        if (
                                            (
                                                Namespace.isBinding(nns[_nKeys[i]]) && 
                                                Namespace.isBinding(cns[_cKeys[j]])
                                            ) || (
                                                Namespace.isContextAlias(nns[_nKeys[i]]) && 
                                                Namespace.isContextAlias(cns[_cKeys[j]])
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
            const _merge = (nns: Namespace, cns: Namespace) => {
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
                                nns[_nKeys[i]] as Namespace,
                                cns[_nKeys[i]] as Namespace
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
        const _validate = (ns: Namespace, hash: string): [number, string] => {
            let _c = 0;
            // let _h: string;
            if (ns["Words"]) {
                if (!hash) {
                    _c++;
                    hash = ns["Words"].Hash as string;
                }
                else if (ns["Words"].Hash !== hash) {
                    return [++_c, hash];
                }
            }
            const _nns = Object.values(ns).filter(v => !v.Element) as Namespace[];
            for (let i = 0; i < _nns.length; i++) {
                const _temp = _validate(_nns[i], hash);
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
            code: ErrorCode.UndefinedOpMeta
        });
        else {
            const _get = (ns: Namespace, path: string): string => {
                if (ns["Words"]) {
                    this.opmeta = ns["Words"].Element as OpMeta[];
                    return path;
                }
                else {
                    const _nns = Object.entries(ns).filter(v => !v[1].Element);
                    for (let i = 0; i < _nns.length; i++) {
                        const _p = _get(_nns[i][1] as Namespace, _nns[i][0]);
                        if (_p) return path + "." + _p;
                    }
                    return "";
                }
            };
            if (this.opmetaPath) { /* empty */ }
            const _path = _get(this.namespace, "");
            if (!_path) this.opmetaPath = ".";
            else this.opmetaPath = _path;
        }
    }
}
