import { MetaStore } from "./metaStore";
import { ContextAlias, ErrorCode, TextDocument } from "../rainLanguageTypes";
import { 
    OpMeta,
    InputMeta,
    InputArgs, 
    OutputMeta,
    OperandArgs,
    OperandMeta,
    ContractMeta,
    OpMetaSchema, 
    metaFromBytes, 
    ComputedOutput,
    ContractMetaSchema
} from "@rainprotocol/meta";
import { 
    ExpressionASTNode, 
    OpASTNode, 
    ProblemASTNode, 
    CommentASTNode, 
    MemoryType, 
    MetaHashASTNode, 
    SourceASTNode,
    AliasASTNode,
    RainParseState, 
    ExpressionConfig 
} from "../rainLanguageTypes";
import {
    op,
    concat,
    hexlify,
    deepCopy,
    BytesLike,
    CONSTANTS,
    BigNumber, 
    BigNumberish, 
    extractByBits, 
    memoryOperand,
    isBigNumberish,
    inclusiveParse,
    exclusiveParse,
    constructByBits, 
} from "../utils";


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
    private _rp: RainParser;

    /**
     * @public constructor of RainDocument object
     * @param textDocument - Raw text to parse (can be updated at any time after instantiation)
     * @param metaStore - (optional) MetaStore class object
     */
    private constructor(textDocument: TextDocument, metaStore?: MetaStore) {
        this._rp = new RainParser(textDocument, metaStore);
    }

    /**
     * @public
     * Creates a new instance of RainDocument
     * 
     * @param textDocument - The text document
     * @param metaStore - The MetaStore object
     * @returns A new instance of RainDocument
     */
    public static async create(
        textDocument: TextDocument, 
        metaStore?: MetaStore
    ): Promise<RainDocument> {
        const rainDocument = new RainDocument(textDocument, metaStore);
        await rainDocument.update();
        return rainDocument;
    }

    /**
     * @public Method to update the RainDocument with new text or opmeta and get the parse results
     * @param newTextDocument - Raw text to parse
     */
    public async update(newTextDocument?: TextDocument) {
        if (newTextDocument) this._rp.updateText(newTextDocument);
        await this._rp.parse();
    }

    /**
     * @public Get the current raw op meta of this RainDocument instance in hex string
     */
    public getOpMetaBytes(): string {
        return this._rp.getOpMetaBytes();
    }

    /**
     * @public Get the current op meta of this RainDocument instance
     */
    public getOpMeta(): OpMeta[] {
        return this._rp.getOpMeta();
    }

    /**
     * @public Get the current text of this RainDocument instance
     */
    public getTextDocument(): TextDocument {
        return this._rp.getTextDocument();
    }

    /**
     * @public Get the current parse tree of this RainDocument instance
     */
    public getParseTree(): SourceASTNode[] {
        return this._rp.getParseTree();
    }

    /**
     * @public Get the current problems of this RainDocument instance
     */
    public getProblems(): ProblemASTNode[] {
        return this._rp.getProblems();
    }

    /**
     * @public Get the current comments inside of the text of this RainDocument instance
     */
    public getComments(): CommentASTNode[] {
        return this._rp.getComments();
    }

    /**
     * @public Get the current runtime error of this RainDocument instance
     */
    public getRuntimeError(): Error | undefined {
        return this._rp.getRuntimeError();
    }

    /**
     * @public Get the MetaStore object instance of this RainDocument instance
     */
    public getMetaStore(): MetaStore {
        return this._rp.getMetaStore();
    }

    /**
     * @public Get the parsed exp aliases of this RainDocument instance
     */
    public getLHSAliases(): AliasASTNode[][] {
        return this._rp.getLHSAliases();
    }

    /**
     * @public Get the specified meta hashes of this RainDocument instance
     */
    public getMetaHashes(): MetaHashASTNode[] {
        return this._rp.getMetaHashes();
    }

    /**
     * @public Get the context aliases of specified meta hashes in this RainDocument instance
     */
    public getContextAliases(): ContextAlias[] {
        return this._rp.getContextAliases();
    }

    /**
     * @public Get constants k/v pairs of this RainDocument instance
     */
    public getConstants(): Record<string, string> {
        return this._rp.getConstants();
    }

    /**
     * @public Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance.
     * This method should not be used directly, insteda the RainCompiler (rlc) should be used.
     * @param item - Optional item to get the ExpressionConfig for
     */
    public getExpressionConfig(
        item?:
            | ExpressionASTNode
            | ExpressionASTNode[][]
            | SourceASTNode[],
    ): ExpressionConfig | undefined {
        return this._rp.compile(item);
    }
}


/**
 * @public
 * Rain Parser is a the main workhorse that does all the heavy work of parsing a document, 
 * written in TypeScript in order to parse a text document using an op meta into known types 
 * which later will be used in RainDocument object and Rain Language Services and Compiler
 */
class RainParser {
    public readonly illigalChar = /[^ -~\s]+/;
    public readonly wordPattern = /^[a-z][0-9a-z-]*$/;
    public readonly hashPattern = /^0x[a-zA-F0-9]{64}$/;
    public readonly numericPattern = /^0x[0-9a-zA-Z]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/;
    public readonly constants: Record<string, string> = {
        "infinity": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    };
    
    private textDocument: TextDocument;
    private opMetaBytes = "";
    private opmeta: OpMeta[] = [];
    private metaStore: MetaStore;
    private parseTree: SourceASTNode[] = [];
    private problems: ProblemASTNode[] = [];
    private comments: CommentASTNode[] = [];
    private parseAliases: AliasASTNode[][] = [];
    private hashes: MetaHashASTNode[] = [];

    private names: string[] = [];
    private pops: InputMeta[] = [];
    private pushes: OutputMeta[] = [];
    private operand: OperandMeta[] = [];
    private opAliases: (string[] | undefined)[] = [];
    private ctxAliases: ContextAlias[] = []; 
    private opmetaLength = 0;
    
    private exp = "";
    private state: RainParseState = {
        parse: {
            tree: [],
            aliases: []
        },
        track: {
            char: 0,
            parens: {
                open: [],
                close: []
            }
        },
        depthLevel: 0,
        runtimeError: undefined
    };

