import { format } from 'prettier';
import { deflateSync } from 'zlib';
import { ErrorCode, TextDocument } from '../rainLanguageTypes';
import { BigNumberish, BytesLike, ethers } from 'ethers';
import OpMetaSchema from "../schema/op.meta.schema.json";
import { ExpressionConfig } from '../compiler/expressionConfigTypes';
import { 
    RDNode, 
    RDOpNode, 
    RDProblem, 
    RDComment, 
    RDParseTree,
    RDAliasNode,
    RainParseState, 
    RainDocumentResult
} from './rainParserTypes';
import { 
    OpMeta,
    InputMeta,
    InputArgs,
    MemoryType,
    OutputMeta,
    OperandArgs,
    OperandMeta,
    ComputedOutput
} from './opMetaTypes';
import {
    op,
    concat,
    hexlify,
    deepCopy,
    extractByBits,
    metaFromBytes,
    memoryOperand,
    isBigNumberish,
    constructByBits
} from '../utils';


/**
 * @public
 * RainDocument is a wrapper for RainParser that provides the main functionalities 
 * and data types in order to be used later on to provide Rain Language Services or in 
 * Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes)
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
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string
     */
    constructor(textDocument: TextDocument, opmeta: Uint8Array | string) {
        this._rp = new RainParser(textDocument, opmeta);
    }

    /**
     * @public Method to update the RainDocument with new text or opmeta and get the parse results
     * @param newTextDocument - (optional) Raw text to parse
     * @param newOpMeta - (optional) Ops meta as bytes ie hex string or Uint8Array or json content as string
     * @returns RainDocument results
     */
    public update(
        newTextDocument?: TextDocument,
        newOpMeta?: Uint8Array | string
    ): RainDocumentResult {
        if (newOpMeta && newTextDocument) {
            this._rp.updateText(newTextDocument, false);
            this._rp.updateOpMeta(newOpMeta);
        }
        else if (newOpMeta && !newTextDocument) {
            this._rp.updateOpMeta(newOpMeta);
        }
        else if (!newOpMeta && newTextDocument) {
            this._rp.updateText(newTextDocument);
        }
        else this._rp.parse();
        return this._rp.getParseResult();
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
     * @public Get the parsed exp aliases of this RainParser instance
     */
    public getLHSAliases(): RDAliasNode[][] {
        return deepCopy(this._rp.getLHSAliases());
    }
    
    /**
     * @public Get the current sub-exp aliases of this RainParser instance
     */
    public getCurrentLHSAliases(): RDAliasNode[] {
        return deepCopy(this._rp.getCurrentLHSAliases());
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
 * Rain Parser is a parser written in TypeScript in order to parse a text document using an op meta
 * into known types which later will be used in RainDocument object and Rain Language Services
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
        opmetaError: true
    };

    /**
     * @public Constructs a new RainParser object
     * @param textDocument - (optional) Raw text to parse (can be updated at any time after instantiation)
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string
     */
    constructor(textDocument: TextDocument, opmeta: Uint8Array | string) {
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
                    msg: [
                        `Runtime Error: `,
                        (runtimeError as Error).message,
                        (runtimeError as Error).stack?.split(/\n+/)
                    ].join(""),
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
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string
     * @param parse - Parse if the provided op meta vas valid
     * @return true if the new opmeta is valid and different than existing one
     */
    public updateOpMeta(opmeta: Uint8Array | string, parse = true) {
        let _newOpMetaBytes = "";
        if (isBigNumberish(opmeta)) _newOpMetaBytes = hexlify(
            opmeta, 
            { allowMissingPrefix: true }
        );
        else {
            try {
                _newOpMetaBytes = hexlify(
                    Uint8Array.from(
                        deflateSync(
                            format(
                                JSON.stringify(JSON.parse(opmeta as string), null, 4), 
                                { parser: "json" }
                            )
                        )
                    ), 
                    { allowMissingPrefix: true }
                );
            }
            catch {
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
                this.state.opmetaError = true;
                this.state.parse.expAliases = [];
            }
        }
        if (_newOpMetaBytes && _newOpMetaBytes !== this.rawOpMeta) {
            try {
                this.opmeta = metaFromBytes(_newOpMetaBytes, OpMetaSchema) as OpMeta[];
                this.rawOpMeta = _newOpMetaBytes;
                this.state.opmetaError = false;
                this.names = this.opmeta.map(v => v.name);
                this.opAliases = this.opmeta.map(v => v.aliases);
                this.pops = this.opmeta.map(v => v.inputs);
                this.pushes = this.opmeta.map(v => v.outputs);
                this.operand = this.opmeta.map(v => v.operand);
                this.opAliases = this.opmeta.map(v => v.aliases);
            }
            catch {
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
                this.state.opmetaError = true;
                this.state.parse.expAliases = [];
                this.rawOpMeta = _newOpMetaBytes;
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

        if (this.state.opmetaError) this.problems.push({
            msg: "invalid op meta",
            position: [0, this.textDocument.getText().length - 1],
            code: ErrorCode.UndefinedOpMeta
        });
        else {
            // start parsing if the string is not empty
            if (document.length) {

                // ----------- remove indents -----------
                document = document.replace(/\n/g, ' ');

                // // ----------- convert html &nbps to standard whitespace -----------
                // document = document.replace(/&nbsp/g, ' ');

                // ----------- extract comments if any exists -----------
                if(document.includes('/*')) {
                    while(document.includes('/*')) {
                        const _startCmPos = document.indexOf('/*');
                        this.state.track.char = _startCmPos;
                        let _endCmPos = document.length - 1;
                        let _cm = document.slice(_startCmPos);
                        let _notEnded = true;
                        if (_cm.includes('*/')) {
                            _endCmPos = _cm.indexOf('*/') + _startCmPos;
                            this.state.track.char = _endCmPos;
                            _cm = document.slice(_startCmPos, _endCmPos + 2);
                            _notEnded = false;
                        }
                        document = _notEnded 
                            ? document.slice(0, _startCmPos) 
                                + ' ' .repeat(_cm.length) 
                            : document.slice(0, _startCmPos) 
                                + ' ' .repeat(_cm.length) 
                                + document.slice(_endCmPos + 2);
                    
                        if (_notEnded) {
                            this.problems.push({
                                msg: 'unexpected end of comment',
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

                // ----------- begin caching expression sentences -----------
                const _doc = document;
                const _sourceExp: string[] = [];
                const _sourceExpPos: [number, number][] = [];
                while (document.length) {
                    if (document.includes(';')) {
                        const tmp = document.slice(0, document.indexOf(';'));
                        _sourceExpPos.push([
                            _doc.length - document.length,
                            _doc.length - document.length + document.indexOf(';'),
                        ]);
                        document = document.slice(document.indexOf(';') + 1);
                        _sourceExp.push(tmp);
                    }
                    else {
                        if (document.match(/[^\s+]/)) {
                            _sourceExpPos.push([
                                _doc.length - document.length,
                                _doc.length - 1,
                            ]);
                            _sourceExp.push(document);
                        }
                        document = '';
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
                    while (_exp.includes(',')) {
                        _subExp.push(_exp.slice(0, _exp.indexOf(',')));
                        _subExpEntry.push(_sourceExp[i].length - _exp.length);
                        _exp = _exp.slice(_exp.indexOf(',') + 1);
                    }
                    if (_exp.length) {
                        _subExp.push(_exp);
                        _subExpEntry.push(_sourceExp[i].length - _exp.length);
                    }

                    // ----------- begin parsing sub-expressions -----------
                    for (let j = 0; j < _subExp.length; j++) {
                        this.resetState();
                        const _positionOffset = _sourceExpPos[i][0] + _subExpEntry[j];
                        this.state.track.char = _positionOffset;

                        // check for LHS/RHS delimitter, exit from parsing this sub-expression if 
                        // no or more than one delimitter was found, else start parsing LHS and RHS
                        if (_subExp[j].match(/:/g)?.length === 1) {
                            _lhs = _subExp[j].slice(0, _subExp[j].indexOf(':'));
                            this.exp = _subExp[j].slice(_subExp[j].indexOf(':') + 1);

                            // ----------- check for invalid RHS comments -----------
                            for (let k = 0; k < this.comments.length; k++) {
                                if (
                                    this.comments[k].position[0] > _positionOffset + 
                                        _subExp[j].indexOf(':') &&
                                    this.comments[k].position[0] < _positionOffset + 
                                        _subExp[j].length
                                ) {
                                    this.problems.push({
                                        msg: 'invalid RHS, comments are not allowed',
                                        position: [
                                            _positionOffset + _subExp[j].indexOf(':') + 1,
                                            _positionOffset + _subExp[j].length - 1
                                        ],
                                        code: ErrorCode.UnexpectedRHSComment
                                    });
                                }
                            }

                            // ----------- begin parsing LHS -----------
                            if (_lhs.length > 0) {
                                const _aliases: string[] = [];
                                const _aliasesPos: [number, number][] = [];
                                const _parsed = this.simpleParse(_lhs, _positionOffset);
                                _aliases.push(..._parsed.words);
                                _aliasesPos.push(..._parsed.positions);
                                for (let k = 0; k < _aliases.length; k++) {
                                    this.state.parse.subExpAliases.push({
                                        name: _aliases[k],
                                        position: _aliasesPos[k]
                                    });
                                    if (!_aliases[k].match(/^[a-z][a-z0-9-]*$|_/)) {
                                        this.problems.push({
                                            msg: `invalid LHS alias: ${_aliases[k]}`,
                                            position: _aliasesPos[k],
                                            code:ErrorCode.InvalidWordPattern
                                        });
                                    }
                                    this.state.track.char = _aliasesPos[k][1];
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
                                else if (this.exp.startsWith('(')) {
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
                                else if (this.exp.startsWith(')')) {
                                    if (this.state.track.parens.open.length > 0) {
                                        this.state.track.parens.close.push(_currentPosition);
                                        this.resolveOpNode();
                                        this.state.depthLevel--;
                                    }
                                    else this.problems.push({
                                        msg: 'unexpected ")"',
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
                                if (j !== 0 || (j === 0 && _treeCount !== 0)) {
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
                                                        msg: `no LHS item exists to match this RHS item`,
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
                            if (_subExp[j].match(/[^\s+]/)) this.problems.push({
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
            v => v.msg === 'expected ")"' && 
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
        if (!this.exp.includes('>')) {
            this.state.operandArgsErr = true;
            this.problems.push({
                msg: 'expected ">"',
                position: [pos, pos + this.exp.length - 1],
                code: ErrorCode.ExpectedClosingOperandArgBracket
            });
            if (op) if (!op.operandArgs) op.operandArgs = {
                position: [pos, pos + this.exp.length - 1],
                args: []
            };
            this.exp = '';
        }
        else {
            const _operandArgs = this.exp.slice(1, this.exp.indexOf('>'));
            this.exp = this.exp.slice(this.exp.indexOf('>') + 1);
            if (_operandArgs.search(/[^0-9\s]/) > -1) {
                if (op) this.state.operandArgsErr = true;
                const _erros = _operandArgs.match(/[^0-9\s]+/g)!;
                for (let i = 0; i < _erros.length; i++) {
                    this.problems.push({
                        msg: 'invalid argument pattern',
                        position: [
                            pos + _operandArgs.indexOf(_erros[i]) + 1,
                            pos + _operandArgs.indexOf(_erros[i]) + _erros[i].length,
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
                            msg: "invalid number of inputs",
                            position: [...node.position],
                            code: ErrorCode.MismatchInputs
                        });
                    }
                    else {
                        if (
                            "bits" in (this.pops[_index] as InputArgs) || 
                            "computation" in (this.pops[_index] as InputArgs)
                        ) this.problems.push({
                            msg: "invalid input meta format",
                            position: [...node.position],
                            code: ErrorCode.InvalidInputsMeta
                        });
                        else {
                            if (
                                node.parameters.length !== 
                                (this.pops[_index] as InputArgs).parameters.length
                            ) this.problems.push({
                                msg: "out-of-range inputs",
                                position: [...node.position],
                                code: ErrorCode.OutOfRangeInputs
                            });
                        }
                    }
                    if (typeof this.pushes[_index] !== "number") {
                        node.output = NaN;
                        this.problems.push({
                            msg: "invalid output meta format",
                            position: [...node.position],
                            code: ErrorCode.InvalidOutputsMeta
                        });
                    }
                }
                else {
                    let _argIndex = 0;
                    let _inputsIndex = -1;
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
                                value: node.operandArgs!.args[_argIndex++].value,
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
                                    position: [...node.operandArgs!.args[_operand[i]].position],
                                    code: ErrorCode.OutOfRangeOperandArgs
                                });
                                else this.problems.push({
                                    msg: "out-of-range operand argument",
                                    position: [...node.operandArgs!.args[_operand[i] - 1].position],
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
            if (node.output === 0 && this.state.depthLevel > 1) this.problems.push({
                msg: 'zero output opcodes cannot be nested',
                position: [...node.position],
                code: ErrorCode.InvalidNestedNode
            });
            if (node.output > 1 && this.state.depthLevel > 1) this.problems.push({
                msg: 'multi output opcodes cannot be nested',
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
        const _index = _tmp < 0 ? this.exp.length : _tmp;
        const _word = this.exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        this.state.track.char = entry + _word.length - 1;
        this.exp = this.exp.replace(_word, '');
        const _aliasIndex = this.state.parse.expAliases[
            this.state.parse.expAliases.length - 1
        ].findIndex(
            v => v.name === _word
        );

        if (_aliasIndex > -1) {
            if (!_word.match(this.wordPattern)) this.problems.push({
                msg: `invalid pattern for alias: ${_word}`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            if (this.state.parse.subExpAliases.find(
                v => v.name === _word
            )) this.problems.push({
                msg: `cannot reference self`,
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
            if (!isBigNumberish(_word)) {
                const _nums = _word.match(/\d+/g)!;
                _val = _nums[0] + "0".repeat(Number(_nums[1]));
            }
            if (ethers.constants.MaxUint256.lt(_val)) {
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
            if (_word === 'max-uint-256' || _word === 'max-uint256' || _word === 'infinity') {
                this.updateTree({
                    value: _word,
                    position: [..._wordPos],
                });
            }
            else {
                let _enum = this.names.indexOf(_word);
                if (_enum === -1) _enum = this.opAliases.findIndex(v => v?.includes(_word));
                let count = 0;
                if (_enum > -1 && typeof this.operand[_enum] !== "number") {
                    (this.operand[_enum] as OperandArgs).forEach(v => {
                        if (v.name !== "inputs") count++;
                    });
                }
                if (this.exp.startsWith('<') || this.exp.startsWith('(')) {
                    const _errIndex = this.problems.length;
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
                        this.exp = this.exp.replace('(', '');
                        this.state.track.parens.open.push(_pos);
                        _op.parens[0] = _pos;
                        this.updateTree(_op);
                        this.state.depthLevel++;
                        this.problems.push({
                            msg: 'expected ")"',
                            position: [[..._wordPos][0], _pos],
                            code: ErrorCode.ExpectedClosingParen
                        });
                    }
                    else {
                        if (_enum === -1) this.problems[_errIndex].position[1] = 
                            [..._op.operandArgs!.position][1];
                        else this.problems.push({
                            msg: 'expected "("',
                            position: [..._wordPos],
                            code: ErrorCode.ExpectedOpeningParen
                        });
                    }
                }
                else {
                    if (_enum === -1) this.problems.push({
                        msg: `undefined word: ${_word}`,
                        position: [..._wordPos],
                        code: ErrorCode.UndefinedWord
                    });
                    else {
                        this.problems.push({
                            msg: `expected "${_word}" opcode to be followed by ${
                                count > 0 ? "operand args and parens" : "parens"
                            }`,
                            position: [..._wordPos],
                            code: count > 0 
                                ? ErrorCode.ExpectedOpeningOperandArgBracket 
                                : ErrorCode.ExpectedOpeningParen
                        });
                    }
                }
            }   
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
        if ('opcode' in node) {
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
            if ('opcode' in _node) {
                if (!isNaN(_node.output)) _count = _count + _node.output;
                else return NaN;
            }
            if ('value' in _node || 'name' in _node) _count++;
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
                if ('value' in _node) {
                    if (isBigNumberish(_node.value)) {
                        if (constants.includes(_node.value)) {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(
                                        MemoryType.Constant,
                                        constants.indexOf(_node.value)
                                    )
                                )
                            );
                        }
                        else {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            );
                            constants.push(_node.value);
                        }
                    }
                    else if (_node.value === 'max-uint256' || _node.value === 'infinity') {
                        const _i = constants.findIndex(
                            v => ethers.constants.MaxUint256.eq(v)
                        );
                        if (_i > -1) {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, _i)
                                )
                            );
                        }
                        else {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            );
                            constants.push(
                                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                            );
                        }
                    }
                }
                else if ('name' in _node && !('opcode' in _node)) {
                    const _i = this.state.parse.expAliases[sourceIndex].findIndex(
                        v => v.name === _node.name
                    );
                    if (_i > -1) _sourcesCache.push(
                        op(
                            this.names.indexOf("read-memory"),
                            memoryOperand(MemoryType.Stack, _i)
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
console.log(JSON.stringify(new RainDocument(TextDocument.create("file", "a", 1, "_: add(1 2) debug()"), "0x789ced5d4b93dbb811beefaf40cd257622da23cdcedad9aa1cf691c75636f696ed2407970f100949aca1081a0035d6a6fcdfd3dd00df04458da4f18c4b077b34224834befefa01b08179ff0d63ff837f8c5da47c2d2ebe67179108652482d9f57717137b25123ac42b3fd315c6994ee25030b960f3d8682673839f39835bf01bb6e1492ed8139e6ecd2a4e974ca6ccac04d38687374f9f154f9599503c8de0c1efe98b42908630708f32ee8e862c3f423f711a894fcc4846ad98123cc2ee164aae9fd5ef4129b19b971336bdfee0beff3cf1f79a887469567dddbecad773a1caa143dfd82b7569a5e8edf872c25e94fdd2cf0f0e8438cd726a5348719171055218a1740d99ba94757464ae4271515efaec3ed9be3e1740e7c6753275dff024e65a500717a44bd236de45f7b40821521f21fe4a5798966bc18ccad3901b11596408919194004502909ca5e2b679c3992b27e4ca64b83d08b814e6306e8532db062308f6294b906157b336c17e435df194e5c0106486a511d1e525d3025961049bb2f9167ee8f877615be81ee25c1e05457afc78505ef680e2468b832d87ee85265cf1384de2f426c814c0d8c6e71dbf119afd4d80d5c128d95bc313f1c30286e27028c916de5003d0a826c3fba9782e7bad7898087ac61f34a35ea8a9bd09db2aa1f3c4b0398c2042c3ad7a3915ca0b10a6661bb501f3280271341a158a66c5a5e6a389ad51fc80d7e46ff511e5c0aa18068a9dc4e8da56dcb8ae6ee3246173a2591c1d661c56a15ec5f324e9d73679dbd888b5d36ee947496de085354668b27610d7ac98cee741d50025aaa955835e51cfb27ace5e4ed729badf915d8d71a016a500adb7cf8ba6a5172de0ece9ebdbbad31ce8cbc2125030e8ebcc4609472e8721faed3cf5c588e9585fdd80a578d85e5641cf6c5256671852e022445f319a8d1d992af83ef7107501811ded01fdd522f53356a6467c326dd2fe926aa18066e0c55d0b160a302272e21577e7db32268732c9d7a965b3bcb5242fb8b80f35ed7376c6d801ba40f7bb73837ebd5f767dc0306e41d55917bbb1d0e1970ebe3a6c4d2cf737f22e928584a55ce3b03e623e83708df7bf1eec2331cf976dd47ff8f11766735eeb28456a6255f7b1895c6af0c085d35c71156184002cb44cc45ec8ae31f8f7e04a822d51a5ed16355c2ff7e6e0658f79c368d0b24be9cb8f015ef1597b2483db559c7432923736fed035004a669831543edcc62d03812c2da60816d71c404e2cd1a318bd0d20ac1990e198d1a8f63d05f0373c5de27deff1329874bd4128d7f02c4a0428f1504b16b06941b94715645a43a1d9c89f602c278e423bf2b052d3fd5958791991aae834dee6fb41f14639cb66ff1405d049db641f91fff6d8a0a78b854ca2c013447f136a21d51a2d0b41803c1cf34326376055361fa4fe6ce28ebf177e19bc24648c9908e3458c53f32dc36ed0aff032ce6a372776bf5b7ae2936ee308d2c738adc2885ae66b70871a6fb213dfcaa8a11df676247b9dcec64ec049cae1ccd18e8ca6e0d6256d1ab9bfc7d606fa74baf247454212bac34913d9b973850f27796da4e723dd8a53ca03cb5eeb54e9cd5f41595ec35e8a8eb1bdc1551ace6ec4f6b95d6fc878ac6cb442b382f9b2018b918a2f051a54a6e4262eb32fb8ab357db64b06279a294377fdeeb390c5d1a13998c31327a473d0f187bf22c9cbc9674ab3678d1841c04780da53d7c6acd414103626a694ebee9fb1927cbba794d8ec40f7739e001f949b3c0c17323c01a6bc0327bf5279fd088a11acc55aaa6ddb2aecb20dcc7f91f9a51f014e5320558a8395aaba41580b41b3886902c868fdface4b34669bf5120bbf2f548de24fdab28154f5deda5abc1c671e639846c8b805f25e73bcdb8cbb4797d4834f89ba1b0cfeab40b66e34a8cd602a27764b6d4953ed40714aff5fd17e47c6bde7e275df649186e8c56fc5f5aa0de03fe03bf604e6931023cd16700c437e33bbfeeea95bccef45b2bdf87cbc49e08b814920b06c760db3c0fd1dda8b2fecd07c615aa830984eafaf83394f780a8e5f2edafaf9bb3004b46b416f7253f6d7373fe17d6093a81dfb1d0f4309d3f43d1dd371784e72046ef57f3ce39dc87bbcf5a27e0e5dda6fc3ee9f5676f5031f4dd8b1a2969674af9a203e31badb5db783b791c4b688a323c69583edccbfdaf2c42db73c65cfd9ac5c7369d8e3f044bf15cdc71a6f5b0c5a2af9239b3dbdfb7ac981cc3dc2424bc9e93b3b1a0fb78169a3183ebbbc8bff995d7e7ddee78ebea4027017ce461a9e043acfb2a493871648dbab3d403f2468ef8e941bfc0ea074ca33bd92a6ee797927fb2b2173adf7652962f0e5b13c76902cb13b469cecd1c568ddd5d93e467b8f82f95f0afc1176737d35bd0ae46d5a557e1450bf2d1376ba5c418cb7300cabd0736aca79d1c90a748a0eeee0520606fe6236bd4b0883dbce31cc51ad06e120c7b01d716800e816c7be02988f37ef28f11ba8e7d4b9eabeb8151f737ccd1d0bb3d64ff4d37211d0b8faa039d5788a098b9f89676c09d923d699991500febb50720253f50d41bd60a93ccfd877a8af6f714559157815374f647813d8f5605fa9085580e44a09e03fb52f5ebeef4dff71eb69aeaf80fada2139bd0e307c9df50bdf237b79c768f1bbd2760654173fc5a21b568e02fb6bff6e25f68d0c2c7d4815ae76126c49e76bfcf1aaa8ccacad7b5566f62566e3b3476b43bde5ecf9da5fb3126fc6e90a1ac69138abebf4eab2480f55868fd318349429166ad97a91b3da4eabb6ccba4df8319067acf9a721e5c1e5787d768af7a12e0735aa0c3e6262edd559dc79a9dfd0599c9e75764f3ab35093cee274506772300581cb677dddcfebb675ded9b3d1d00404ab384be2909fe3d4fd2945e7f321a5c0655a303a6be4bedc5aaefd051821eecd9abeec2e4ed015c6d922fe24229649d044adacfc158b4418af7942359ed397d5afb72ba1045c8fa94095168facb6f6db5baa649e628d5f5f25cbcf3067b7fcc10a166c586c86c5ef845252911c29c34160955b246fd367ec92fd85fd0c9f266c0a9ffe9df9b6835eeea85bafa831f10fa000a4770005586ec9c71666cc058aaa2cf251af70d3463968af742f5e8c66ee09f761f6ce14715c40b55d5c0cf69b3616558c3357c6d558469b63018cc88a3640d43a9f4bd21ee06686f41cb5f4bc8895368dfad436f58eb8f6b6b776a74d175456d3b504af38b06389959acffc0fd502b71c749e7a776659e2b08b45469f76f36c0b5fc5e1497c5f5f34fb1a3de0114958ac019616b51fd38e44a182139646eeb79d54da9188562ecba5a4dbb3d73a9c305f89d722ee10ddf0d330d5e69d2293b73dbe2acfb094184d1ea974a7fc8bbaeb67072807924ab75733cf9e533fce656a36d3f6edb3c07d4b5ebe9c2c43f1eacd15bf4a27e97c7bf88b6aab92cefa4d193f52b4dcd7afffa5fb024929c9abfd14638f0909860c18f5629b352295edcec80768c4a3d5061f5e1dae389e76cca8eeadaddf48651ae07b562702bee94e922a5da732a37025c21b8d6f600d857ef129d658c79f8a09138916ee6db8a617b62d7fbd9fdacfb359f299031b42045f0a15c49d1a06bb1be4ca7f820729d1e9d0e99eb6474016577280f64cd417316c14b0ed1a6a6d291ebfbf52b6e5094b708636f6bea3330a8acdbd20ab400273b34750ccb8d678a489697b75afb5dad59b853b20a1e8bc06e973e4c27809163c4e8e2401f5be00a77860fc8efd2bc4e263ce93a074b5a5843f4164e4ca85ce8403d37af33f23c1778343a915d468b29de7d3dafe3c37b82de3e879f28f3c69718fc6f8fcf254b473e9d7be99d541988b8f7ecc37a2bb15acebd6477973daeb4de8ae09dd82b467af5ebb743caf8e38f9d4eaea9e02ac7bea77edce8efa0fe0b2a72fd54ca7b6b6dc99dea07768d4599956c24f8f7466e5eaae4e7bf2d93d9bd7d278f5106bb2808e47ab6740158a64193eefd55001160aea2fe0b80ef4fd3ab01104266e587ce7432d111038ef8bbad8d931783b50d2f58098dcd830ecd780e6868e974b97c140e9982b1623dccac33bbc1923209851f1256ef6b25598a509b8a59ea5c42dc873b9a1ba8bf294cdda9ef37384d8c3de408b567d0d856afbba1e2f0e95a1d5ee1858a72b5e1683e2abe5ba33211e30210697cbea2cf1be8f6ebd8b3eb2b6e789bc65f5a07956f07e0a46cd79f311a922a1e652de049b69b0e1807ab9dda11d6b3b5b45ca7b19dd78aa44a312b1d89fe09db7b6ce59fde57571eb7f66e303a7ddc6b16f5faf8bcd1d3683433c46f7d8dc7d31b6c77778d73ef9002af7d0bd1a2d8ad4b5d3bce4cf8071b977330b9458f33845d7e27691a41b01f959cf4124e4105c63a6defdf31526690b7b90216df0d07854d289d867e53dca4e4f7a927fd82310037fbbe9354c77a9d817d860d22380c48e6b2700f41397af72dd1f8b8a10030decd9fe6f71b9bb3cd5a47b02a93be109f7cb17d6d50c558f054387ca4e088920bd0c02bb7a6cc4b183193166dc6feb58063f43116f4467128320504bc6d7b40f0f08d4302bcc52ecadc41c6408ef3b37f5a162d50b82173cc8c7e2c516b302b72fd1512ce0c57ea3267cf6f8393be16e9b61b5b7b1342efb78b699faacf3fe26d66ea838d23b6e331daba64620b5f8eeb25b13432e42be3f93ca7b4ab5cd99b1450b6f7282f88c0a66d491cc3059e749b22d8edcc44297385cd13aedc3a921fd3061efaff0bfe9e5ee536e3d27ae9c246727b59cfec882e6b9aaee62eb8d1436c8c16bd9e5af534d2468c08e8423c94a6e22584815e0f783c5cce56c91a89ac06430f91af94c54fe96f83cddcde7ab7be63328ee1e4eaa422a3c6efeb7783d62ed248a179d17ea0dfe974d1936154ab849f6cc59c1a8ba7e1b7d7125c5bfa23217fed594c7fbc20557390863af2e4422421324a693b678763d53fba272b07a23406fa4e9bd78e9b17cc701ae25dc5d95bb167a84cc110fc35ec621a90b8fc93fc415d193faaa97ec08188cd8f6f63da337bb58d1c6d32debdc57d6c65f4dd874d4f9afbebf0150eb199b7c8fbbef26b45a8bc785e2bb96be7e5f4ed89f87cb6567a3360c3c9e3319940043274bef9c30d042946626e59102784c27d5da50811a86c2825b7cc9f1f0a6f1b6d7482a7b3a752118f94e4afd15748a1c3fe5bea73c8bb87190944e3650a4a751b64b0f280f65c6fbec5f44c233ad287d2846d5365932cd8e391f2563a093eaeb6950631cee99ca4a1ddbb2468b8387c83bfe26c4cb51a622d26850249146e304fa76d8b29a02edb0ab7d2ca84e15bff598b6f5d8db9ce9103f8c3c8ecd9886cdb87ee88fe8957d1d16e8ca11233e1356ffdd990845c06f3e7cf37f728a2a89").getResult()));