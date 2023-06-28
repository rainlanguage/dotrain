import toposort from "toposort";
import { MetaStore } from "./metaStore";
import { Rainlang } from "../rainlang/rainlang";
import { Import, Problem, Comment, PositionOffset } from "../rainLanguageTypes";
import { inclusiveParse, exclusiveParse, getRandomInt, inclusiveWhitespaceFill, isDotrainConstant, trim } from "../utils";
import { 
    ErrorCode, 
    HASH_PATTERN, 
    TextDocument, 
    ContextAlias, 
    NamedExpression, 
} from "../rainLanguageTypes";
import { 
    OpMeta,
    deepCopy, 
    OperandArgs,
    ContractMeta,
    OpMetaSchema, 
    metaFromBytes, 
    ContractMetaSchema,
} from "@rainprotocol/meta";


/**
 * @public
 * RainDocument is a class object that parses a text to provides data and 
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
    public expressions: NamedExpression[] = [];

    private opmetaLength = 0;
    private opmetaIndex = -1;
    private opMetaBytes = "";
    private opmeta: OpMeta[] = [];
    private imports: Import[] = [];
    private comments: Comment[] = [];
    private ctxAliases: ContextAlias[] = []; 
    private problems: Problem[] = [];
    private depProblems: Problem[] = [];
    private dependencies: [string, string][] = [];


    /**
     * @public Constructs a new RainParser object
     * @param textDocument - TextDocument
     * @param metaStore - (optional) MetaStore object
     */
    private constructor(textDocument: TextDocument, metaStore?: MetaStore) {
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
        text: TextDocument, 
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
                uri ?? "untitled-" + getRandomInt(1000000000).toString(), 
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
     * @public Get the current text of this RainDocument instance
     */
    public getOpMeta(): OpMeta[] {
        return deepCopy(this.opmeta.slice(0, this.opmetaLength));
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getOpMetaWithCtxAliases(): OpMeta[] {
        return deepCopy(this.opmeta);
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getOpMetaLength(): number {
        return deepCopy(this.opmetaLength);
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getOpMetaImportIndex(): number {
        return deepCopy(this.opmetaIndex);
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getOpMetaBytes(): string {
        return this.opMetaBytes;
    }

    /**
     * @public Get all problems of this RainDocument instance
     */
    public getAllProblems(): Problem[] {
        return [...this.getTopProblems(), ...this.getExpProblems()];
    }

    /**
     * @public Get top problems of this RainDocument instance
     */
    public getTopProblems(): Problem[] {
        return [...this.getProblems(), ...this.getDependencyProblems()];
    }

    /**
     * @public Get the dependency problems of this RainDocument instance
     */
    public getDependencyProblems(): Problem[] {
        return deepCopy(this.depProblems);
    }

    /**
     * @public Get the current problems of this RainDocument instance
     */
    public getProblems(): Problem[] {
        return deepCopy(this.problems);
    }

    /**
     * @public Get the expression problems of this RainDocument instance
     */
    public getExpProblems(): Problem[] {
        return deepCopy(
            this.expressions
                .map(v => v.rainlang?.getProblems().map(e => {
                    return {
                        code: e.code,
                        msg: e.msg,
                        position: [
                            e.position[0] + v.contentPosition[0],
                            e.position[1] + v.contentPosition[0]
                        ]
                    } as Problem;
                }))
                .filter(v => v !== undefined)
                .flat() as Problem[]
        );
    }

    /**
     * @public Get the current comments inside of the text of this RainDocument instance
     */
    public getComments(): Comment[] {
        return deepCopy(this.comments);
    }

    /**
     * @public Get the imports of this RainDocument instance
     */
    public getImports(): Import[] {
        return deepCopy(this.imports);
    }

    /**
     * @public Get the context aliases of specified meta hashes in this RainDocument instance
     */
    public getContextAliases(): ContextAlias[] {
        return deepCopy(this.ctxAliases);
    }

    /**
     * @public Get the expression dependencies of this RainDocument instance
     */
    public getDependencies(): [string, string][] {
        return deepCopy(this.dependencies);
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
            this.ctxAliases     = [];
            this.expressions    = [];
            this.depProblems    = [];
            this.dependencies   = [];
            this.opmetaLength   = 0;
            this.opmetaIndex    = -1;
            this.opMetaBytes    =  "";
            this.runtimeError   = undefined;
        }
    }

    /**
     * @internal 
     * The main workhorse of RainDocument which parses the words used in an
     * expression and is responsible for building the AST and collect problems
     */
    private async _parse() {
        this.imports = [];
        this.problems = [];
        this.comments = [];
        this.ctxAliases = [];
        this.expressions = [];
        this.runtimeError = undefined;
        let document = this.textDocument.getText();

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
            document = inclusiveWhitespaceFill(document, v[1]);
        });

        // parse imports
        const _imports = inclusiveParse(document, /(?:\s|^)@0x[a-fA-F0-9]+(?=\s|$)/gd);
        if (_imports.length) {
            await this.resolveMeta(_imports);
            for (let i = 0; i < _imports.length; i++) {
                this.imports.push({
                    name: "root",
                    hash: _imports[i][0].slice(1 + (/^\s/.test(_imports[i][0]) ? 1 : 0)),
                    position: [
                        _imports[i][1][0] + (/^\s/.test(_imports[i][0]) ? 1 : 0), 
                        _imports[i][1][1]
                    ],
                });
                document = inclusiveWhitespaceFill(document, _imports[i][1]);
            }
        }
        else this.problems.push({
            msg: "cannot find op meta import",
            position: [0, 0],
            code: ErrorCode.UndefinedOpMeta
        });

        // parse expressions
        exclusiveParse(document, /#/gd, undefined, true).forEach((v, i) => {
            if (i > 0) {
                const _index = v[0].search(/\s/);
                const position = v[1];
                let name: string;
                let namePosition: PositionOffset;
                let content: string;
                let contentPosition: PositionOffset;
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
                if (!name.match(/^[a-z][a-z0-9-]*$/)) this.problems.push({
                    msg: "invalid expression name",
                    position: deepCopy(namePosition),
                    code: ErrorCode.InvalidExpressionKey
                });
                if (!content || content.match(/^\s+$/)) this.problems.push({
                    msg: "invalid empty expression",
                    position: deepCopy(namePosition),
                    code: ErrorCode.InvalidEmptyExpression
                });

                const _val = isDotrainConstant(content);
                if (_val) {
                    if (this.constants[name] !== undefined) this.problems.push({
                        msg: "duplicate constant identifier",
                        position: namePosition,
                        code: ErrorCode.DuplicateIdentifier
                    });
                    else this.constants[name] = _val;
                }
                else {
                    if (this.expressions.find(v => v.name === name)) this.problems.push({
                        msg: "duplicate expression identifier",
                        position: namePosition,
                        code: ErrorCode.DuplicateExpIdentifier
                    });
                    this.expressions.push({
                        name,
                        namePosition,
                        content,
                        contentPosition,
                        position
                    });
                }
                document = inclusiveWhitespaceFill(document, [v[1][0] - 1, v[1][1]]);
            }
        });

        // find non-top level imports
        if (this.expressions.length > 0) this.imports.forEach(v => {
            if (v.position[0] >= this.expressions[0].namePosition[0]) this.problems.push({
                msg: "imports can only be at top level",
                position: [...v.position],
                code: ErrorCode.InvalidImport
            });
        });

        // find any remaining strings and include them as errors
        exclusiveParse(document, /\s+/).forEach(v => {
            this.problems.push({
                msg: "unexpected string",
                position: v[1],
                code: ErrorCode.UnexpectedString
            });
        });

        // resolve dependencies and parse expressions
        this.resolveDependencies();

        for (let i = 0; i < this.expressions.length; i++) {
            this.expressions[i].rainlang = new Rainlang(
                this.expressions[i].content, 
                this.opmeta, 
                {
                    constants: this.constants, 
                    expressionNames: this.expressions.map(v => v.name),
                    comments: this.comments.filter(v => 
                        v.position[0] >= this.expressions[i].contentPosition[0] && 
                        v.position[1] <= this.expressions[i].contentPosition[1]
                    ).map(v => {
                        return {
                            comment: v.comment,
                            position: [
                                v.position[0] - this.expressions[i].contentPosition[0],
                                v.position[1] - this.expressions[i].contentPosition[0]
                            ] 
                        };
                    })
                }
            );
        }
    }

    /**
     * @public Fills outside of a position with whitespaces
     */
    public fillOut(text: string, position: PositionOffset): string {
        return " ".repeat(text.slice(0, position[0]).length) +
            text.slice(position[0], position[1] + 1) +
            " ".repeat(text.slice(position[1] + 1, text.length).length);
    }

    /**
     * @internal Resolves and settles the metas of this RainDocument instance from import statements
     * First valid opmeta of a meta hash will be setteld as working op meta
     */
    private async resolveMeta(imports: [string, [number, number]][]) {
        let index = -1;
        for (let i = 0; i < imports.length; i++) {
            const _offset = /^\s/.test(imports[i][0]) ? 1 : 0;
            const _hash = imports[i][0].slice(1 + _offset);
            if (HASH_PATTERN.test(_hash)) {
                let _newOpMetaBytes = this.metaStore.getOpMeta(_hash);
                let _newContMetaBytes = this.metaStore.getContractMeta(_hash);
                if (index === -1 && _newOpMetaBytes) {
                    if (_newOpMetaBytes !== this.opMetaBytes) {
                        this.opMetaBytes = _newOpMetaBytes;
                        try {
                            this.opmeta = metaFromBytes(_newOpMetaBytes, OpMetaSchema) as OpMeta[];
                            index = i;
                        }
                        catch (_err) {
                            this.problems.push({
                                msg: _err instanceof Error ? _err.message : _err as string,
                                position: [
                                    imports[i][1][0] + _offset, 
                                    imports[i][1][1]
                                ],
                                code: ErrorCode.InvalidOpMeta
                            });
                        }
                    }
                    else index = i;
                }
                if (_newContMetaBytes) {
                    try {
                        const _contractMeta = metaFromBytes(
                            _newContMetaBytes, 
                            ContractMetaSchema
                        ) as ContractMeta;
                        _contractMeta.methods.forEach(method => {
                            method.expressions.forEach(exp => {
                                exp.contextColumns?.forEach(ctxCol => {
                                    const colIndex = this.ctxAliases.findIndex(e => 
                                        e.name === ctxCol.alias && (
                                            e.column !== ctxCol.columnIndex || !isNaN(e.row)
                                        )
                                    );
                                    if (colIndex > -1) this.problems.push({
                                        msg: `duplicate context column alias: ${ctxCol.alias}`,
                                        position: [
                                            imports[i][1][0] + _offset, 
                                            imports[i][1][1]
                                        ],
                                        code: ErrorCode.DuplicateContextAlias
                                    });
                                    else {
                                        if (!this.ctxAliases.find(e => e.name === ctxCol.alias)) {
                                            this.ctxAliases.push({
                                                name: ctxCol.alias,
                                                column: ctxCol.columnIndex,
                                                row: NaN,
                                                desc: ctxCol.desc ?? ""
                                            }); 
                                        }  
                                    }
                                    ctxCol.cells?.forEach(ctxCell => {
                                        const cellIndex = this.ctxAliases.findIndex(
                                            e => e.name === ctxCell.alias && (
                                                e.column !== ctxCol.columnIndex || 
                                                e.row !== ctxCell.cellIndex
                                            )
                                        );
                                        if (cellIndex > -1) this.problems.push({
                                            msg: `duplicate context cell alias: ${ctxCell.alias}`,
                                            position: [
                                                imports[i][1][0] + _offset, 
                                                imports[i][1][1]
                                            ],
                                            code: ErrorCode.DuplicateContextAlias
                                        });
                                        else {
                                            if (!this.ctxAliases.find(
                                                e => e.name === ctxCell.alias
                                            )) this.ctxAliases.push({
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
                    }
                    catch (_err) {
                        this.problems.push({
                            msg: _err instanceof Error ? _err.message : _err as string,
                            position: [
                                imports[i][1][0] + _offset, 
                                imports[i][1][1]
                            ],
                            code: ErrorCode.InvalidContractMeta
                        });
                    }
                }
                if (!_newContMetaBytes && !_newOpMetaBytes) {
                    await this.metaStore.updateStore(_hash);
                    _newOpMetaBytes = this.metaStore.getOpMeta(_hash);
                    _newContMetaBytes = this.metaStore.getContractMeta(_hash);
                    if (index === -1 && _newOpMetaBytes) {
                        if (_newContMetaBytes !== this.opMetaBytes) {
                            try {
                                this.opMetaBytes = _newOpMetaBytes;
                                this.opmeta = metaFromBytes(
                                    _newOpMetaBytes, 
                                    OpMetaSchema
                                ) as OpMeta[];
                                index = i;
                            }
                            catch (_err) {
                                this.problems.push({
                                    msg: _err instanceof Error ? _err.message : _err as string,
                                    position: [
                                        imports[i][1][0] + _offset, 
                                        imports[i][1][1]
                                    ],
                                    code: ErrorCode.InvalidOpMeta
                                });
                            }
                        }
                        else index = i;
                    }
                    if (_newContMetaBytes) {
                        try {
                            const _contractMeta = metaFromBytes(
                                _newContMetaBytes, 
                                ContractMetaSchema
                            ) as ContractMeta;
                            _contractMeta.methods.forEach(method => {
                                method.expressions.forEach(exp => {
                                    exp.contextColumns?.forEach(ctxCol => {
                                        const colIndex = this.ctxAliases.findIndex(e => 
                                            e.name === ctxCol.alias && (
                                                e.column !== ctxCol.columnIndex || !isNaN(e.row)
                                            )
                                        );
                                        if (colIndex > -1) this.problems.push({
                                            msg: `duplicate context column alias: ${ctxCol.alias}`,
                                            position: [
                                                imports[i][1][0] + _offset, 
                                                imports[i][1][1]
                                            ],
                                            code: ErrorCode.DuplicateContextAlias
                                        });
                                        else {
                                            if (!this.ctxAliases.find(
                                                e => e.name === ctxCol.alias
                                            )) {
                                                this.ctxAliases.push({
                                                    name: ctxCol.alias,
                                                    column: ctxCol.columnIndex,
                                                    row: NaN,
                                                    desc: ctxCol.desc ?? ""
                                                }); 
                                            }  
                                        }
                                        ctxCol.cells?.forEach(ctxCell => {
                                            const cellIndex = this.ctxAliases.findIndex(
                                                e => e.name === ctxCell.alias && (
                                                    e.column !== ctxCol.columnIndex || 
                                                    e.row !== ctxCell.cellIndex
                                                )
                                            );
                                            if (cellIndex > -1) this.problems.push({
                                                msg: `duplicate context cell alias: ${ctxCell.alias}`,
                                                position: [
                                                    imports[i][1][0] + _offset, 
                                                    imports[i][1][1]
                                                ],
                                                code: ErrorCode.DuplicateContextAlias
                                            });
                                            else {
                                                if (!this.ctxAliases.find(
                                                    e => e.name === ctxCell.alias
                                                )) this.ctxAliases.push({
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
                        }
                        catch (_err) {
                            this.problems.push({
                                msg: _err instanceof Error ? _err.message : _err as string,
                                position: [
                                    imports[i][1][0] + _offset, 
                                    imports[i][1][1]
                                ],
                                code: ErrorCode.InvalidContractMeta
                            });
                        }
                    }
                    if (!_newContMetaBytes && !_newOpMetaBytes) {
                        this.problems.push({
                            msg: `cannot find any settlement for hash: ${_hash}`,
                            position: [
                                imports[i][1][0] + _offset, 
                                imports[i][1][1]
                            ],
                            code: ErrorCode.UndefinedImport
                        });
                    }
                }
            }
            else this.problems.push({
                msg: "invalid meta hash, must be 32 bytes",
                position: [
                    imports[i][1][0] + _offset, 
                    imports[i][1][1]
                ],
                code: ErrorCode.InvalidHash
            });
        }
        if (index === -1) {
            this.problems.push({
                msg: `cannot find any valid settlement for op meta from specified ${
                    imports.length > 1 ? "hashes" : "hash"
                }`,
                position: [0, -1],
                code: ErrorCode.UndefinedOpMeta
            });
            this.opmeta = [];
            this.opMetaBytes = "";
            this.opmetaLength = 0;
        }
        else {
            this.opmetaLength = this.opmeta.length;
            const _reservedKeys = [
                ...this.opmeta.map(v => v.name),
                ...this.opmeta.map(v => v.aliases).filter(v => v !== undefined).flat(),
                ...Object.keys(this.constants)
            ];
            const _ctxRowOperand = [
                deepCopy((this.opmeta.find(v => v.name === "context")?.operand as OperandArgs)?.find(
                    v => v.name.includes("row") || v.name.includes("Row")
                )) ?? {
                    name: "Row Index",
                    bits: [0, 7]
                }
            ];
            for (const _ctx of this.ctxAliases) {
                if (_reservedKeys.includes(_ctx.name)) this.problems.push({
                    msg: `duplicate identifier for contract alias: ${_ctx.name}`,
                    position: this.imports[index].position,
                    code: ErrorCode.DuplicateAlias
                });
                this.opmeta.push({
                    name: _ctx.name,
                    desc: _ctx.desc 
                        ? _ctx.desc 
                        : this.opmeta.find(v => v.name === "context")?.desc ?? "",
                    operand: 0,
                    inputs: 0,
                    outputs: 1
                });
                if (isNaN(_ctx.row)) {
                    this.opmeta[this.opmeta.length - 1].operand = _ctxRowOperand;
                }
            }
        }
        this.opmetaIndex = index;
    }

    /**
     * @public Resolves the expressions dependencies and instantiates RainlangParser for them
     */
    private resolveDependencies() {
        let edges: [string, string][] = [];
        let nodes = this.expressions.map(v => v.name);
        const regexpes = this.expressions.map(v => new RegExp(
            // eslint-disable-next-line no-useless-escape
            "(?:^|(|)|,|\s|:|')" + v.name + "(?:$|(|)|,|\s|:|>)"
        ));
        for (let i = 0; i < this.expressions.length; i++) {
            for (let j = 0; j < regexpes.length; j++) {
                if (i !== j && regexpes[j].test(this.expressions[i].content)) {
                    this.dependencies.push([nodes[i], nodes[j]]);
                    edges.push([nodes[i], nodes[j]]);
                }
            }
        }

        while (!nodes.length || !edges.length) {
            try {
                toposort.array(nodes, edges).reverse();
                break;
            }
            catch(err: any) {
                console.log(err);
                const errorNode = err.message.slice(err.message.indexOf("\"") + 1, -1);
                if (!errorNode.includes(" ")) {
                    const nodesToDelete = [errorNode];
                    for (let i = 0; i < nodesToDelete.length; i++) {
                        edges.forEach(v => {
                            if (v[1] === nodesToDelete[i]) {
                                if (!nodesToDelete.includes(v[0])) nodesToDelete.push(v[0]);
                            }
                        });
                    }
                    edges = edges.filter(
                        v => !nodesToDelete.includes(v[1]) || !nodesToDelete.includes(v[0])
                    );
                    nodes = nodes.filter(v => !nodesToDelete.includes(v));
                    for (let i = 0; i < nodesToDelete.length; i++) this.depProblems.push({
                        msg: "circular dependency",
                        position: this.expressions.find(
                            v => v.name === nodesToDelete[i]
                        )!.namePosition,
                        code: ErrorCode.CircularDependency
                    });
                }
            }
        }
    }
}
