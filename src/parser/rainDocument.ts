import toposort from "toposort";
import { MetaStore } from "./metaStore";
import { RainlangParser } from "./rainlangParser";
import { inclusiveParse, exclusiveParse } from "../utils";
import { ImportASTNode, ProblemASTNode, CommentASTNode } from "../rainLanguageTypes";
import { 
    ErrorCode, 
    HASH_PATTERN, 
    TextDocument,
    ContextAlias,  
    PositionOffset, 
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
 * RainDocument is a class object that provides data and functionalities 
 * in order to be used later on to provide Rain Language Services or in 
 * Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes).
 * It uses Rain parser under the hood which does all the heavy work.
 * 
 * @example
 * ```typescript
 * // to import
 * import { Raindocument } from 'rainlang';
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
        "infinity": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };
    public metaStore: MetaStore;
    public textDocument: TextDocument;
    public runtimeError: Error | undefined;
    public expressions: NamedExpression[] = [];

    private opmetaLength = 0;
    private opmetaIndex = -1;
    private opMetaBytes = "";
    private opmeta: OpMeta[] = [];
    private imports: ImportASTNode[] = [];
    private comments: CommentASTNode[] = [];
    private ctxAliases: ContextAlias[] = []; 
    private problems: ProblemASTNode[] = [];
    private depProblems: ProblemASTNode[] = [];
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
     * @public Creates a new RainDocument object instance
     * 
     * @param textDocument - The text document
     * @param metaStore - (optional) The initial MetaStore object
     * @returns A new RainDocument instance
     */
    public static async create(textDocument: TextDocument, metaStore?: MetaStore) {
        const _rainDocument = new RainDocument(textDocument, metaStore);
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

    public async updateText(newText: string | TextDocument) {
        if (typeof newText === "string") this.textDocument = TextDocument.update(
            this.textDocument, 
            [{ text: newText }], 
            this.textDocument.version + 1
        );
        else this.textDocument = newText;
        await this.parse();
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getTextDocument(): TextDocument {
        return this.textDocument;
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
    public getAllProblems(): ProblemASTNode[] {
        return [...this.getTopProblems(), ...this.getExpProblems()];
    }

    /**
     * @public Get top problems of this RainDocument instance
     */
    public getTopProblems(): ProblemASTNode[] {
        return [...this.getProblems(), ...this.getDependencyProblems()];
    }

    /**
     * @public Get the dependency problems of this RainDocument instance
     */
    public getDependencyProblems(): ProblemASTNode[] {
        return deepCopy(this.depProblems);
    }

    /**
     * @public Get the current problems of this RainDocument instance
     */
    public getProblems(): ProblemASTNode[] {
        return deepCopy(this.problems);
    }

    /**
     * @public Get the expression problems of this RainDocument instance
     */
    public getExpProblems(): ProblemASTNode[] {
        return deepCopy(
            this.expressions
                .map(v => v.parseObj?.problems)
                .filter(v => v !== undefined)
                .flat() as ProblemASTNode[]
        );
    }

    /**
     * @public Get the current comments inside of the text of this RainDocument instance
     */
    public getComments(): CommentASTNode[] {
        return deepCopy(this.comments);
    }

    /**
     * @public Get the current runtime error of this RainDocument instance
     */
    public getRuntimeError(): Error | undefined {
        return deepCopy(this.runtimeError);
    }

    /**
     * @public Get the imports of this RainDocument instance
     */
    public getImports(): ImportASTNode[] {
        return deepCopy(this.imports);
    }

    /**
     * @public Get the context aliases of specified meta hashes in this RainDocument instance
     */
    public getContextAliases(): ContextAlias[] {
        return deepCopy(this.ctxAliases);
    }

    /**
     * @public Get constant k/v pairs of this RainDocument instance
     */
    public getConstants(): Record<string, string> {
        return deepCopy(this.constants);
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
            document = 
                document.slice(0, v[1][0]) +
                " ".repeat(v[0].length) +
                document.slice(v[1][1] + 1);
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
                document = 
                    document.slice(0, _imports[i][1][0]) +
                    " ".repeat(_imports[i][0].length) +
                    document.slice(_imports[i][1][1] + 1);
            }
        }
        else this.problems.push({
            msg: "cannot find op meta import",
            position: [0, 0],
            code: ErrorCode.UndefinedOpMeta
        });

        // parse expressions
        inclusiveParse(document, /#[^#]+\s+[^#]*/).forEach(v => {
            const _name = exclusiveParse(v[0], /\s+/);
            if (_name[0][0].match(/^#[a-z][a-z0-9-]*$/)) this.expressions.push({
                name: _name[0][0].slice(1),
                namePosition: [v[1][0], v[1][0] + _name[0][0].length - 1],
                text: this.fillOut(
                    this.textDocument.getText(), 
                    [v[1][0] + _name[0][1][1] + 1, v[1][1]]
                ),
                position: v[1]
            });
            else this.problems.push({
                msg: "invalid expression name",
                position: [v[1][0], v[1][0] + _name[0][0].length - 1],
                code: ErrorCode.InvalidExpressionKey
            });
            document = 
                document.slice(0, v[1][0]) +
                " ".repeat(v[0].length) +
                document.slice(v[1][1] + 1);

        });

        // find duplicate expression keys
        this.expressions.forEach((v, i) => {
            if (this.expressions.find((e, j) => i !== j && e.name === v.name)) {
                this.problems.push({
                    msg: "duplicate expression identifier",
                    position: v.namePosition,
                    code: ErrorCode.DuplicateAlias
                });
            }
        });

        // find non-top level imports
        if (this.expressions.length > 0) this.imports.forEach(v => {
            if (v.position[0] >= this.expressions[0].position[0]) this.problems.push({
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
                                        msg: "duplicate context column alias",
                                        position: [
                                            imports[i][1][0] + _offset, 
                                            imports[i][1][1]
                                        ],
                                        code: ErrorCode.DuplicateConetxtColumn
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
                                            msg: "duplicate context cell alias",
                                            position: [
                                                imports[i][1][0] + _offset, 
                                                imports[i][1][1]
                                            ],
                                            code: ErrorCode.DuplicateContextCell
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
                                            msg: "duplicate context column alias",
                                            position: [
                                                imports[i][1][0] + _offset, 
                                                imports[i][1][1]
                                            ],
                                            code: ErrorCode.DuplicateConetxtColumn
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
                                                msg: "duplicate context cell alias",
                                                position: [
                                                    imports[i][1][0] + _offset, 
                                                    imports[i][1][1]
                                                ],
                                                code: ErrorCode.DuplicateContextCell
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
                            code: ErrorCode.UndefinedMeta
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
        }
        else {
            this.opmetaLength = this.opmeta.length;
            const _reservedKeys = [
                ...this.opmeta.map(v => v.name),
                ...this.opmeta.map(v => v.aliases).filter(v => v !== undefined).flat(),
                ...Object.keys(this.constants)
            ];
            const _ctxRowOperand = [
                (this.opmeta.find(v => v.name === "context")?.operand as OperandArgs)?.find(
                    v => v.name.includes("row") || v.name.includes("Row")
                ) ?? {
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
                if (i !== j && regexpes[j].test(this.expressions[i].text)) {
                    this.dependencies.push([nodes[i], nodes[j]]);
                    edges.push([nodes[i], nodes[j]]);
                }
            }
        }

        let deps: string[] = [];
        for (let i = 0; i < nodes.length; i++) {
            try {
                deps = toposort.array(nodes, edges).reverse();
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
                    edges = edges.filter(v => !nodesToDelete.includes(v[1]));
                    nodes = nodes.filter(v => !nodesToDelete.includes(v));
                    this.depProblems.push({
                        msg: "circular dependency",
                        position: this.expressions.find(v => v.name === errorNode)!.namePosition,
                        code: ErrorCode.CircularDependency
                    });
                }
            }
        }

        if (this.opmetaIndex > -1) for (let i = 0; i < deps.length; i++) {
            const _i = this.expressions.findIndex(v => v.name === deps[i]);
            if (_i > -1) {
                this.expressions[_i].parseObj = new RainlangParser(
                    this.expressions[_i].text, 
                    this.opmeta, 
                    _i,
                    {
                        boundExpressions: this.expressions, 
                        constants: this.constants, 
                    }
                );
            }
        }
    }

    /**
     * @public Fills outside of a position with whitespaces
     */
    private fillOut(text: string, position: PositionOffset): string {
        return " ".repeat(text.slice(0, position[0]).length) +
            text.slice(position[0], position[1] + 1) +
            " ".repeat(text.slice(position[1] + 1, text.length).length);
    }
}
