import { OpMetaSchema } from "..";
import { ErrorCode, TextDocument } from "../rainLanguageTypes";
import { ExpressionConfig } from "../compiler/expressionConfigTypes";
import { 
    OpMeta,
    InputMeta,
    InputArgs, 
    OutputMeta,
    OperandArgs,
    OperandMeta,
    ComputedOutput
} from "./opMetaTypes";
import { 
    RDNode, 
    RDOpNode, 
    RDProblem, 
    RDComment, 
    MemoryType, 
    RDParseTree,
    RDAliasNode,
    RainParseState, 
    RainDocumentResult
} from "./rainParserTypes";
import {
    op,
    concat,
    hexlify,
    deepCopy,
    BytesLike,
    CONSTANTS,  
    isBytesLike, 
    BigNumberish, 
    extractByBits,
    metaFromBytes,
    memoryOperand,
    isBigNumberish,
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
 * const myRainDocument = new RainDocument(text, opmeta)
 *
 * // to get the parse results after instantiation
 * const results = myRainDocument.getResult()
 *
 * // to get the parse results with new text or opmeta
 * const newResult = myRainDocument.update(newText, newOpmeta)
 * ```
 */
export class RainDocument {
    private _rp: RainParser;

    /**
     * @public constructor of RainDocument object
     * @param textDocument - Raw text to parse (can be updated at any time after instantiation)
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array
     */
    constructor(textDocument: TextDocument, opmeta: BytesLike) {
        this._rp = new RainParser(textDocument, opmeta);
    }

    /**
     * @public Method to update the RainDocument with new text or opmeta and get the parse results
     * @param newTextDocument - (optional) Raw text to parse
     * @param newOpMeta - (optional) Ops meta as bytes ie hex string or Uint8Array
     */
    public update(
        newTextDocument?: TextDocument,
        newOpMeta?: BytesLike
    ) {
        if (newOpMeta && newTextDocument) {
            if (newOpMeta !== this.getRawOpMeta()) {
                this._rp.updateText(newTextDocument, false);
                this._rp.updateOpMeta(newOpMeta);
            }
            else this._rp.updateText(newTextDocument);
        }
        else if (newOpMeta && !newTextDocument) {
            if (newOpMeta !== this.getRawOpMeta()) {
                this._rp.updateOpMeta(newOpMeta);
            }
        }
        else if (!newOpMeta && newTextDocument) {
            this._rp.updateText(newTextDocument);
        }
        else this._rp.parse();
    }

    /**
     * @public Get the current raw op meta of this RainDocument instance in hex string
     */
    public getRawOpMeta(): string {
        return this._rp.getRawOpMeta();
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
    public getParseTree(): RDParseTree {
        return this._rp.getParseTree();
    }

    /**
     * @public Get the current problems of this RainDocument instance
     */
    public getProblems(): RDProblem[] {
        return this._rp.getProblems();
    }

    /**
     * @public Get the current comments inside of the text of this RainDocument instance
     */
    public getComments(): RDComment[] {
        return this._rp.getComments();
    }

    /**
     * @public Get the current parse result of this RainDocument instance 
     * which consists of parse tree, problems, comments and expression aliases
     */
    public getResult(): RainDocumentResult {
        return this._rp.getParseResult();
    }

    /**
     * @public Get the current runtime error of this RainDocument instance
     */
    public getRuntimeError(): Error | undefined {
        return this._rp.getRuntimeError();
    }

    /**
     * @public Get the current runtime error of this RainDocument instance
     */
    public getOpMetaError(): Error | undefined {
        return this._rp.getOpMetaError();
    }

    /**
     * @public Get the parsed exp aliases of this RainParser instance
     */
    public getLHSAliases(): RDAliasNode[][] {
        return this._rp.getLHSAliases();
    }
    
    /**
     * @public Get the current sub-exp aliases of this RainParser instance
     */
    public getCurrentLHSAliases(): RDAliasNode[] {
        return this._rp.getCurrentLHSAliases();
    }

    /**
     * @public Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance.
     * This method should not be used directly, insteda the RainCompiler (rlc) should be used.
     * @param item - Optional item to get the ExpressionConfig for
     */
    public getExpressionConfig(
        item?:
            | RDNode
            | RDNode[][]
            | RDParseTree,
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
    public readonly wordPattern = /^[a-z][0-9a-z-]*$/;
    public readonly numericPattern = /^0x[0-9a-zA-Z]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/;
    
    private textDocument: TextDocument;
    private rawOpMeta = "";
    private opmeta: OpMeta[] = [];
    private parseTree: RDParseTree = [];
    private problems: RDProblem[] = [];
    private comments: RDComment[] = [];

    private names: string[] = [];
    private pops: InputMeta[] = [];
    private pushes: OutputMeta[] = [];
    private operand: OperandMeta[] = [];
    private opAliases: (string[] | undefined)[] = [];
    
    private exp = "";
    private state: RainParseState = {
        parse: {
            tree: [],
            expAliases: [],
            subExpAliases: []
        },
        track: {
            char: 0,
            parens: {
                open: [],
                close: []
            }
        },
        depthLevel: 0,
        operandArgsErr: false,
        runtimeError: undefined,
        opMetaError: undefined
    };

    /**
     * @public Constructs a new RainParser object
     * @param textDocument - (optional) Raw text to parse (can be updated at any time after instantiation)
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array
     */
    constructor(textDocument: TextDocument, opmeta: BytesLike) {
        // @TODO - add extract opmeta from text
        this.textDocument = textDocument;
        this.updateOpMeta(opmeta);
    }

    /**
     * @public
     * Parses this instance of RainParser
     */
    public parse() {
        if (this.textDocument.getText()) {
            try {
                this._parse();
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
    }

    /**
     * @public 
     * Updates the op meta of this RainParser instance if the provided op meta was different than existing one
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array
     * @param parse - Parse if the provided op meta vas valid
     * @return true if the new opmeta is valid and different than existing one
     */
    public updateOpMeta(opmeta: BytesLike, parse = true) {
        let _newOpMetaBytes = "";
        if (isBytesLike(opmeta)) _newOpMetaBytes = hexlify(
            opmeta, 
            { allowMissingPrefix: true }
        );
        else {
            this.exp = "";
            this.resetState();
            this.parseTree = [];
            this.problems = [];
            this.comments = [];
            this.rawOpMeta = "";
            this.opmeta = [];
            this.names = [];
            this.opAliases = [];
            this.pops = [];
            this.pushes = [];
            this.operand = [];
            this.opAliases = [];
            this.state.track.char = 0;
            this.state.parse.expAliases = [];
            this.state.opMetaError = new Error("op meta must be in valid bytes form");
        }
        if (_newOpMetaBytes && _newOpMetaBytes !== this.rawOpMeta) {
            try {
                this.opmeta = metaFromBytes(_newOpMetaBytes, OpMetaSchema) as OpMeta[];
                this.rawOpMeta = _newOpMetaBytes;
                this.state.opMetaError = undefined;
                this.names = this.opmeta.map(v => v.name);
                this.opAliases = this.opmeta.map(v => v.aliases);
                this.pops = this.opmeta.map(v => v.inputs);
                this.pushes = this.opmeta.map(v => v.outputs);
                this.operand = this.opmeta.map(v => v.operand);
                this.opAliases = this.opmeta.map(v => v.aliases);
            }
            catch (_err) {
                this.exp = "";
                this.resetState();
                this.parseTree = [];
                this.problems = [];
                this.comments = [];
                this.opmeta = [];
                this.names = [];
                this.opAliases = [];
                this.pops = [];
                this.pushes = [];
                this.operand = [];
                this.opAliases = [];
                this.state.track.char = 0;
                this.state.parse.expAliases = [];
                this.rawOpMeta = _newOpMetaBytes;
                this.state.opMetaError = typeof _err === "string"
                    ? new Error(_err)
                    : _err as Error;
            }
        }
        if (parse) this.parse();
    }

    /**
     * @public Update the text of this RainParser instance
     * @param text - The new text document to update
     * @param parse - Parse if the provided op meta vas valid
     */
    public updateText(textDocument: TextDocument, parse = true) {
        this.textDocument = textDocument;
        if (this.textDocument.getText() === "") {
            this.exp = "";
            this.resetState();
            this.parseTree = [];
            this.problems = [];
            this.comments = [];
            this.state.track.char = 0;
            this.state.parse.expAliases = [];
        }
        if (parse) this.parse();
    }

    /**
     * @public Get the current raw op meta of this RainParser instance
     */
    public getRawOpMeta(): string {
        return this.rawOpMeta;
    }

    /**
     * @public Get the current op meta of this RainParser instance
     */
    public getOpMeta(): OpMeta[] {
        return this.opmeta;
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
    public getParseTree(): RDParseTree {
        return deepCopy(this.parseTree);
    }

    /**
     * @public Get the current problems of this RainParser instance
     */
    public getProblems(): RDProblem[] {
        return deepCopy(this.problems);
    }

    /**
     * @public Get the current comments inside of the text of this RainParser instance
     */
    public getComments(): RDComment[] {
        return deepCopy(this.comments);
    }

    /**
     * @public Get the current runtime error of this RainParser instance
     */
    public getRuntimeError(): Error | undefined {
        return deepCopy(this.state.runtimeError);
    }

    /**
     * @public Get the current runtime error of this RainParser instance
     */
    public getOpMetaError(): Error | undefined {
        return deepCopy(this.state.opMetaError);
    }

    /**
     * @public Get the parsed exp aliases of this RainParser instance
     */
    public getLHSAliases(): RDAliasNode[][] {
        return deepCopy(this.state.parse.expAliases);
    }

    /**
     * @public Get the current sub-exp aliases of this RainParser instance
     */
    public getCurrentLHSAliases(): RDAliasNode[] {
        return deepCopy(this.state.parse.subExpAliases);
    }

    /**
     * @public Get the current parse result of this RainParser instance 
     * which consists of parse tree, problems, comments and expression aliases
     */
    public getParseResult(): RainDocumentResult {
        return {
            parseTree: deepCopy(this.parseTree),
            comments: deepCopy(this.comments),
            problems: deepCopy(this.problems)
        };
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
            | RDNode
            | RDNode[][]
            | RDParseTree,
    ): ExpressionConfig | undefined {
        if (this.problems.length) return undefined;
        if (items) return this._compile(items);
        else return this._compile(this.parseTree);
    }

    /**
     * Method to reset the parser state
     */
    private resetState = () => {
        this.state.parse.tree = [];
        this.state.parse.subExpAliases = [];
        this.state.track.parens.open = [];
        this.state.track.parens.close = [];
        this.state.depthLevel = 0;
        this.state.operandArgsErr = false;
    };

    /**
     * Method to find index of next element within the text
     */
    private findIndex = (str: string): number => {
        return str.search(/[()<> ]/g);
    };

    /**
     * Parse and extract words from a 1 liner string
     */
    private simpleParse = (str: string, offset: number) => {
        const _words: string[] = [];
        const _wordsPos: [number, number][] = [];
        let counter = 0;
        while (str.length) {
            if (str.startsWith(" ")) {
                str = str.slice(1);
                counter++;
            }
            else {
                const _i = str.indexOf(" ") > -1 
                    ? str.indexOf(" ")
                    : str.length;
                _words.push(str.slice(0, _i));
                _wordsPos.push([offset + counter, NaN]);
                counter = counter + _words[_words.length - 1].length;
                _wordsPos[_wordsPos.length - 1].pop();
                _wordsPos[_wordsPos.length - 1][1] = offset + counter - 1;
                str = str.slice(_i);
            }
        }
        return {
            words: _words, 
            positions: _wordsPos
        };
    };

    /**
     * The main workhorse of RainParser which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private _parse() {
        this.exp = "";
        this.resetState();
        this.parseTree = [];
        this.problems = [];
        this.comments = [];
        this.state.track.char = 0;
        this.state.parse.expAliases = [];
        let document = this.textDocument.getText();

        if (this.state.opMetaError) {
            this.problems.push({
                msg: "invalid op meta",
                position: [0, this.textDocument.getText().length - 1],
                code: ErrorCode.UndefinedOpMeta
            });
            this.problems.push({
                msg: `Op Meta Error: ${this.state.opMetaError.message}`,
                position: [0, this.textDocument.getText().length - 1],
                code: ErrorCode.UndefinedOpMeta
            });
        }
        else if (document.search(/[^ -~\s]/) > -1) {
            let _i = document.search(/[^ -~\s]/);
            while (_i > -1) {
                const _charCode = document.codePointAt(_i)!.toString(16).padStart(4, "0");
                const _char = _charCode.length > 4 
                    ? document[_i] + document[_i + 1] 
                    : document[_i];
                this.problems.push({
                    msg: _charCode.length > 4 
                        ? `found non-ASCII character: "${_char}"`
                        : `found non-printable-ASCII character with unicode: "U+${_charCode}"`,
                    position: _charCode.length > 4 
                        ? [_i, _i + 1]
                        : [_i, _i],
                    code: _charCode.length > 4 
                        ? ErrorCode.NonASCIICharacter
                        : ErrorCode.NonPrintableASCIICharacter
                });
                document = document.replace(
                    _charCode.length > 4 
                        ? document[_i] + document[_i + 1] 
                        : document[_i], 
                    " ".repeat(_charCode.length > 4 ? 2 : 1)
                );
                _i = document.search(/[^ -~\s]/);
            }
        }
        else {
            // start parsing if the string is not empty
            if (document.length) {

                // ----------- remove indents and tabs -----------
                document = document.replace(/\t/g, " ");
                document = document.replace(/\r\n/g, "  ");
                document = document.replace(/\r/g, " ");
                document = document.replace(/\n/g, " ");

                // ----------- extract comments if any exists -----------
                if(document.includes("/*")) {
                    while(document.includes("/*")) {
                        const _startCmPos = document.indexOf("/*");
                        this.state.track.char = _startCmPos;
                        let _endCmPos = document.length - 1;
                        let _cm = document.slice(_startCmPos);
                        let _notEnded = true;
                        if (_cm.includes("*/")) {
                            _endCmPos = _cm.indexOf("*/") + _startCmPos;
                            this.state.track.char = _endCmPos;
                            _cm = document.slice(_startCmPos, _endCmPos + 2);
                            _notEnded = false;
                        }
                        document = _notEnded 
                            ? document.slice(0, _startCmPos) 
                                + " " .repeat(_cm.length) 
                            : document.slice(0, _startCmPos) 
                                + " " .repeat(_cm.length) 
                                + document.slice(_endCmPos + 2);
                    
                        if (_notEnded) {
                            this.problems.push({
                                msg: "unexpected end of comment",
                                position: [_startCmPos, _endCmPos],
                                code: ErrorCode.UnexpectedEndOfComment
                            });
                        }
                        else {
                            this.comments.push({
                                comment: _cm,
                                position: [_startCmPos, _endCmPos + 1]
                            });
                        }
                    }
                }

                // ----------- begin caching expression sources -----------
                const _doc = document;
                const _sourceExp: string[] = [];
                const _sourceExpPos: [number, number][] = [];
                while (document.length) {
                    if (document.includes(";")) {
                        const tmp = document.slice(0, document.indexOf(";"));
                        _sourceExpPos.push([
                            _doc.length - document.length,
                            _doc.length - document.length + document.indexOf(";"),
                        ]);
                        document = document.slice(document.indexOf(";") + 1);
                        _sourceExp.push(tmp);
                    }
                    else {
                        if (document.match(/[^\s+]/)) {
                            this.problems.push({
                                msg: "source item expressions must end with semi",
                                position: [
                                    _doc.length - document.length,
                                    _doc.length - 1,
                                ],
                                code: ErrorCode.InvalidExpression
                            });
                            // _sourceExpPos.push([
                            //     _doc.length - document.length,
                            //     _doc.length - 1,
                            // ]);
                            // _sourceExp.push(document);
                        }
                        document = "";
                    }
                }

                // ----------- begin parsing expression sentences -----------
                for (let i = 0; i < _sourceExp.length; i++) {
                    this.resetState();
                    this.state.parse.expAliases.push([]);
                    const _subExp: string[] = [];
                    const _subExpEntry: number[] = [];
                    const _currentSourceTree: RDNode[] = [];
                    let _exp = _sourceExp[i];
                    let _lhs: string;

                    // ----------- cache the sub-expressions -----------
                    if (!_exp.includes(",")) {
                        _subExp.push(_exp);
                        _subExpEntry.push(_sourceExp[i].length - _exp.length);
                    }
                    while (_exp.includes(",")) {
                        _subExp.push(_exp.slice(0, _exp.indexOf(",")));
                        _subExpEntry.push(_sourceExp[i].length - _exp.length);
                        _exp = _exp.slice(_exp.indexOf(",") + 1);
                        if (!_exp.includes(",")) {
                            _subExp.push(_exp);
                            _subExpEntry.push(_sourceExp[i].length - _exp.length);
                        }
                    }

                    // ----------- begin parsing sub-expressions -----------
                    for (let j = 0; j < _subExp.length; j++) {
                        this.resetState();
                        const _positionOffset = _sourceExpPos[i][0] + _subExpEntry[j];
                        this.state.track.char = _positionOffset;

                        // check for LHS/RHS delimitter, exit from parsing this sub-expression if 
                        // no or more than one delimitter was found, else start parsing LHS and RHS
                        if (_subExp[j].match(/:/g)?.length === 1) {
                            _lhs = _subExp[j].slice(0, _subExp[j].indexOf(":"));
                            this.exp = _subExp[j].slice(_subExp[j].indexOf(":") + 1);

                            // ----------- check for invalid RHS comments -----------
                            for (let k = 0; k < this.comments.length; k++) {
                                if (
                                    this.comments[k].position[0] > _positionOffset + 
                                        _subExp[j].indexOf(":") &&
                                    this.comments[k].position[0] < _positionOffset + 
                                        _subExp[j].length
                                ) {
                                    this.problems.push({
                                        msg: "invalid RHS, comments are not allowed",
                                        position: [
                                            _positionOffset + _subExp[j].indexOf(":") + 1,
                                            _positionOffset + _subExp[j].length - 1
                                        ],
                                        code: ErrorCode.UnexpectedRHSComment
                                    });
                                }
                            }

                            // ----------- begin parsing LHS -----------
                            if (_lhs.length > 0) {
                                const { words, positions } = this.simpleParse(
                                    _lhs, 
                                    _positionOffset
                                );
                                for (let k = 0; k < words.length; k++) {
                                    this.state.parse.subExpAliases.push({
                                        name: words[k],
                                        position: positions[k]
                                    });
                                    if (!words[k].match(/^[a-z][a-z0-9-]*$|_/)) {
                                        this.problems.push({
                                            msg: `invalid LHS alias: ${words[k]}`,
                                            position: positions[k],
                                            code:ErrorCode.InvalidWordPattern
                                        });
                                    }
                                    this.state.track.char = positions[k][1];
                                }
                            }

                            // ----------- begin parsing RHS -----------
                            while (this.exp.length > 0) {
                                const _currentPosition = 
                                    _positionOffset + 
                                    _subExp[j].length - 
                                    this.exp.length;
                                this.state.track.char = _currentPosition;
                                
                                if (this.exp.startsWith(" ")) {
                                    this.exp = this.exp.slice(1);
                                    this.state.track.char++;
                                }
                                else if (this.exp.startsWith("(")) {
                                    this.exp = this.exp.slice(1);
                                    this.state.track.char++;
                                    let __exp = this.exp;
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
                                                : _currentPosition + this.exp.length
                                        ],
                                        code: ErrorCode.ExpectedOpcode
                                    });
                                    if (_index === -1) {
                                        this.state.track.char += (this.exp.length);
                                        this.exp = "";
                                    }
                                    else {
                                        this.exp = this.exp.slice(_index + 1);
                                        this.state.track.char +=  _index;
                                    }
                                }
                                else if (this.exp.startsWith(")")) {
                                    if (this.state.track.parens.open.length > 0) {
                                        this.state.track.parens.close.push(_currentPosition);
                                        this.resolveOpNode();
                                        this.state.depthLevel--;
                                    }
                                    else this.problems.push({
                                        msg: "unexpected \")\"",
                                        position: [_currentPosition, _currentPosition],
                                        code: ErrorCode.UnexpectedClosingParen
                                    });
                                    this.exp = this.exp.slice(1);
                                    this.state.track.char++;
                                    if (
                                        this.exp.length &&
                                        !this.exp.startsWith(" ") && 
                                        !this.exp.startsWith(")") && 
                                        !this.exp.startsWith(";") && 
                                        !this.exp.startsWith(",")
                                    ) this.problems.push({
                                        msg: "expected to be seperated by space",
                                        position: [_currentPosition, _currentPosition + 1],
                                        code: ErrorCode.ExpectedSpace
                                    });
                                }
                                else this.consume(_currentPosition);
                            }

                            // ----------- validating RHS against LHS -----------
                            const _outputCount = this.countOutputs(
                                [...this.state.parse.tree]
                            );
                            if (!isNaN(_outputCount)) {
                                const _tagsCount = this.state.parse.subExpAliases.length;
                                const _treeCount = this.state.parse.tree.length;
                                const _diff = _tagsCount - _outputCount;
                                const _tags = [...this.state.parse.subExpAliases];
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
                                                    _node.lhs = [];
                                                    _tags.splice(-_node.output).forEach(v => {
                                                        _node.lhs?.push(v);
                                                    });
                                                }
                                            }
                                            else _tags.splice(-1).forEach(v => {
                                                _node.lhs = v;
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
                                                    _node.lhs = [];
                                                    _tags.splice(-_node.output).forEach(v => {
                                                        _node.lhs?.push(v);
                                                    }); 
                                                }
                                            }
                                            else _tags.splice(-1).forEach(v => {
                                                _node.lhs = v;
                                            });
                                        }
                                    }
                                    else {
                                        let _c = -_diff;
                                        const _nodes = [...this.state.parse.tree];
                                        for (let k = 0; k < -_diff; k++) {
                                            if ("opcode" in _nodes[k]) {
                                                if ((_nodes[k] as RDOpNode).output > 0) {
                                                    const _node = _nodes[_nodes.length - 1];
                                                    this.problems.push({
                                                        msg: "no LHS item exists to match this RHS item",
                                                        position: _node.position,
                                                        code: ErrorCode.MismatchLHS
                                                    });
                                                    if ((_nodes[k] as RDOpNode).output > 1) {
                                                        if (_c >= (_nodes[k] as RDOpNode).output) {
                                                            _nodes.pop();
                                                            _c -= (_nodes[k] as RDOpNode).output;
                                                        }
                                                        k += ((_nodes[k] as RDOpNode).output - 1);
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
                                                        _node.lhs = [];
                                                        _tags.slice(-_node.output).forEach(v => {
                                                            _node.lhs?.push(v);
                                                        });
                                                    }
                                                }
                                                else _tags.slice(-1).forEach(v => {
                                                    _node.lhs = v;
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            // if (_subExp[j].match(/[^\s+]/)) 
                            this.problems.push({
                                msg: "invalid rain expression",
                                position: [
                                    _positionOffset,
                                    _positionOffset + _subExp[j].length - 1
                                ],
                                code: ErrorCode.InvalidExpression
                            });
                        }
                        _currentSourceTree.push(
                            ...this.state.parse.tree.splice(
                                -this.state.parse.tree.length
                            )
                        );
                        this.state.parse.expAliases[
                            this.state.parse.expAliases.length - 1
                        ].push(
                            ...[...this.state.parse.subExpAliases.splice(
                                -this.state.parse.subExpAliases.length
                            )]
                        );
                    }

                    // ----------- constructing final parse tree -----------
                    this.parseTree.push({
                        position: _sourceExpPos[i],
                        tree: _currentSourceTree.splice(-_currentSourceTree.length)
                    });
                }
            }
        }
    }

    /**
     * Method to resolve a valid closed node at current state of parsing
     */
    private resolveOpNode() {
        this.state.track.parens.open.pop();
        const _endPosition = this.state.track.parens.close.pop()!;
        let _nodes: RDNode[] = this.state.parse.tree;
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            _nodes = (_nodes[_nodes.length - 1] as RDOpNode).parameters;
        }
        const _node = _nodes[_nodes.length - 1] as RDOpNode;
        _node.position[1] = _endPosition;
        _node.parens[1] = _endPosition;
        const _i = this.problems.findIndex(
            v => v.msg === "expected \")\"" && 
            v.position[0] === _node.opcode.position[0] &&
            v.position[1] === _node.parens[0]
        );
        if (_i > -1) this.problems.splice(_i, 1);
        _nodes[_nodes.length - 1] = this.resolveOp(_node);
    }

    /**
     * Method to update the parse tree
     */
    private updateTree(node: RDNode, replace?: boolean) {
        let _nodes: RDNode[] = this.state.parse.tree;
        if (replace) {
            for (let i = 0; i < this.state.depthLevel - 1; i++) {
                _nodes = (_nodes[_nodes.length - 1] as RDOpNode).parameters;
            }
            _nodes.pop();
        }
        else {
            for (let i = 0; i < this.state.depthLevel; i++) {
                _nodes = (_nodes[_nodes.length - 1] as RDOpNode).parameters;
            }
        }
        _nodes.push(node);
    }

    /**
     * Method to handle operand arguments
     */
    private resolveOperand(pos: number, op?: RDOpNode, count = 0): RDOpNode | undefined {
        if (!this.exp.includes(">")) {
            this.state.operandArgsErr = true;
            this.problems.push({
                msg: "expected \">\"",
                position: [pos, pos + this.exp.length - 1],
                code: ErrorCode.ExpectedClosingOperandArgBracket
            });
            if (op) if (!op.operandArgs) op.operandArgs = {
                position: [pos, pos + this.exp.length - 1],
                args: []
            };
            this.exp = "";
        }
        else {
            const _operandArgs = this.exp.slice(1, this.exp.indexOf(">"));
            this.exp = this.exp.slice(this.exp.indexOf(">") + 1);
            if (_operandArgs.search(/[^0-9\s]/) > -1) {
                if (op) this.state.operandArgsErr = true;
                const _errors = _operandArgs.matchAll(/[^0-9\s]+/g);
                for (const _err of _errors) {
                    this.problems.push({
                        msg: "invalid argument pattern",
                        position: [
                            pos + _err.index! + 1,
                            pos + _err.index! + _err[0].length,
                        ],
                        code: ErrorCode.InvalidWordPattern
                    });
                }
            }
            else {
                if (!op) this.problems.push({
                    msg: "invalid syntax, operand args need to follow an opcode",
                    position: [pos, pos + _operandArgs.length + 1],
                    code: ErrorCode.ExpectedOpcode
                });
                else {
                    if (!op.operandArgs) op.operandArgs = {
                        position: [pos, pos + _operandArgs.length + 1],
                        args: []
                    };
                    if (op.opcode.name !== ("unknown opcode") && count === 0) {
                        this.state.operandArgsErr = true;
                        this.problems.push({
                            msg: `opcode ${op.opcode.name} doesn't have argumented operand`,
                            position: [pos, pos + _operandArgs.length + 1],
                            code: ErrorCode.MismatchOperandArgs
                        });
                    }
                    else {
                        const _parsed = this.simpleParse(_operandArgs, pos + 1);
                        const _args = _parsed.words;
                        const _argsPos: [number, number][] = _parsed.positions;
                        if (op.opcode.name === "unknown opcode") {
                            _args.forEach((v, i) => op.operandArgs?.args.push({
                                value: Number(v),
                                name: "unknown",
                                position: _argsPos[i]
                            }));
                        }
                        else {
                            const _opMetaOperandArgs = [...(this.operand[
                                this.names.indexOf(op.opcode.name)
                            ] as OperandArgs)];
                            const _i = _opMetaOperandArgs.findIndex(v => v.name === "inputs");
                            if (_i > -1) _opMetaOperandArgs.splice(_i, 1);
                            const _diff = _args.length - _opMetaOperandArgs.length;
                            if (_diff === 0) _opMetaOperandArgs.forEach(
                                (v, i) => op.operandArgs?.args.push({
                                    value: Number(_args[i]),
                                    name: v.name,
                                    description: v?.desc,
                                    position: _argsPos[i]
                                })
                            );
                            else if (_diff > 0) {
                                this.state.operandArgsErr = true;
                                for (let i = 0; i < _diff; i++) {
                                    this.problems.push({
                                        msg: `unexpected operand argument for ${op.opcode.name}`,
                                        position: [..._argsPos[_argsPos.length - 1 - i]],
                                        code: ErrorCode.MismatchOperandArgs
                                    });
                                }
                            }
                            else {
                                this.state.operandArgsErr = true;
                                this.problems.push({
                                    msg: `unexpected number of operand args for ${op.opcode.name}`,
                                    position: [pos, pos + _operandArgs.length + 1],
                                    code: ErrorCode.MismatchOperandArgs
                                });
                            }
                        } 
                    }
                }
            }
        }
        return op;
    }

    /**
     * Method that resolves the RDOpNode once its respective closing paren has consumed
     */
    private resolveOp = (node: RDOpNode): RDOpNode => {
        const _index = this.names.indexOf(node.opcode.name);
        if (_index !== -1) {
            if (typeof this.pushes[_index] === "number") {
                node.output = this.pushes[_index] as number;
            }
            if (this.state.operandArgsErr) {
                this.state.operandArgsErr = false;
                node.operand = NaN;
            } 
            else {
                if (this.operand[_index] === 0) {
                    node.operand = 0;
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
                    const _argsLength = (this.operand[_index] as OperandArgs).find(v => v.name === "inputs")
                        ? (this.operand[_index] as OperandArgs).length - 1
                        : (this.operand[_index] as OperandArgs).length;
                    if (_argsLength === (node.operandArgs?.args.length ?? 0)) {
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
                            for (let i = 0; i < _operand.length; i++) {
                                if (_inputsIndex > -1) {
                                    if (_operand[i] === _inputsIndex) this.problems.push({
                                        msg: "out-of-range inputs",
                                        position: [...node.parens],
                                        code: ErrorCode.OutOfRangeInputs
                                    });
                                    else if (_operand[i] < _inputsIndex) this.problems.push({
                                        msg: "out-of-range operand argument",
                                        position: [
                                            ...node.operandArgs!.args[_operand[i]].position
                                        ],
                                        code: ErrorCode.OutOfRangeOperandArgs
                                    });
                                    else this.problems.push({
                                        msg: "out-of-range operand argument",
                                        position: [
                                            ...node.operandArgs!.args[_operand[i] - 1].position
                                        ],
                                        code: ErrorCode.OutOfRangeOperandArgs
                                    });
                                }
                                else this.problems.push({
                                    msg: "out-of-range operand argument",
                                    position: [...node.operandArgs!.args[_operand[i]].position],
                                    code: ErrorCode.OutOfRangeOperandArgs
                                });
                            }
                        }
                    }
                }
            }
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
     * Method that consumes the words from the text and updates the parse tree
     */
    private consume(entry: number): void {
        const _tmp = this.findIndex(this.exp);
        const _index = _tmp < 0 ? this.exp.length : _tmp === 0 ? 1 : _tmp;
        const _word = this.exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        this.state.track.char = entry + _word.length - 1;
        this.exp = this.exp.replace(_word, "");
        const _aliasIndex = this.state.parse.expAliases[
            this.state.parse.expAliases.length - 1
        ].findIndex(
            v => v.name === _word
        );

        if (this.exp.startsWith("(") || this.exp.startsWith("<")) {
            if (!_word.match(this.wordPattern)) this.problems.push({
                msg: `invalid word pattern: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            let _enum = this.names.indexOf(_word);
            if (_enum === -1) _enum = this.opAliases.findIndex(v => v?.includes(_word));
            let count = 0;
            if (_enum > -1 && typeof this.operand[_enum] !== "number") {
                (this.operand[_enum] as OperandArgs).forEach(v => {
                    if (v.name !== "inputs") count++;
                });
            }
            if (_enum === -1) {
                this.problems.push({
                    msg: `unknown opcode: "${_word}"`,
                    position: [..._wordPos],
                    code: ErrorCode.UnknownOp
                });
            }
            let _op: RDOpNode = {
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
            if (this.exp.startsWith("<")) _op = 
                this.resolveOperand(entry + _word.length, _op, count)!;
            else if (count) {
                this.problems.push({
                    msg: `expected operand arguments for opcode ${_op.opcode.name}`,
                    position: [..._wordPos],
                    code: ErrorCode.ExpectedOperandArgs
                });
                this.state.operandArgsErr = true;
            }
            if (this.exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._wordPos][1] + 1;
                this.exp = this.exp.replace("(", "");
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
        else if (_aliasIndex > -1) {
            if (!_word.match(this.wordPattern)) this.problems.push({
                msg: `invalid pattern for alias: ${_word}`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            if (this.state.parse.subExpAliases.find(
                v => v.name === _word
            )) this.problems.push({
                msg: "cannot reference self",
                position: [..._wordPos],
                code: ErrorCode.InvalidSelfReferenceLHS
            });
            else this.updateTree({
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
        else if (_word.match(this.wordPattern)) {
            if (_word === "max-uint-256" || _word === "max-uint256" || _word === "infinity") {
                this.updateTree({
                    value: _word,
                    position: [..._wordPos],
                });
            }
            else this.problems.push({
                msg: `undefined word: ${_word}`,
                position: [..._wordPos],
                code: ErrorCode.UndefinedWord
            });
        }
        else this.problems.push({
            msg: `"${_word}" is not a valid rainlang word`,
            position: [..._wordPos],
            code: ErrorCode.InvalidWordPattern
        });
    }

    /**
     * Method to check for errors in parse tree once an expression is fully parsed
     */
    private _errorCheck(node: RDNode): boolean {
        if (this.problems.length) return false;
        if ("opcode" in node) {
            if (isNaN(node.operand) || isNaN(node.output)) return false;
            else {
                for (let i = 0; i < node.parameters.length; i++) {
                    if (!this._errorCheck(node.parameters[i])) return false;
                }
                return true;
            }
        }
        else return true;
    }

    /**
     * Method to count outputs of nodes in a parse tree
     */
    private countOutputs(nodes: RDNode[], skip?: number): number {
        let _count = 0;
        if (skip) nodes = nodes.slice(skip - nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            const _node = nodes[i];
            if ("opcode" in _node) {
                if (!isNaN(_node.output)) _count = _count + _node.output;
                else return NaN;
            }
            if ("value" in _node || "name" in _node) _count++;
        }
        return _count;
    }

    /**
     * Method to get ExpressionConfig (bytes) from RDNode or parse tree object
     */
    private _compile(
        parseTree:
            | RDNode
            | RDNode[][]
            | RDParseTree,
        constants: BigNumberish[] = [],
        sourceIndex = 0
    ): ExpressionConfig | undefined {
        const _sources: BytesLike[] = [];
        let _sourcesCache: BytesLike[] = [];
        let _nodes: RDNode[][] = [];

        if (this.problems.length) return undefined;

        // convertion to a standard format
        if ("position" in parseTree) _nodes = [[parseTree]];
        else {
            if (parseTree.length === 0) return undefined;
            for (let i = 0; i < parseTree.length; i++) {
                const _item = parseTree[i];
                if (_item) {
                    if (Array.isArray(_item)) _nodes.push(_item as RDNode[]);
                    else _nodes.push(_item.tree as RDNode[]);
                }
                else _nodes.push([]);
            }
        }   

        // check for errors
        for (let i = 0; i < _nodes.length; i++) {
            for (let j = 0; j < _nodes[i].length; j++) {
                if (!this._errorCheck(_nodes[i][j])) return undefined;
            }
        }

        // compile from parsed tree
        for (let i = 0; i < _nodes.length; i++) {
            if (_nodes[i].length === 0) _sourcesCache = [];
            for (let j = 0; j < _nodes[i].length; j++) {
                if (i > sourceIndex) sourceIndex = i;
                const _node = _nodes[i][j];
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
                    else if (_node.value === "max-uint256" || _node.value === "infinity") {
                        const _i = constants.findIndex(
                            v => CONSTANTS.MaxUint256.eq(v)
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
                else if ("name" in _node && !("opcode" in _node)) {
                    const _i = this.state.parse.expAliases[sourceIndex].findIndex(
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
                    for (let i = 0; i < (_node as RDOpNode).parameters.length; i++) {
                        const _expConf = this._compile(
                            (_node as RDOpNode).parameters[i],
                            constants,
                            sourceIndex
                        );
                        _sourcesCache.push(..._expConf!.sources);
                    } 
                    _sourcesCache.push(op(
                        this.names.indexOf((_node as RDOpNode).opcode.name),
                        (_node as RDOpNode).operand
                    ));
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
}