    /**
     * @public Constructs a new RainParser object
     * @param textDocument - TextDocument
     * @param metaStore - (optional) MetaStore object
     */
    constructor(textDocument: TextDocument, metaStore?: MetaStore) {
        this.textDocument = textDocument;
        if (metaStore) this.metaStore = metaStore;
        else this.metaStore = new MetaStore();
    }

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
                this.state.runtimeError = {
                    name: (runtimeError as Error).name,
                    message: (runtimeError as Error).message,
                    stack: (runtimeError as Error).stack
                } as Error;
                this.problems.push({
                    msg: `Runtime Error: ${
                        this.state.runtimeError.message
                    }`,
                    position: [
                        this.state.track.char,
                        this.textDocument.getText().length - 1
                    ],
                    code: ErrorCode.RuntimeError
                });
            }
        }
        else {
            this.exp = "";
            this._resetState();
            this.parseTree = [];
            this.problems = [];
            this.comments = [];
            this.parseAliases = [];
            this.state.track.char = 0;
            this.state.runtimeError = undefined;
        }
    }

    /**
     * @public Update the text of this RainParser instance
     * @param text - The new text document to update
     */
    public updateText(textDocument: TextDocument) {
        this.textDocument = textDocument;
    }

    /**
     * @public Get the current raw op meta of this RainParser instance
     */
    public getOpMetaBytes(): string {
        return this.opMetaBytes;
    }

    /**
     * @public Get the current op meta of this RainParser instance
     */
    public getOpMeta(): OpMeta[] {
        return deepCopy(this.opmeta.slice(0, this.opmetaLength));
    }

    /**
     * @public Get the current text of this RainParser instance
     */
    public getTextDocument(): TextDocument {
        return this.textDocument;
    }

    /**
     * @public Get the current parse tree of this RainParser instance
     */
    public getParseTree(): SourceASTNode[] {
        return deepCopy(this.parseTree);
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
        return deepCopy(this.state.runtimeError);
    }

    /**
     * @public Get the MetaStore object instance
     */
    public getMetaStore(): MetaStore {
        return this.metaStore;
    }

    /**
     * @public Get the parsed exp aliases of this RainParser instance
     */
    public getLHSAliases(): AliasASTNode[][] {
        return deepCopy(this.parseAliases);
    }

    /**
     * @public Get the specified meta hahses of this RainParser instance
     */
    public getMetaHashes(): MetaHashASTNode[] {
        return deepCopy(this.hashes);
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
     * @public
     * Method to get ExpressionConfig (bytes) from RDNode or parse tree object
     *
     * @param items - (optional) parse tree or RDNodes to get the ExpressionConfig from
     * @returns ExpressionConfig, i.e. compiled bytes ready to be deployed
     */
    public compile(
        items?:
            | ExpressionASTNode
            | ExpressionASTNode[][]
            | SourceASTNode[],
    ): ExpressionConfig | undefined {
        if (this.problems.length) return undefined;
        if (items) return this._compile(items);
        else return this._compile(this.parseTree);
    }

    /**
     * @internal Method to reset the parser state
     */
    private _resetState = () => {
        this.state.parse.tree = [];
        this.state.parse.aliases = [];
        this.state.track.parens.open = [];
        this.state.track.parens.close = [];
        this.state.depthLevel = 0;
    };

    /**
     * @internal Resets op meta related arrays
     */
    private _resetOpMeta = () => {
        this.opmeta = [];
        this.names = [];
        this.opAliases = [];
        this.pops = [];
        this.pushes = [];
        this.operand = [];
        this.opmetaLength = 0;
    };

    /**
     * @internal Method to find index of next element within the text
     */
    private findIndex = (str: string): number => {
        return str.search(/[()<>\s]/g);
    };

    /**
     * @internal Trims the trailing and leading whitespaces and newline characters from a string
     */
    private trim = (str: string): {text: string, startDelCount: number, endDelCount: number} => {
        return {
            text: str.trim(),
            startDelCount: str.length - str.trimStart().length,
            endDelCount: str.length - str.trimEnd().length
        };
    };

    /**
     * @internal Determines if an string matches the constants keys
     */
    private isConstant = (str: string): boolean => {
        return new RegExp(
            "^" + 
            Object.keys(this.constants).join("$|^") + 
            "$"
        ).test(str);
    };

    /**
     * @internal Parses right hand side of an expression
     */
    private parseRHS = (exp: string, offset: number) => {
        while (exp.length > 0) {
            const _currentPosition = offset - exp.length;
            this.state.track.char = _currentPosition;
            
            if (exp.startsWith(" ")) {
                exp = exp.slice(1);
                this.state.track.char++;
            }
            else if (exp.startsWith("(")) {
                exp = exp.slice(1);
                this.state.track.char++;
                let __exp = exp;
                const _pos: number[] = [];
                let _index = -1;
                let _check = true;
                while (_check && (__exp.includes("(") || __exp.includes(")"))) {
                    const _i = __exp.search(/\(|\)/);
                    if (__exp[_i] === "(") _pos.push(_i);
                    else {
                        const _x = _pos.pop();
                        if (!_x) {
                            _index = _i;
                            _check = false;
                        }
                    }
                    __exp = __exp.slice(_i + 1);
                }
                this.problems.push({
                    msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                    position: [
                        _currentPosition,
                        _index > -1 
                            ? _currentPosition + _index + 1 
                            : _currentPosition + exp.length
                    ],
                    code: ErrorCode.ExpectedOpcode
                });
                if (_index === -1) {
                    this.state.track.char += (exp.length);
                    exp = "";
                }
                else {
                    exp = exp.slice(_index + 1);
                    this.state.track.char +=  _index;
                }
            }
            else if (exp.startsWith(")")) {
                if (this.state.track.parens.open.length > 0) {
                    this.state.track.parens.close.push(_currentPosition);
                    this.resolveParen();
                    this.state.depthLevel--;
                }
                else this.problems.push({
                    msg: "unexpected \")\"",
                    position: [_currentPosition, _currentPosition],
                    code: ErrorCode.UnexpectedClosingParen
                });
                exp = exp.slice(1);
                this.state.track.char++;
                if (exp && !exp.match(/^[\s);,]/)) this.problems.push({
                    msg: "expected to be seperated by space",
                    position: [_currentPosition, _currentPosition + 1],
                    code: ErrorCode.ExpectedSpace
                });
            }
            else exp = this.consume(exp, _currentPosition);
        }
    };

    /**
     * @internal 
     * The main workhorse of RainParser which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private async _parse() {
        this.exp = "";
        this.hashes = [];
        this._resetState();
        this.parseTree = [];
        this.problems = [];
        this.comments = [];
        this.ctxAliases = [];
        this.parseAliases = [];
        this.state.track.char = 0;
        this.state.runtimeError = undefined;
        let document = this.textDocument.getText();

        // check for illigal characters
        inclusiveParse(document, this.illigalChar).forEach(v => {
            this.problems.push({
                msg: `found illigal character: "${v[0]}"`,
                position: v[1],
                code: ErrorCode.IlligalChar
            });
            document = 
                document.slice(0, v[1][0]) +
                " ".repeat(v[0].length) +
                document.slice(v[1][1] + 1);
        });

        // remove indents, tabs, new lines
        document = document.replace(/\t/g, " ");
        document = document.replace(/\r\n/g, "  ");
        document = document.replace(/\r/g, " ");
        document = document.replace(/\n/g, " ");

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

        // parse metas
        const _hashes = inclusiveParse(document, /(?:\s|^)@0x[a-fA-F0-9]+(?=\s|$)/gd);
        if (_hashes.length) {
            await this.resolveMeta(_hashes);
            for (let i = 0; i < _hashes.length; i++) {
                this.hashes.push({
                    hash: _hashes[i][0].slice(1 + (/^\s/.test(_hashes[i][0]) ? 1 : 0)),
                    position: [
                        _hashes[i][1][0] + (/^\s/.test(_hashes[i][0]) ? 1 : 0), 
                        _hashes[i][1][1]
                    ],
                });
                document = 
                    document.slice(0, _hashes[i][1][0]) +
                    " ".repeat(_hashes[i][0].length) +
                    document.slice(_hashes[i][1][1] + 1);
            }
        }
        else this.problems.push({
            msg: "cannot find op meta hash, please specify an op meta hash",
            position: [0, 0],
            code: ErrorCode.UndefinedOpMeta
        });

        // begin parsing expression sources and cache them
        const _sourceExp: string[] = [];
        const _sourceExpPos: [number, number][] = [];
        exclusiveParse(document, /;/gd).forEach(v => {
            if (document[v[1][1] + 1] === ";" || /[^\s]/.test(v[0])) {
                const _trimmed = this.trim(v[0]);
                _sourceExp.push(_trimmed.text);
                _sourceExpPos.push([
                    v[1][0] + _trimmed.startDelCount, 
                    v[1][1] - _trimmed.endDelCount
                ]);
                if (document[v[1][1] + 1] !== ";") {
                    this.problems.push({
                        msg: "source item expressions must end with semi",
                        position: [
                            v[1][1] - _trimmed.endDelCount + 1, 
                            v[1][1] - _trimmed.endDelCount
                        ],
                        code: ErrorCode.ExpectedSemi
                    });
                }
            }
        });

        // begin parsing individual expression sources
        for (let i = 0; i < _sourceExp.length; i++) {
            this._resetState();
            this.parseAliases.push([]);
            const _subExp: string[] = [];
            const _subExpEntry: number[] = [];
            const _currentSourceTree: ExpressionASTNode[] = [];
            let _lhs: string;

            // parse and cache the sub-expressions
            exclusiveParse(_sourceExp[i], /,/gd).forEach(v => {
                const _trimmed = this.trim(v[0]);
                _subExp.push(_trimmed.text);
                _subExpEntry.push(v[1][0] + _trimmed.startDelCount);
            });

            // begin parsing individual sub-expressions
            for (let j = 0; j < _subExp.length; j++) {
                this._resetState();
                const _positionOffset = _sourceExpPos[i][0] + _subExpEntry[j];
                this.state.track.char = _positionOffset;

                // check for LHS/RHS delimitter, exit from parsing this sub-expression if 
                // no or more than one delimitter was found, else start parsing LHS and RHS
                if (_subExp[j].includes(":")) {
                    _lhs = _subExp[j].slice(0, _subExp[j].indexOf(":"));
                    this.exp = _subExp[j].slice(_subExp[j].indexOf(":") + 1);

                    // check for invalid RHS comments
                    for (const _cm of this.comments) {
                        if (
                            _cm.position[0] > _positionOffset + 
                                _subExp[j].indexOf(":") &&
                            _cm.position[0] < _positionOffset + 
                                _subExp[j].length
                        ) this.problems.push({
                            msg: "invalid RHS, comments are not allowed",
                            position: [..._cm.position],
                            code: ErrorCode.UnexpectedRHSComment
                        });
                    }

                    // begin parsing LHS
                    if (_lhs.length > 0) {
                        const _parsedLhs = inclusiveParse(
                            _lhs, 
                            /\S+/gd,
                            _positionOffset
                        );
                        const _ops = [
                            ...this.names,
                            ...this.opAliases.filter(v => v !== undefined).flat(),
                            ...Object.keys(this.constants)
                        ];
                        for (const _p of _parsedLhs) {
                            this.state.parse.aliases.push({
                                name: _p[0],
                                position: _p[1]
                            });
                            if (!/^[a-z][a-z0-9-]*$|^_$/.test(_p[0])) {
                                this.problems.push({
                                    msg: `invalid LHS alias: ${_p[0]}`,
                                    position: _p[1],
                                    code:ErrorCode.InvalidWordPattern
                                });
                            }
                            if (_ops.includes(_p[0])) this.problems.push({
                                msg: `duplicate alias: ${_p[0]}`,
                                position: _p[1],
                                code:ErrorCode.DuplicateAlias
                            });
                            this.state.track.char = _p[1][1];
                        }
                    }

                    // begin parsing RHS
                    // while (this.exp.length > 0) {
                    // const _currentPosition = 
                    //     _positionOffset + 
                    //     _subExp[j].length - 
                    //     this.exp.length;
                    this.parseRHS(this.exp, _positionOffset + _subExp[j].length);
                    // }
                    //     this.state.track.char = _currentPosition;
                    //     if (this.exp.startsWith(" ")) {
                    //         this.exp = this.exp.slice(1);
                    //         this.state.track.char++;
                    //     }
                    //     else if (this.exp.startsWith("(")) {
                    //         this.exp = this.exp.slice(1);
                    //         this.state.track.char++;
                    //         let __exp = this.exp;
                    //         const _pos: number[] = [];
                    //         let _index = -1;
                    //         let _check = true;
                    //         while (_check && (__exp.includes("(") || __exp.includes(")"))) {
                    //             const _i = __exp.search(/\(|\)/);
                    //             if (__exp[_i] === "(") _pos.push(_i);
                    //             else {
                    //                 const _x = _pos.pop();
                    //                 if (!_x) {
                    //                     _index = _i;
                    //                     _check = false;
                    //                 }
                    //             }
                    //             __exp = __exp.slice(_i + 1);
                    //         }
                    //         this.problems.push({
                    //             msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                    //             position: [
                    //                 _currentPosition,
                    //                 _index > -1 
                    //                     ? _currentPosition + _index + 1 
                    //                     : _currentPosition + this.exp.length
                    //             ],
                    //             code: ErrorCode.ExpectedOpcode
                    //         });
                    //         if (_index === -1) {
                    //             this.state.track.char += (this.exp.length);
                    //             this.exp = "";
                    //         }
                    //         else {
                    //             this.exp = this.exp.slice(_index + 1);
                    //             this.state.track.char +=  _index;
                    //         }
                    //     }
                    //     else if (this.exp.startsWith(")")) {
                    //         if (this.state.track.parens.open.length > 0) {
                    //             this.state.track.parens.close.push(_currentPosition);
                    //             this.resolveParen();
                    //             this.state.depthLevel--;
                    //         }
                    //         else this.problems.push({
                    //             msg: "unexpected \")\"",
                    //             position: [_currentPosition, _currentPosition],
                    //             code: ErrorCode.UnexpectedClosingParen
                    //         });
                    //         this.exp = this.exp.slice(1);
                    //         this.state.track.char++;
                    //         if (this.exp && !this.exp.match(/^[\s);,]/)) this.problems.push({
                    //             msg: "expected to be seperated by space",
                    //             position: [_currentPosition, _currentPosition + 1],
                    //             code: ErrorCode.ExpectedSpace
                    //         });
                    //     }
                    //     else this.consume(_currentPosition);
                    // }

                    // validating RHS against LHS
                    const _outputCount = this.countOutputs(
                        [...this.state.parse.tree]
                    );
                    if (!isNaN(_outputCount)) {
                        const _tagsCount = this.state.parse.aliases.length;
                        const _treeCount = this.state.parse.tree.length;
                        const _diff = _tagsCount - _outputCount;
                        const _tags = [...this.state.parse.aliases];
                        this.state.track.char = _positionOffset;
                        if (!(_currentSourceTree.length === 0 && _treeCount === 0)) {
                            if (_diff === 0) {
                                for (let k = 0; k < _treeCount; k++) {
                                    const _node = this.state.parse.tree[
                                        this.state.parse.tree.length - 1 - k
                                    ];
                                    this.state.track.char = _node.position[1];
                                    if ("opcode" in _node) {
                                        if (_node.output > 0) {
                                            _node.lhsAlias = [];
                                            _tags.splice(-_node.output).forEach(v => {
                                                _node.lhsAlias?.push(v);
                                            });
                                        }
                                    }
                                    else _tags.splice(-1).forEach(v => {
                                        _node.lhsAlias = v;
                                    });
                                }
                            }
                            else if (_diff > 0) {
                                for (let k = 0; k < _diff; k++) {
                                    const _tag = _tags.pop()!;
                                    this.problems.push({
                                        msg: `no RHS item exists to match this LHS item: ${_tag.name}`,
                                        position: _tag.position,
                                        code: ErrorCode.MismatchRHS
                                    });
                                }
                                for (let k = 0; k < _treeCount; k++) {
                                    const _node = this.state.parse.tree[
                                        this.state.parse.tree.length - 1 - k
                                    ];
                                    this.state.track.char = _node.position[1];
                                    if ("opcode" in _node) {
                                        if (_node.output > 0) {
                                            _node.lhsAlias = [];
                                            _tags.splice(-_node.output).forEach(v => {
                                                _node.lhsAlias?.push(v);
                                            }); 
                                        }
                                    }
                                    else _tags.splice(-1).forEach(v => {
                                        _node.lhsAlias = v;
                                    });
                                }
                            }
                            else {
                                let _c = -_diff;
                                const _nodes = [...this.state.parse.tree];
                                for (let k = 0; k < -_diff; k++) {
                                    if ("opcode" in _nodes[k]) {
                                        if ((_nodes[k] as OpASTNode).output > 0) {
                                            const _node = _nodes[_nodes.length - 1];
                                            this.problems.push({
                                                msg: "no LHS item exists to match this RHS item",
                                                position: _node.position,
                                                code: ErrorCode.MismatchLHS
                                            });
                                            if ((_nodes[k] as OpASTNode).output > 1) {
                                                if (_c >= (_nodes[k] as OpASTNode).output) {
                                                    _nodes.pop();
                                                    _c -= (_nodes[k] as OpASTNode).output;
                                                }
                                                k += ((_nodes[k] as OpASTNode).output - 1);
                                            }
                                            else {
                                                _nodes.pop();
                                                _c--;
                                            }
                                        }
                                    }
                                }
                                for (let k = 0; k < _nodes.length; k++) {
                                    const _node = this.state.parse.tree[
                                        _nodes.length - 1 - k
                                    ];
                                    this.state.track.char = _node.position[1];
                                    if (_node) {
                                        if ("opcode" in _node) {
                                            if (_node.output > 0) {
                                                _node.lhsAlias = [];
                                                _tags.slice(-_node.output).forEach(v => {
                                                    _node.lhsAlias?.push(v);
                                                });
                                            }
                                        }
                                        else _tags.slice(-1).forEach(v => {
                                            _node.lhsAlias = v;
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                else this.problems.push({
                    msg: "invalid rain expression",
                    position: [
                        _positionOffset,
                        _positionOffset + _subExp[j].length - 1
                    ],
                    code: ErrorCode.InvalidExpression
                });

                _currentSourceTree.push(
                    ...this.state.parse.tree.splice(
                        -this.state.parse.tree.length
                    )
                );
                this.parseAliases[
                    this.parseAliases.length - 1
                ].push(
                    ...[...this.state.parse.aliases.splice(
                        -this.state.parse.aliases.length
                    )]
                );
            }

            // constructing final parse tree
            this.parseTree.push({
                position: _sourceExpPos[i],
                nodes: _currentSourceTree.splice(-_currentSourceTree.length)
            });
        }
    }

    /**
     * @internal Resolves and settles the metas of this RainParser instance from parsed meta hashes
     * First valid opmeta of a meta hash will be used for parsing and all context metas of all valid 
     * contract metas will be cached for parsing.
     * @returns The index of the meta hash that is settled for op meta and -1 no valid settlement is found for op meta
     */
    private resolveMeta = async(hashes: [string, [number, number]][]): Promise<number> => {
        let index = -1;
        for (let i = 0; i < hashes.length; i++) {
            const _offset = /^\s/.test(hashes[i][0]) ? 1 : 0;
            const _hash = hashes[i][0].slice(1 + _offset);
            if (this.hashPattern.test(_hash)) {
                let _newOpMetaBytes = this.metaStore.getOpMeta(_hash);
                let _newContMetaBytes = this.metaStore.getContractMeta(_hash);
                if (index === -1 && _newOpMetaBytes) {
                    if (_newOpMetaBytes !== this.opMetaBytes) {
                        this.opMetaBytes = _newOpMetaBytes;
                        try {
                            this.opmeta = metaFromBytes(_newOpMetaBytes, OpMetaSchema) as OpMeta[];
                            this.names = this.opmeta.map(v => v.name);
                            this.pops = this.opmeta.map(v => v.inputs);
                            this.pushes = this.opmeta.map(v => v.outputs);
                            this.operand = this.opmeta.map(v => v.operand);
                            this.opAliases = this.opmeta.map(v => v.aliases);
                            index = i;
                        }
                        catch (_err) {
                            this.problems.push({
                                msg: _err instanceof Error ? _err.message : _err as string,
                                position: [
                                    hashes[i][1][0] + _offset, 
                                    hashes[i][1][1]
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
                                    const colIndex = this.ctxAliases.findIndex(
                                        e => e.name === ctxCol.alias
                                    );
                                    if (colIndex > -1) this.ctxAliases[colIndex] = {
                                        name: ctxCol.alias,
                                        column: ctxCol.columnIndex,
                                        row: NaN,
                                        desc: ctxCol.desc ?? ""
                                    };
                                    else this.ctxAliases.push({
                                        name: ctxCol.alias,
                                        column: ctxCol.columnIndex,
                                        row: NaN,
                                        desc: ctxCol.desc ?? ""
                                    });
                                    ctxCol.cells?.forEach(ctxCell => {
                                        const cellIndex = this.ctxAliases.findIndex(
                                            e => e.name === ctxCell.alias
                                        );
                                        if (cellIndex > -1) this.ctxAliases[cellIndex] = {
                                            name: ctxCell.alias,
                                            column: ctxCol.columnIndex,
                                            row: ctxCell.cellIndex,
                                            desc: ctxCell.desc ?? ""
                                        };
                                        this.ctxAliases.push({
                                            name: ctxCell.alias,
                                            column: ctxCol.columnIndex,
                                            row: ctxCell.cellIndex,
                                            desc: ctxCell.desc ?? ""
                                        });
                                    });
                                });
                            });
                        });
                    }
                    catch (_err) {
                        this.problems.push({
                            msg: _err instanceof Error ? _err.message : _err as string,
                            position: [
                                hashes[i][1][0] + _offset, 
                                hashes[i][1][1]
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
                                this.names = this.opmeta.map(v => v.name);
                                this.pops = this.opmeta.map(v => v.inputs);
                                this.pushes = this.opmeta.map(v => v.outputs);
                                this.operand = this.opmeta.map(v => v.operand);
                                this.opAliases = this.opmeta.map(v => v.aliases);
                                index = i;
                            }
                            catch (_err) {
                                this.problems.push({
                                    msg: _err instanceof Error ? _err.message : _err as string,
                                    position: [
                                        hashes[i][1][0] + _offset, 
                                        hashes[i][1][1]
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
                                        const colIndex = this.ctxAliases.findIndex(
                                            e => e.name === ctxCol.alias
                                        );
                                        if (colIndex > -1) this.ctxAliases[colIndex] = {
                                            name: ctxCol.alias,
                                            column: ctxCol.columnIndex,
                                            row: NaN,
                                            desc: ctxCol.desc ?? ""
                                        };
                                        else this.ctxAliases.push({
                                            name: ctxCol.alias,
                                            column: ctxCol.columnIndex,
                                            row: NaN,
                                            desc: ctxCol.desc ?? ""
                                        });
                                        ctxCol.cells?.forEach(ctxCell => {
                                            const cellIndex = this.ctxAliases.findIndex(
                                                e => e.name === ctxCell.alias
                                            );
                                            if (cellIndex > -1) this.ctxAliases[cellIndex] = {
                                                name: ctxCell.alias,
                                                column: ctxCol.columnIndex,
                                                row: ctxCell.cellIndex,
                                                desc: ctxCell.desc ?? ""
                                            };
                                            this.ctxAliases.push({
                                                name: ctxCell.alias,
                                                column: ctxCol.columnIndex,
                                                row: ctxCell.cellIndex,
                                                desc: ctxCell.desc ?? ""
                                            });
                                        });
                                    });
                                });
                            });
                        }
                        catch (_err) {
                            this.problems.push({
                                msg: _err instanceof Error ? _err.message : _err as string,
                                position: [
                                    hashes[i][1][0] + _offset, 
                                    hashes[i][1][1]
                                ],
                                code: ErrorCode.InvalidContractMeta
                            });
                        }
                    }
                    if (!_newContMetaBytes && !_newOpMetaBytes) {
                        this.problems.push({
                            msg: `cannot find any settlement for hash: ${_hash}`,
                            position: [
                                hashes[i][1][0] + _offset, 
                                hashes[i][1][1]
                            ],
                            code: ErrorCode.UndefinedMeta
                        });
                    }
                }
            }
            else this.problems.push({
                msg: "invalid meta hash, must be 32 bytes",
                position: [
                    hashes[i][1][0] + _offset, 
                    hashes[i][1][1]
                ],
                code: ErrorCode.InvalidMetaHash
            });
        }
        if (index === -1) {
            this.problems.push({
                msg: `cannot find any valid settlement for op meta from specified ${
                    hashes.length > 1 ? "hashes" : "hash"
                }`,
                position: [0, -1],
                code: ErrorCode.UndefinedOpMeta
            });
            this._resetOpMeta();
            this.opMetaBytes = "";
        }
        else {
            this.opmetaLength = this.opmeta.length;
            const _ops = [
                ...this.names,
                ...this.opAliases.filter(v => v !== undefined).flat(),
                ...Object.keys(this.constants)
            ];
            const _ctxRowOperand = [
                (this.operand[this.names.indexOf("context")] as OperandArgs)?.find(
                    v => v.name.includes("row") || v.name.includes("Row")
                ) ?? {
                    name: "Row Index",
                    bits: [0, 7]
                }
            ];
            for (const _ctx of this.ctxAliases) {
                if (_ops.includes(_ctx.name)) this.problems.push({
                    msg: `duplicate alias for contract context and opcode: ${_ctx.name}`,
                    position: this.hashes[index].position,
                    code: ErrorCode.DuplicateAlias
                });
                this.pops.push(0);
                this.pushes.push(1);
                this.operand.push(0);
                this.names.push(_ctx.name);
                this.opmeta.push({
                    name: _ctx.name,
                    desc: _ctx.desc 
                        ? _ctx.desc 
                        : this.opmeta[this.names.indexOf("context")]?.desc ?? "",
                    operand: 0,
                    inputs: 0,
                    outputs: 1
                });
                if (isNaN(_ctx.row)) {
                    this.operand[this.operand.length - 1] = _ctxRowOperand;
                    this.opmeta[this.opmeta.length - 1].operand = _ctxRowOperand;
                }
            }
        }
        return index;
    };

    /**
     * @internal Method to resolve a valid closed paren node at current state of parsing
     */
    private resolveParen() {
        this.state.track.parens.open.pop();
        const _endPosition = this.state.track.parens.close.pop()!;
        let _nodes: ExpressionASTNode[] = this.state.parse.tree;
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            _nodes = (_nodes[_nodes.length - 1] as OpASTNode).parameters;
        }
        const _node = _nodes[_nodes.length - 1] as OpASTNode;
        _node.position[1] = _endPosition;
        _node.parens[1] = _endPosition;
        const _i = this.problems.findIndex(
            v => v.msg === "expected \")\"" && 
            v.position[0] === _node.opcode.position[0] &&
            v.position[1] === _node.parens[0]
        );
        if (_i > -1) this.problems.splice(_i, 1);
        _nodes[_nodes.length - 1] = this.resolveOpcode(_node);
    }

    /**
     * @internal Method to update the parse tree
     */
    private updateTree(node: ExpressionASTNode, replace?: boolean) {
        let _nodes: ExpressionASTNode[] = this.state.parse.tree;
        if (replace) {
            for (let i = 0; i < this.state.depthLevel - 1; i++) {
                _nodes = (_nodes[_nodes.length - 1] as OpASTNode).parameters;
            }
            _nodes.pop();
        }
        else {
            for (let i = 0; i < this.state.depthLevel; i++) {
                _nodes = (_nodes[_nodes.length - 1] as OpASTNode).parameters;
            }
        }
        _nodes.push(node);
    }

    /**
     * @internal Method to handle operand arguments
     */
    private resolveOperand(exp: string, pos: number, op: OpASTNode): [string, OpASTNode] {
        if (!exp.includes(">")) {
            this.problems.push({
                msg: "expected \">\"",
                position: [pos, pos + exp.length - 1],
                code: ErrorCode.ExpectedClosingAngleBracket
            });
            op.operandArgs = {
                position: [pos, pos + exp.length - 1],
                args: []
            };
            exp = "";
        }
        else {
            const _operandArgs = exp.slice(1, exp.indexOf(">"));
            exp = exp.slice(exp.indexOf(">") + 1);
            const _parsedVals = inclusiveParse(_operandArgs, /\S+/gd, pos + 1);
            op.operandArgs = {
                position: [pos, pos + _operandArgs.length + 1],
                args: []
            };
            let _operandMetas: OperandArgs = [];
            const _index = this.names.indexOf(op.opcode.name);
            if (_index > -1) {
                if (typeof this.operand[_index] !== "number") {
                    _operandMetas = deepCopy(this.operand[_index] as OperandArgs);
                    const _i = _operandMetas.findIndex(v => v.name === "inputs");
                    if (_i > -1) _operandMetas.splice(_i, 1);
                }
                if (_operandMetas.length === 0) this.problems.push({
                    msg: `opcode ${op.opcode.name} doesn't have argumented operand`,
                    position: [pos, pos + _operandArgs.length + 1],
                    code: ErrorCode.MismatchOperandArgs
                });
                if (_operandMetas.length > _parsedVals.length) this.problems.push({
                    msg: `expected ${
                        _operandMetas.length - _parsedVals.length
                    }${
                        _parsedVals.length ? " more" : ""
                    } operand argument${
                        (_operandMetas.length - _parsedVals.length) > 1 ? "s" : ""
                    } for ${
                        op.opcode.name
                    }`,
                    position: [pos, pos + _operandArgs.length + 1],
                    code: ErrorCode.MismatchOperandArgs
                });
            }
            _parsedVals.forEach((v, i) => {
                const _isValid = /^[0-9]+$|^0x[a-fA-F0-9]+$/.test(v[0]);
                if (_isValid) op.operandArgs!.args.push({
                    value: Number(v[0]),
                    name: _operandMetas[i]?.name ?? "unknown",
                    position: v[1],
                    description: _operandMetas[i]?.desc
                });
                else this.problems.push({
                    msg: `invalid argument pattern: ${v[0]}`,
                    position: v[1],
                    code: ErrorCode.InvalidWordPattern
                });
                if (_index > -1 && i >= _operandMetas.length) this.problems.push({
                    msg: `unexpected operand argument for ${op.opcode.name}`,
                    position: v[1],
                    code: ErrorCode.MismatchOperandArgs
                });
            });
        }
        return [exp, op];
    }

    /**
     * @internal Method that resolves the RDOpNode once its respective closing paren has been consumed
     */
    private resolveOpcode = (node: OpASTNode): OpASTNode => {
        const _index = this.names.indexOf(node.opcode.name);
        if (_index !== -1) {
            if (typeof this.pushes[_index] === "number") {
                node.output = this.pushes[_index] as number;
            }
            if (this.operand[_index] === 0) {
                node.operand = 0;
                if (node.operandArgs) {
                    node.operand = NaN;
                    this.problems.push({
                        msg: `opcode ${node.opcode.name} doesn't have argumented operand`,
                        position: node.operandArgs.position,
                        code: ErrorCode.MismatchOperandArgs
                    });
                }
                if (this.pops[_index] === 0) {
                    if (node.parameters.length) this.problems.push({
                        msg: "out-of-range inputs",
                        position: [...node.parens],
                        code: ErrorCode.OutOfRangeInputs
                    });
                }
                else {
                    if (
                        node.parameters.length !== 
                        (this.pops[_index] as InputArgs).parameters.length
                    ) this.problems.push({
                        msg: "out-of-range inputs",
                        position: [...node.parens],
                        code: ErrorCode.OutOfRangeInputs
                    });
                }
            }
            else {
                let _argIndex = 0;
                let _inputsIndex = -1;
                const _argsLength = (
                    this.operand[_index] as OperandArgs
                ).find(
                    v => v.name === "inputs"
                )
                    ? (this.operand[_index] as OperandArgs).length - 1
                    : (this.operand[_index] as OperandArgs).length;
                if (_argsLength === (node.operandArgs?.args.length ?? 0)) {
                    if ((_argsLength === 0 && !node.operandArgs) || _argsLength > 0) {
                        const _operand = constructByBits(
                            (this.operand[_index] as OperandArgs).map((v, i) => {
                                if (v.name === "inputs") {
                                    _inputsIndex = i;
                                    return {
                                        value: node.parameters.length,
                                        bits: v.bits,
                                        computation: v.computation,
                                        validRange: v.validRange
                                    };
                                }
                                else return {
                                    value: node.operandArgs!.args[_argIndex++]?.value,
                                    bits: v.bits,
                                    computation: v.computation,
                                    validRange: v.validRange
                                };
                            })
                        );
                        if (typeof _operand === "number") {
                            node.operand = _operand;
                            if (typeof this.pushes[_index] !== "number") node.output = extractByBits(
                                _operand, 
                                (this.pushes[_index] as ComputedOutput).bits, 
                                (this.pushes[_index] as ComputedOutput).computation
                            );
                            if (this.pops[_index] === 0) {
                                if (node.parameters.length) this.problems.push({
                                    msg: "out-of-range inputs",
                                    position: [...node.parens],
                                    code: ErrorCode.OutOfRangeInputs
                                });
                            }
                            else {
                                if (_inputsIndex === -1) {
                                    if (
                                        node.parameters.length !== 
                                        (this.pops[_index] as InputArgs).parameters.length
                                    ) this.problems.push({
                                        msg: "out-of-range inputs",
                                        position: [...node.parens],
                                        code: ErrorCode.OutOfRangeInputs
                                    });
                                }
                            }
                        }
                        else {
                            node.operand = NaN;
                            if (typeof this.pushes[_index] !== "number") node.output = NaN;
                            for (const _oprnd of _operand) {
                                if (_inputsIndex > -1) {
                                    if (_oprnd === _inputsIndex) this.problems.push({
                                        msg: "out-of-range inputs",
                                        position: [...node.parens],
                                        code: ErrorCode.OutOfRangeInputs
                                    });
                                    else if (_oprnd < _inputsIndex) this.problems.push({
                                        msg: "out-of-range operand argument",
                                        position: [
                                            ...node.operandArgs!.args[_oprnd].position
                                        ],
                                        code: ErrorCode.OutOfRangeOperandArgs
                                    });
                                    else this.problems.push({
                                        msg: "out-of-range operand argument",
                                        position: [
                                            ...node.operandArgs!.args[_oprnd - 1].position
                                        ],
                                        code: ErrorCode.OutOfRangeOperandArgs
                                    });
                                }
                                else this.problems.push({
                                    msg: "out-of-range operand argument",
                                    position: [...node.operandArgs!.args[_oprnd].position],
                                    code: ErrorCode.OutOfRangeOperandArgs
                                });
                            }
                        }
                    }
                    else node.operand = NaN;
                }
                else {
                    node.operand = NaN;
                    if (_argsLength > 0 && !node.operandArgs) this.problems.push({
                        msg: `expected operand arguments for opcode ${node.opcode.name}`,
                        position: node.opcode.position,
                        code: ErrorCode.ExpectedOperandArgs
                    });
                }
            }
            // }
            if (node.output === 0 && this.state.depthLevel > 1) this.problems.push({
                msg: "zero output opcodes cannot be nested",
                position: [...node.position],
                code: ErrorCode.InvalidNestedNode
            });
            if (node.output > 1 && this.state.depthLevel > 1) this.problems.push({
                msg: "multi output opcodes cannot be nested",
                position: [...node.position],
                code: ErrorCode.InvalidNestedNode
            });
        }
        return node;
    };

    /**
     * @internal Method that consumes the words from the text and updates the parse tree
     */
    private consume(exp: string, entry: number): string {
        const _tmp = this.findIndex(exp);
        const _index = _tmp < 0 ? exp.length : _tmp === 0 ? 1 : _tmp;
        const _word = exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        this.state.track.char = entry + _word.length - 1;
        exp = exp.replace(_word, "");
        const _aliasIndex = this.parseAliases[
            this.parseAliases.length - 1
        ].findIndex(
            v => v.name === _word
        );
        const _currentAliasIndex = this.state.parse.aliases.findIndex(
            v => v.name === _word
        );

        if (exp.startsWith("(") || exp.startsWith("<")) {
            if (!_word.match(this.wordPattern)) this.problems.push({
                msg: `invalid word pattern: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            let _enum = this.names.indexOf(_word);
            if (_enum === -1) _enum = this.opAliases.findIndex(v => v?.includes(_word));
            if (_enum === -1) this.problems.push({
                msg: `unknown opcode: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.UnknownOp
            });
            let _op: OpASTNode = {
                opcode: {
                    name: _enum > -1 ? this.names[_enum] : "unknown opcode",
                    description: _enum > -1 ? this.opmeta[_enum].desc : "",
                    position: [..._wordPos],
                },
                operand: NaN,
                output: NaN,
                position: [[..._wordPos][0], NaN],
                parens: [NaN, NaN],
                parameters: []
            };
            if (exp.startsWith("<")) [exp, _op] = this.resolveOperand(exp, entry + _word.length, _op);
            if (exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._wordPos][1] + 1;
                exp = exp.replace("(", "");
                this.state.track.parens.open.push(_pos);
                _op.parens[0] = _pos;
                this.updateTree(_op);
                this.state.depthLevel++;
                this.problems.push({
                    msg: "expected \")\"",
                    position: [[..._wordPos][0], _pos],
                    code: ErrorCode.ExpectedClosingParen
                });
            }
            else {
                this.problems.push({
                    msg: "expected \"(\"",
                    position: [..._wordPos],
                    code: ErrorCode.ExpectedOpeningParen
                });
            }
        }
        else if (_aliasIndex > -1 || _currentAliasIndex > -1) {
            if (!_word.match(this.wordPattern)) this.problems.push({
                msg: `invalid pattern for alias: ${_word}`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            if (_currentAliasIndex > -1) this.problems.push({
                msg: "cannot reference self",
                position: [..._wordPos],
                code: ErrorCode.InvalidSelfReferenceLHS
            });
            this.updateTree({
                name: _word,
                position: [..._wordPos],
            });
        }
        else if (_word.match(this.numericPattern)) {
            let _val = _word;
            if (_word.startsWith("0b")) _val = Number(_word).toString();
            else if (!isBigNumberish(_word)) {
                const _nums = _word.match(/\d+/g)!;
                _val = _nums[0] + "0".repeat(Number(_nums[1]));
            }
            if (CONSTANTS.MaxUint256.lt(_val)) {
                this.problems.push({
                    msg: "value greater than 32 bytes in size",
                    position: [..._wordPos],
                    code: ErrorCode.OutOfRangeValue
                });
            }
            this.updateTree({
                value: _val,
                position: [..._wordPos],
            });
        }
        else if (this.wordPattern.test(_word)) {
            if (this.isConstant(_word)) {
                this.updateTree({
                    value: _word,
                    position: [..._wordPos],
                });
            }
            else {
                this.problems.push({
                    msg: `undefined word: ${_word}`,
                    position: [..._wordPos],
                    code: ErrorCode.UndefinedWord
                });
                this.updateTree({
                    name: _word,
                    position: [..._wordPos],
                });
            }
        }
        else {
            this.problems.push({
                msg: `"${_word}" is not a valid rainlang word`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            this.updateTree({
                name: _word,
                position: [..._wordPos],
            });
        }
        return exp;
    }

    /**
     * @internal Method to check for errors in parse tree once an expression is fully parsed
     */
    private errorCheck(node: ExpressionASTNode): boolean {
        if (this.problems.length) return false;
        if ("opcode" in node) {
            if (isNaN(node.operand) || isNaN(node.output)) return false;
            else {
                for (const param of node.parameters) {
                    if (!this.errorCheck(param)) return false;
                }
                return true;
            }
        }
        else return true;
    }

    /**
     * @internal Method to count outputs of nodes in a parse tree
     */
    private countOutputs(nodes: ExpressionASTNode[], skip?: number): number {
        let _count = 0;
        if (skip) nodes = nodes.slice(skip - nodes.length);
        for (const _node of nodes) {
            if ("opcode" in _node) {
                if (!isNaN(_node.output)) _count = _count + _node.output;
                else return NaN;
            }
            if ("value" in _node || "name" in _node) _count++;
        }
        return _count;
    }

    /**
     * @internal Method to get ExpressionConfig (bytes) from RDNode or parse tree object
     */
    private _compile(
        parseTree:
            | ExpressionASTNode
            | ExpressionASTNode[][]
            | SourceASTNode[],
        constants: BigNumberish[] = [],
        sourceIndex = 0
    ): ExpressionConfig | undefined {
        const _sources: BytesLike[] = [];
        let _sourcesCache: BytesLike[] = [];
        let _nodes: ExpressionASTNode[][] = [];

        if (this.problems.length) return undefined;

        // convertion to a standard format
        if ("position" in parseTree) _nodes = [[parseTree]];
        else {
            if (parseTree.length === 0) return undefined;
            for (let i = 0; i < parseTree.length; i++) {
                const _item = parseTree[i];
                if (_item) {
                    if (Array.isArray(_item)) _nodes.push(_item as ExpressionASTNode[]);
                    else _nodes.push(_item.nodes as ExpressionASTNode[]);
                }
                else _nodes.push([]);
            }
        }   

        // check for errors
        for (let i = 0; i < _nodes.length; i++) {
            for (let j = 0; j < _nodes[i].length; j++) {
                if (!this.errorCheck(_nodes[i][j])) return undefined;
            }
        }

        // compile from parsed tree
        try {
            for (let i = 0; i < _nodes.length; i++) {
                if (_nodes[i].length === 0) _sourcesCache = [];
                for (const _node of _nodes[i]) {
                    if (i > sourceIndex) sourceIndex = i;
                    if ("value" in _node) {
                        if (isBigNumberish(_node.value)) {
                            if (constants.includes(_node.value)) {
                                _sourcesCache.push(
                                    op(
                                        this.names.indexOf("read-memory"),
                                        memoryOperand(
                                            constants.indexOf(_node.value),
                                            MemoryType.Constant,
                                        )
                                    )
                                );
                            }
                            else {
                                _sourcesCache.push(
                                    op(
                                        this.names.indexOf("read-memory"),
                                        memoryOperand(constants.length, MemoryType.Constant)
                                    )
                                );
                                constants.push(_node.value);
                            }
                        }
                        else if (this.isConstant(_node.value)) {
                            const _i = constants.findIndex(
                                v => BigNumber.from(this.constants[_node.value]).eq(v)
                            );
                            if (_i > -1) {
                                _sourcesCache.push(
                                    op(
                                        this.names.indexOf("read-memory"),
                                        memoryOperand(_i, MemoryType.Constant)
                                    )
                                );
                            }
                            else {
                                _sourcesCache.push(
                                    op(
                                        this.names.indexOf("read-memory"),
                                        memoryOperand(constants.length, MemoryType.Constant)
                                    )
                                );
                                constants.push(
                                    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                                );
                            }
                        }
                    }
                    else if ("name" in _node) {
                        const _i = this.parseAliases[sourceIndex].findIndex(
                            v => v.name === _node.name
                        );
                        if (_i > -1) _sourcesCache.push(
                            op(
                                this.names.indexOf("read-memory"),
                                memoryOperand(_i, MemoryType.Stack)
                            )
                        );
                        else throw new Error(`cannot find "${_node.name}"`);
                    }
                    else {
                        for (const _p of _node.parameters) {
                            const _expConf = this._compile(
                                _p,
                                constants,
                                sourceIndex
                            );
                            _sourcesCache.push(..._expConf!.sources);
                        } 
                        let _ctx: ContextAlias | undefined;
                        const _index = this.names.indexOf(_node.opcode.name);
                        if (_index >= this.opmetaLength) _ctx = this.ctxAliases.find(
                            v => v.name === _node.opcode.name
                        );
                        _sourcesCache.push(
                            op(
                                _ctx ? this.names.indexOf("context") : _index, 
                                _ctx
                                    ? isNaN(_ctx.row)
                                        ? constructByBits([
                                            {
                                                value: _ctx.column,
                                                bits: [8, 15]
                                            },
                                            {
                                                value: _node.operand,
                                                bits: [0, 7]
                                            }
                                        ])
                                        : constructByBits([
                                            {
                                                value: _ctx.column,
                                                bits: [8, 15]
                                            },
                                            {
                                                value: _ctx.row,
                                                bits: [0, 7]
                                            }
                                        ])
                                    : _node.operand 
                            )
                        );
                    }
                }
                _sources.push(concat(_sourcesCache));
                _sourcesCache = [];
            }
            return {
                constants,
                sources: _sources.length 
                    ? _sources.map(
                        v => hexlify(v, { allowMissingPrefix: true })
                    ) 
                    : []
            };
        }
        catch (_err) {
            console.log(_err);
            return undefined;
        }
    }
}
