import { MetaStore } from "./metaStore";
import toposort from "toposort";
import { ASTNodePosition, BoundExpression, ContextAlias, ErrorCode, TextDocument, hashPattern } from "../rainLanguageTypes";
import { 
    OpMeta,
    // InputMeta,
    // InputArgs, 
    // OutputMeta,
    OperandArgs,
    // OperandMeta,
    ContractMeta,
    OpMetaSchema, 
    metaFromBytes, 
    // ComputedOutput,
    ContractMetaSchema,
    deepCopy
} from "@rainprotocol/meta";
import { 
    // FragmentASTNode, 
    // OpASTNode, 
    ProblemASTNode, 
    CommentASTNode, 
    // MemoryType, 
    ImportASTNode, 
    // RainlangAST,
    // AliasASTNode,
    // RainParseState, 
    // ExpressionConfig  
} from "../rainLanguageTypes";
import {
    // op,
    // concat,
    // hexlify,
    // deepCopy,
    // BytesLike,
    // CONSTANTS,
    // BigNumber, 
    // BigNumberish, 
    // extractByBits, 
    // memoryOperand,
    // isBigNumberish,
    inclusiveParse,
    exclusiveParse,
    // deepCopy,
    // constructByBits, 
} from "../utils";
import { RainlangParser } from "./rainlangParser";


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
 * // to get the parse tree after instantiation
 * const parseTree = myRainDocument.getParseTree()
 *
 * // to update the text
 * await myRainDocument.update(newText)
 * ```
 */
export class RainDocument {

    public readonly constants: Record<string, string> = {
        "infinity": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };
    
    public textDocument: TextDocument;
    private opMetaBytes = "";
    private opmeta: OpMeta[] = [];
    public metaStore: MetaStore;
    private problems: ProblemASTNode[] = [];
    private dependencyProblems: ProblemASTNode[] = [];
    private comments: CommentASTNode[] = [];
    private imports: ImportASTNode[] = [];
    public expressions: BoundExpression[] = [];

    public runtimeError: Error | undefined;
    private ctxAliases: ContextAlias[] = []; 
    private dependencies: [string, string][] = [];
    private opmetaLength = 0;
    private opmetaIndex = -1;


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
     * @public Get the current text of this RainParser instance
     */
    public getTextDocument(): TextDocument {
        return this.textDocument;
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getOpMeta(): OpMeta[] {
        return deepCopy(this.opmeta.slice(0, this.opmetaLength));
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getOpMetaWithCtxAliases(): OpMeta[] {
        return deepCopy(this.opmeta);
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getOpMetaLength(): number {
        return deepCopy(this.opmetaLength);
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getOpMetaImportIndex(): number {
        return deepCopy(this.opmetaIndex);
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getOpMetaBytes(): string {
        return this.opMetaBytes;
    }

    /**
     * @public Get the current problems of this RainParser instance
     */
    public getAllProblems(): ProblemASTNode[] {
        const problems = deepCopy(this.problems);
        problems.push(...deepCopy(this.dependencyProblems));
        const expProblems = this.expressions
            .map(v => v.doc?.problems)
            .filter(v => v !== undefined)
            .flat() as ProblemASTNode[];

        problems.push(...deepCopy(expProblems));
        return deepCopy(this.problems);
    }

    /**
     * @public Get the current problems of this RainParser instance
     */
    public getTopProblems(): ProblemASTNode[] {
        const problems = deepCopy(this.problems);
        problems.push(...deepCopy(this.dependencyProblems));
        return problems;
    }

    /**
     * @public Get the current problems of this RainParser instance
     */
    public getDependencyProblems(): ProblemASTNode[] {
        return deepCopy(this.dependencyProblems);
    }

    /**
     * @public Get the current problems of this RainParser instance
     */
    public getProblems(): ProblemASTNode[] {
        return deepCopy(this.problems);
    }

    /**
     * @public Get the current comments inside of the text of this RainParser instance
     */
    public getComments(): CommentASTNode[] {
        return deepCopy(this.comments);
    }

    /**
     * @public Get the current runtime error of this RainParser instance
     */
    public getRuntimeError(): Error | undefined {
        return deepCopy(this.runtimeError);
    }

    /**
     * @public Get the specified meta hahses of this RainParser instance
     */
    public getImports(): ImportASTNode[] {
        return deepCopy(this.imports);
    }

    /**
     * @public Get the context aliases of specified meta hashes in this RainParser instance
     */
    public getContextAliases(): ContextAlias[] {
        return deepCopy(this.ctxAliases);
    }

    /**
     * @public Get constant k/v pairs of this RainParser instance
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
     * @internal Resolves and settles the metas of this RainParser instance from parsed meta hashes
     * First valid opmeta of a meta hash will be used for parsing and all context metas of all valid 
     * contract metas will be cached for parsing.
     * @returns The index of the meta hash that is settled for op meta and -1 no valid settlement is found for op meta
     */
    private resolveMeta = async(imports: [string, [number, number]][]) => {
        let index = -1;
        for (let i = 0; i < imports.length; i++) {
            const _offset = /^\s/.test(imports[i][0]) ? 1 : 0;
            const _hash = imports[i][0].slice(1 + _offset);
            if (hashPattern.test(_hash)) {
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
                                            if (!this.ctxAliases.findIndex(
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
                                                if (!this.ctxAliases.findIndex(
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
            const _ops = [
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
                if (_ops.includes(_ctx.name)) this.problems.push({
                    msg: `duplicate alias for contract context and opcode: ${_ctx.name}`,
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
    };

    /**
     * @public
     * Parses this instance of RainParser
     */
    public async parse() {
        if (/[^\s]+/.test(this.textDocument.getText())) {
            try {
                await this._parse();
            }
            catch (runtimeError) {
                this.runtimeError = runtimeError as Error;
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
            this.problems = [];
            this.comments = [];
            this.runtimeError = undefined;
        }
    }

    /**
     * @internal 
     * The main workhorse of RainParser which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    public async _parse() {
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
            // const startPos = this.textDocument.positionAt(v[1][0]);
            // const endPos = this.textDocument.positionAt(v[1][1]);
            // if (startPos.line === endPos.line) 
            // else {
            //     for (let line = startPos.line; line <= endPos.line; line++) {
            //         if (line === startPos.line) {
            //             const lineEndPos = this.textDocument.offsetAt(Position.create(line + 1, 0));
            //             if (this.textDocument.getText().slice(0, lineEndPos).match(/\r\n$/)) {
            //                 document = 
            //                     document.slice(0, v[1][0]) +
            //                     " ".repeat(lineEndPos - v[1][0] - 2) +
            //                     document.slice(lineEndPos - 2);
            //             }
            //             else document = 
            //                 document.slice(0, v[1][0]) +
            //                 " ".repeat(lineEndPos - v[1][0] - 1) +
            //                 document.slice(lineEndPos - 1);
            //         }
            //         else if (line === endPos.line) {
            //             const lineStartPos = this.textDocument.offsetAt(Position.create(line, 0));
            //             document = 
            //                 document.slice(0, lineStartPos) +
            //                 " ".repeat(v[1][1] - lineStartPos + 1) +
            //                 document.slice(v[1][1] + 1);
            //         }
            //         else {
            //             const lineEndPos = this.textDocument.offsetAt(Position.create(line + 1, 0));
            //             const lineStartPos = this.textDocument.offsetAt(Position.create(line, 0));
            //             if (this.textDocument.getText().slice(0, lineEndPos).match(/\r\n$/)) {
            //                 document = 
            //                     document.slice(0, lineStartPos) +
            //                     " ".repeat(lineEndPos - lineStartPos - 2) +
            //                     document.slice(lineEndPos - 2);
            //             }
            //             else document = 
            //                 document.slice(0, lineStartPos) +
            //                 " ".repeat(lineEndPos - lineStartPos - 1) +
            //                 document.slice(lineEndPos - 1);
            //         }
            //     }
            // }
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
            msg: "cannot find op meta imports, please import an op meta",
            position: [0, 0],
            code: ErrorCode.UndefinedOpMeta
        });

        const exps = inclusiveParse(document, /#[a-z][0-9a-z-]*\s+[^#]*/);
        exps.forEach(v => {
            const name = inclusiveParse(v[0], /^#[a-z][0-9a-z-]*/);
            this.expressions.push({
                name: name[0][0].slice(1),
                namePosition: [v[1][0], v[1][0] + name[0][0].length - 1],
                text: this.fillOut(
                    this.textDocument.getText(), 
                    [v[1][0] + name[0][1][1] + 1, v[1][1]]
                ),
                position: v[1]
            });
            document = 
                document.slice(0, v[1][0]) +
                " ".repeat(v[0].length) +
                document.slice(v[1][1] + 1);

        });
        this.imports.forEach(v => {
            if (v.position[0] >= this.expressions[0].position[0]) this.problems.push({
                msg: "imports can only be at top level",
                position: [...v.position],
                code: ErrorCode.InvalidImport
            });
        });

        exclusiveParse(document, /\s+/).forEach(v => {
            this.problems.push({
                msg: "unexpected string",
                position: v[1],
                code: ErrorCode.UnexpectedString
            });
        });

        this.resolveDependencies();
    }

    private resolveDependencies() {
        let edges: [string, string][] = [];
        const nodes = this.expressions.map(v => v.name);
        const regexpes = this.expressions.map(v => new RegExp(
            // eslint-disable-next-line no-useless-escape
            "(?:^|(|)|,|\s|:|')" + v.name + "(?:$|(|)|,|\s|:|>)"
        ));
        for (let i = 0; i < this.expressions.length; i++) {
            for (let j = 0; j < regexpes.length; j++) {
                if (regexpes[j].test(this.expressions[i].text)) {
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
                    edges = edges.filter(v => !v.includes(errorNode));
                    nodes.splice(nodes.indexOf(errorNode), 1);
                    this.dependencyProblems.push({
                        msg: "circular dependency",
                        position: this.expressions.find(v => v.name === errorNode)!.namePosition,
                        code: ErrorCode.CircularDependency
                    });
                }
            }
        }

        for (let i = 0; i < deps.length; i++) {
            const expression = this.expressions.find(v => v.name === deps[i]);
            if (expression) {
                expression.doc = new RainlangParser(
                    expression.text, 
                    this.opmeta, 
                    {boundExpressions: this.expressions, constants: this.constants}
                );
            }
        }
    }

    /**
     * @internal Determines if an string matches the constants keys
     */
    public isConstant = (str: string): boolean => {
        return new RegExp(
            "^" + 
            Object.keys(this.constants).join("$|^") + 
            "$"
        ).test(str);
    };

    /**
     * @public Fills outside of a position with whitespaces
     */
    private fillOut(text: string, position: ASTNodePosition): string {
        return " ".repeat(text.slice(0, position[0]).length) +
            text.slice(position[0], position[1] + 1) +
            " ".repeat(text.slice(position[1] + 1, text.length).length);
    }
}
// const x = TextDocument.create("1", "1", 1, `@0x999dbdc57ac1b4b920864b6f2adc9d856689c422b889ebe19eeac1c30e7f962c
// #my-exp
// 1

// #yo
// _ : add(my-exp 2)`);
// const y = new dotRain(x);
// y._parse().then(() => {
//     console.log(JSON.stringify(y.expressions[0].doc?.ast));
//     console.log(RainlangAST.is(y.expressions[0].doc?.ast));
//     console.log(JSON.stringify(y.expressions[1].doc?.ast));
//     console.log(y.problems);
// });
