import { MetaStore } from "../dotrain/metaStore";
import { Problem, Comment, ASTNode, OpASTNode, RainlangAST, Namespace, ContextAlias, Binding } from "../rainLanguageTypes";
import { 
    OpMeta, 
    InputArgs, 
    OperandArgs, 
    // OpMetaSchema, 
    metaFromBytes, 
    ComputedOutput, 
    toOpMeta
} from "@rainprotocol/meta";
import { 
    ErrorCode, 
    WORD_PATTERN, 
    ILLEGAL_CHAR, 
    AliasASTNode, 
    PositionOffset, 
    NUMERIC_PATTERN 
} from "../rainLanguageTypes";
import {
    trim,
    deepCopy,
    CONSTANTS,
    extractByBits, 
    inclusiveParse,
    exclusiveParse,
    constructByBits, 
    fillIn,
    toConvNumber
} from "../utils";



/**
 * @public
 * Rainlang class is a the main workhorse that does all the heavy work of parsing a document, 
 * written in TypeScript in order to parse a text document using an op meta into known types 
 * which later will be used in RainDocument object and Rain Language Services and Compiler
 */
export class Rainlang {

    // public readonly dotrainMode: boolean;
    public readonly constants: Record<string, string> = {
        "infinity"      : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint256"   : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "max-uint-256"  : "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    };

    private text: string;
    private ast: RainlangAST = [];
    private problems: Problem[] = [];
    private comments: Comment[] = [];
    private opmeta: OpMeta[] = [];
    // private expNames: string[] = [];
    private namespaces: Namespace = {};
    private binding?: Binding;
    private state: {
        nodes: ASTNode[];
        aliases: AliasASTNode[];
        parens: {
            open: number[];
            close: number[];
        };
        depth: number;
        runtimeError: Error | undefined;
    } = {
            nodes: [],
            aliases: [],
            parens: {
                open: [],
                close: []
            },
            depth: 0,
            runtimeError: undefined
        };

    /**
     * Constructor of Rainlang class
     * @param text - the text
     * @param opmeta - Array of ops metas
     * @param dotrainOptions - RainDocument (dotrain) only options
     */
    constructor(
        text: string,
        opmeta: OpMeta[],
        dotrainOptions?: { 
            // /**
            //  * Reserved constant values from RainDocument
            //  */
            // constants?: Record<string, string>;
            /**
             * Comments parsed from RainDocument
             */
            comments?: Comment[];
            /**
             * Array of expression names from corresponding RainDocument
             */
            // expressionNames?: string[],
            namespaces?: Namespace;
            /**
             * 
             */
            thisBinding?: Binding;
        }
    ) {
        this.text = text;
        this.opmeta = opmeta;
        // this.dotrainMode = false;
        if (dotrainOptions?.comments) {
            this.comments = dotrainOptions.comments;
            // this.dotrainMode = true;
        }
        // if (dotrainOptions?.constants) {
        //     this.constants = dotrainOptions.constants;
        //     this.isDotrain = true;
        // }
        // if (dotrainOptions?.expressionNames) {
        //     this.expNames = dotrainOptions.expressionNames;
        //     this.isDotrain = true;
        // }
        if (dotrainOptions?.namespaces) {
            this.namespaces = dotrainOptions.namespaces;
            // this.dotrainMode = true;
        }
        if (dotrainOptions?.thisBinding) this.binding = dotrainOptions.thisBinding;
        this.parse();
    }

    /**
     * Creates a new Rainlang instance with a opmeta hash
     * @param text - The text
     * @param opmetaHash - The op meta hash
     * @param metaStore - (optional) The MetaStore instance
     */
    public static async create(
        text: string, 
        opmetaHash: string, 
        metaStore?: MetaStore
    ): Promise<Rainlang> {
        if (!/^0x[a-fA-F0-9]{64}$/.test(opmetaHash)) throw "invalid opmeta hash";
        const _metaStore = metaStore ?? new MetaStore();
        let _record = _metaStore.getRecord(opmetaHash);
        if (!_record) {
            await _metaStore.updateStore(opmetaHash);
            _record = _metaStore.getRecord(opmetaHash);
            if (!_record) throw "cannot find settlement for provided opmeta hash";
        }
        const _opmeta = toOpMeta(metaFromBytes(_record.sequence[0].content));
        return new Rainlang(text, _opmeta);
    }

    /**
     * @public
     * Parses this instance of Rainlang
     */
    public parse() {
        try { this._parse(); }
        catch (runtimeError) {
            console.log(runtimeError);
            if (runtimeError instanceof Error) {
                this.state.runtimeError = runtimeError;
            }
            else this.state.runtimeError = new Error(runtimeError as string);
            this.problems.push({
                msg: `Runtime Error: ${
                    this.state.runtimeError.message
                }`,
                position: [0, -1],
                code: ErrorCode.RuntimeError
            });
        }
    }

    /**
     * @public Updates the text of this Rainlang instance and parse it right after that
     * @param newText - The new text
     */
    public updateText(newText: string) {
        this.text = newText;
        this.parse();
    }

    /**
     * @public Get the current text of this Rainlang instance
     */
    public getText(): string {
        return this.text;
    }

    /**
     * @public Get the current text of this Rainlang instance
     */
    public getOpMeta(): OpMeta[] {
        return deepCopy(this.opmeta);
    }

    /**
     * @public Get the current problems of this Rainlang instance
     */
    public getProblems(): Problem[] {
        return deepCopy(this.problems);
    }

    /**
     * @public Get the current comments inside of the text of this Rainlang instance
     */
    public getComments(): Comment[] {
        return deepCopy(this.comments);
    }

    /**
     * @public Get the current runtime error of this Rainlang instance
     */
    public getRuntimeError(): Error | undefined {
        return deepCopy(this.state.runtimeError);
    }

    /**
     * @public Get AST of this Rainlang instance
     */
    public getAst(): RainlangAST {
        return deepCopy(this.ast);
    }

    /**
     * @internal Method to reset the parser state
     */
    private resetState = () => {
        this.state.depth = 0;
        this.state.nodes = [];
        this.state.aliases = [];
        this.state.parens.open = [];
        this.state.parens.close = [];
    };

    /**
     * @internal Method to find index of next element within the text
     */
    private findNextBoundry = (str: string): number => {
        return str.search(/[()<>\s]/g);
    };

    /**
     * @internal Method to count outputs of nodes in a parse tree
     */
    private countOutputs(nodes: ASTNode[]): number {
        let _count = 0;
        for (const _node of nodes) {
            if (OpASTNode.is(_node)) {
                if (!isNaN(_node.output)) _count += _node.output;
                else return NaN;
            }
            else _count++;
        }
        return _count;
    }

    /**
     * @internal 
     * The main workhorse of Rainlang which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private _parse() {
        this.resetState();
        this.ast = [];
        this.problems = [];
        // this.comments = [];
        this.state.runtimeError = undefined;
        let document = this.text;

        // check for illegal characters
        inclusiveParse(document, ILLEGAL_CHAR).forEach(v => {
            this.problems.push({
                msg: `illegal character: "${v[0]}"`,
                position: v[1],
                code: ErrorCode.IllegalChar
            });
            document = fillIn(document, v[1]);
        });

        // parse comments
        if (!this.binding) {
            this.comments = [];
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
        }
        
        const _sourceExp: string[] = [];
        const _sourceExpPos: [number, number][] = []; 

        // begin parsing expression sources and cache them
        exclusiveParse(document, /;/gd).forEach((v, i, a) => {
            // trim excess whitespaces from start and end of the whole text
            const _trimmed = trim(v[0]);

            if (i === a.length - 1) {
                if (_trimmed.text) {
                    if (document[v[1][1] + 1] !== ";") this.problems.push({
                        msg: "source item expressions must end with semi",
                        position: [
                            v[1][1] - _trimmed.endDelCount + 1, 
                            v[1][1] - _trimmed.endDelCount
                        ],
                        code: ErrorCode.ExpectedSemi
                    });
                    _sourceExp.push(_trimmed.text);
                    _sourceExpPos.push([
                        v[1][0] + _trimmed.startDelCount, 
                        v[1][1] - _trimmed.endDelCount
                    ]);
                }
                else {
                    if (document[v[1][1] + 1] === ";") this.problems.push({
                        msg: "invalid empty expression",
                        position: [
                            v[1][1] - _trimmed.endDelCount + 1, 
                            v[1][1] - _trimmed.endDelCount
                        ],
                        code: ErrorCode.InvalidEmptyBinding
                    });
                }
            }
            else {
                if (!_trimmed.text) this.problems.push({
                    msg: "invalid empty expression",
                    position: [
                        v[1][1] - _trimmed.endDelCount + 1, 
                        v[1][1] - _trimmed.endDelCount
                    ],
                    code: ErrorCode.InvalidEmptyBinding
                });
                else {
                    _sourceExp.push(_trimmed.text);
                    _sourceExpPos.push([
                        v[1][0] + _trimmed.startDelCount, 
                        v[1][1] - _trimmed.endDelCount
                    ]);
                }
            }
        });

        const _mainResKeys = [
            ...this.opmeta.map(v => v.name),
            ...this.opmeta.map(v => v.aliases).filter(v => v !== undefined).flat(),
            ...Object.keys(this.constants),
        ];
        for (let i = 0; i < _sourceExp.length; i++) {
            const _reservedKeys = [
                ..._mainResKeys,
                // ...this.expNames
                ...Object.keys(this.namespaces)
            ];
            const _endDels: number[] = [];
            const _subExp: string[] = [];
            const _subExpPos: PositionOffset[] = [];
            this.ast.push({ lines: [], position: [..._sourceExpPos[i]] });

            // parse and cache the sub-expressions
            exclusiveParse(_sourceExp[i], /,/gd, _sourceExpPos[i][0], true).forEach(v => {
                const _trimmed = trim(v[0]);
                _subExp.push(_trimmed.text);
                _subExpPos.push([
                    v[1][0] + _trimmed.startDelCount,
                    v[1][1] - _trimmed.endDelCount
                ]);
                _endDels.push(_trimmed.endDelCount);
            });

            // begin parsing individual sub-expressions
            for (let j = 0; j < _subExp.length; j++) {
                this.resetState();
                const _positionOffset = _subExpPos[j][0];
                _reservedKeys.push(...(
                    this.ast[i].lines[j - 1]
                        ? this.ast[i].lines[j - 1].aliases
                            .map(v => v.name)
                            .filter(v => v !== "_")
                        : []
                ));

                // check for LHS/RHS delimitter and parse accordingly
                if (_subExp[j].includes(":")) {
                    const _lhs = _subExp[j].slice(0, _subExp[j].indexOf(":"));
                    const _rhs = _subExp[j].slice(_subExp[j].indexOf(":") + 1);

                    // check for invalid comments
                    for (const _cm of this.comments) {
                        if (
                            _cm.position[0] > _positionOffset
                            // + _subExp[j].indexOf(":")
                            && _cm.position[0] < _subExpPos[j][1] + _endDels[j] + 1
                        ) this.problems.push({
                            msg: "unexpected comment",
                            position: [..._cm.position],
                            code: ErrorCode.UnexpectedComment
                        });
                    }

                    // begin parsing LHS
                    if (_lhs.length > 0) {
                        const _parsedLhs = inclusiveParse(
                            _lhs, 
                            /\S+/gd,
                            _positionOffset
                        );
                        for (const _p of _parsedLhs) {
                            this.state.aliases.push({
                                name: _p[0],
                                position: _p[1],
                            });
                            if (!/^[a-z][a-z0-9-]*$|^_$/.test(_p[0])) {
                                this.problems.push({
                                    msg: `invalid LHS alias: ${_p[0]}`,
                                    position: _p[1],
                                    code:ErrorCode.InvalidWordPattern
                                });
                            }
                            if (_reservedKeys.includes(_p[0])) {
                                this.problems.push({
                                    msg: `duplicate alias: ${_p[0]}`,
                                    position: _p[1],
                                    code:ErrorCode.DuplicateAlias
                                });
                            }
                        }
                    }

                    // parsing RHS
                    this.consume(
                        _rhs, 
                        _positionOffset + _subExp[j].length, 
                        // resolveQuotes
                    );

                    // validating RHS against LHS
                    const _outputCount = this.countOutputs(this.state.nodes);
                    if (!isNaN(_outputCount)) {
                        const _tags = [...this.state.aliases];
                        if (!(
                            this.ast[i].lines.map(v => v.nodes).flat().length === 0 && 
                            this.state.nodes.length === 0
                        )) {
                            for (let k = 0; k < this.state.nodes.length; k++) {
                                const _node = this.state.nodes[k];
                                _node.lhsAlias = [];
                                if (OpASTNode.is(_node)) {
                                    if (_node.output > 0) {
                                        if (_tags.length >= _node.output) {
                                            for (let k = 0; k < _node.output; k++) {
                                                _node.lhsAlias.push(_tags.shift()!);
                                            }
                                        }
                                        else {
                                            for (let l = 0; l < _tags.length; l++) {
                                                _node.lhsAlias.push(_tags.shift()!);
                                            }
                                            this.problems.push({
                                                msg: "no LHS item exists to match this RHS item",
                                                position: [..._node.position],
                                                code: ErrorCode.MismatchLHS
                                            });
                                        }
                                    }
                                }
                                else {
                                    if (_tags.length >= 1) _node.lhsAlias.push(_tags.shift()!);
                                    else this.problems.push({
                                        msg: "no LHS item exists to match this RHS item",
                                        position: [..._node.position],
                                        code: ErrorCode.MismatchLHS
                                    });
                                }
                            }
                            if (_tags.length > 0) {
                                for (let k = 0; k < _tags.length; k++) {
                                    this.problems.push({
                                        msg: `no RHS item exists to match this LHS item: ${
                                            _tags[k].name
                                        }`,
                                        position: [..._tags[k].position],
                                        code: ErrorCode.MismatchRHS
                                    });
                                }
                            }
                        }
                    }
                    else for (let k = 0; k < this.state.nodes.length; k++) {
                        this.state.nodes[k].lhsAlias = [];
                    }
                }
                else {
                    // error if sub expressions is empty
                    if (!_subExp[j] || _subExp[j].match(/^\s+$/)) this.problems.push({
                        msg: "invalid empty expression line",
                        position: [..._subExpPos[j]],
                        code: ErrorCode.InvalidEmptyBinding
                    });
                    else this.problems.push({
                        msg: "invalid expression line",
                        position: [..._subExpPos[j]],
                        code: ErrorCode.InvalidExpression
                    });
                }

                // uppdate AST
                this.ast[i].lines.push({
                    nodes: this.state.nodes.splice(
                        -this.state.nodes.length
                    ),
                    aliases: this.state.aliases.splice(
                        -this.state.aliases.length
                    ),
                    position: [..._subExpPos[j]]
                });
            }
        }
    }

    /**
     * @internal Method to update the parse state
     */
    private updateState(node: ASTNode) {
        let _nodes: ASTNode[] = this.state.nodes;
        for (let i = 0; i < this.state.depth; i++) {
            _nodes = (_nodes[_nodes.length - 1] as OpASTNode).parameters;
        }
        _nodes.push(node);
    }

    /**
     * @internal Consumes items in an expression
     */
    private consume(exp: string, offset: number) {
        while (exp.length > 0) {
            const _currentPosition = offset - exp.length;
            if (exp.match(/^\s|^>/)) {
                if (exp.startsWith(">")) this.problems.push({
                    msg: "unexpected \">\"",
                    position: [_currentPosition, _currentPosition],
                    code: ErrorCode.UnexpectedClosingAngleParen
                });
                exp = exp.slice(1);
            }
            else if (exp.startsWith(")")) {
                if (this.state.parens.open.length > 0) {
                    this.state.parens.close.push(_currentPosition);
                    this.resolveOpcode();
                    this.state.depth--;
                }
                else this.problems.push({
                    msg: "unexpected \")\"",
                    position: [_currentPosition, _currentPosition],
                    code: ErrorCode.UnexpectedClosingParen
                });
                exp = exp.slice(1);
                if (exp && !exp.match(/^[\s),]/)) this.problems.push({
                    msg: "expected to be seperated by space",
                    position: [_currentPosition, _currentPosition + 1],
                    code: ErrorCode.ExpectedSpace
                });
            }
            else exp = this.resolveWord(exp, _currentPosition);
        }
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
            let _operandMeta: OperandArgs = [];
            const _operandArgs = exp.slice(1, exp.indexOf(">"));
            const _parsedVals = inclusiveParse(_operandArgs, /\S+/gd, pos + 1);
            // const _opmeta = this.opmeta.find(v => v.name === op.opcode.name);
            const _opmeta = this.searchOpmeta(op);
            exp = exp.slice(exp.indexOf(">") + 1);
            op.operandArgs = {
                position: [pos, pos + _operandArgs.length + 1],
                args: []
            };
            if (_opmeta) {
                if (typeof _opmeta.operand !== "number") {
                    _operandMeta = deepCopy(_opmeta.operand as OperandArgs);
                    const _i = _operandMeta.findIndex(v => v.name === "inputs");
                    if (_i > -1) _operandMeta.splice(_i, 1);
                }
                if (_operandMeta.length === 0) this.problems.push({
                    msg: `opcode ${op.opcode.name} doesn't have argumented operand`,
                    position: [pos, pos + _operandArgs.length + 1],
                    code: ErrorCode.MismatchOperandArgs
                });
                if (_operandMeta.length > _parsedVals.length) this.problems.push({
                    msg: `expected ${
                        _operandMeta.length - _parsedVals.length
                    }${
                        _parsedVals.length ? " more" : ""
                    } operand argument${
                        (_operandMeta.length - _parsedVals.length) > 1 ? "s" : ""
                    } for ${
                        op.opcode.name
                    }`,
                    position: [pos, pos + _operandArgs.length + 1],
                    code: ErrorCode.MismatchOperandArgs
                });
            }
            _parsedVals.forEach((v, i) => {
                const _validArgPattern = this.binding 
                    ? /^[0-9]+$|^0x[a-fA-F0-9]+$|^'\.?[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/
                    : /^[0-9]+$|^0x[a-fA-F0-9]+$/;
                if (_validArgPattern.test(v[0])) {
                    const _isQuote = v[0].startsWith("'");
                    if (_isQuote) {
                        const _quote = v[0].slice(1);
                        if (_quote.includes(".")) {
                            const _tempItem = this.searchName(_quote, v[1][0] + 1, true);
                            if (_tempItem) {
                                if ("content" in _tempItem) {
                                    if ("elided" in _tempItem) this.problems.push({
                                        msg: _tempItem.elided!,
                                        position: v[1],
                                        code: ErrorCode.ElidedBinding
                                    });
                                    if ("constant" in _tempItem) this.problems.push({
                                        msg: `invalid quote: ${_quote}, cannot quote constants`,
                                        position: v[1],
                                        code: ErrorCode.InvalidQuote
                                    });
                                    if (_tempItem.problems.find(
                                        v => v.code === ErrorCode.CircularDependency
                                    )) this.problems.push({
                                        msg: "quoted binding has circular dependency",
                                        position: v[1],
                                        code: ErrorCode.CircularDependency
                                    });
                                }
                                else this.problems.push({
                                    msg: `invalid quote: ${_quote}, can only quote bindings`,
                                    position: v[1],
                                    code: ErrorCode.InvalidQuote
                                });
                            }
                        }
                        else {
                            if (this.namespaces[_quote]) {
                                if (Namespace.isBinding(this.namespaces[_quote])) {
                                    if ("elided" in this.namespaces[_quote].Element) {
                                        this.problems.push({
                                            msg: (this.namespaces[
                                                _quote
                                            ].Element as Binding).elided!,
                                            position: v[1],
                                            code: ErrorCode.ElidedBinding
                                        });
                                    }
                                }
                                else this.problems.push({
                                    msg: `invalid quote: ${_quote}, can only quote bindings`,
                                    position: v[1],
                                    code: ErrorCode.InvalidQuote
                                });
                            }
                            else this.problems.push({
                                msg: `undefined quote: ${_quote}`,
                                position: v[1],
                                code: ErrorCode.UndefinedQuote
                            });
                        }
                    }
                    op.operandArgs!.args.push({
                        value: !_isQuote 
                            ? v[0]
                            : v[0].slice(1) ,
                        name: _operandMeta[i]?.name ?? "unknown",
                        position: v[1],
                        description: _operandMeta[i]?.desc ?? ""
                    });
                }
                else this.problems.push({
                    msg: `invalid argument pattern: ${v[0]}`,
                    position: v[1],
                    code: ErrorCode.InvalidOperandArg
                });
                if (_opmeta && i >= _operandMeta.length) this.problems.push({
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
    private resolveOpcode = () => {
        this.state.parens.open.pop();
        const _endPosition = this.state.parens.close.pop()!;
        let _nodes: ASTNode[] = this.state.nodes;
        for (let i = 0; i < this.state.depth - 1; i++) {
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

        const _opmeta = this.searchOpmeta(_node);
        if (_opmeta) {
            if (typeof _opmeta.outputs === "number") {
                _node.output = _opmeta.outputs as number;
            }
            if (typeof _opmeta.operand === "number") {
                _node.operand = _opmeta.operand;
                if (_node.operandArgs) {
                    _node.operand = NaN;
                    this.problems.push({
                        msg: `opcode ${_node.opcode.name} doesn't have argumented operand`,
                        position: [..._node.operandArgs.position],
                        code: ErrorCode.MismatchOperandArgs
                    });
                }
                if (_opmeta.inputs === 0) {
                    if (_node.parameters.length) this.problems.push({
                        msg: "out-of-range inputs",
                        position: [..._node.parens],
                        code: ErrorCode.OutOfRangeInputs
                    });
                }
                else {
                    if (
                        _node.parameters.length !== 
                      (_opmeta.inputs as InputArgs).parameters.length
                    ) this.problems.push({
                        msg: "out-of-range inputs",
                        position: [..._node.parens],
                        code: ErrorCode.OutOfRangeInputs
                    });
                }
            }
            else {
                let _argIndex = 0;
                let _inputsIndex = -1;
                const _argsLength = (_opmeta.operand as OperandArgs)
                    .find(v => v.name === "inputs")
                    ? (_opmeta.operand as OperandArgs).length - 1
                    : (_opmeta.operand as OperandArgs).length;

                if (_argsLength === (_node.operandArgs?.args.length ?? 0)) {
                    if ((_argsLength === 0 && !_node.operandArgs) || _argsLength > 0) {
                        let _hasQuote = false;
                        if (_node.operandArgs?.args) {
                            for (let i = 0; i < _node.operandArgs.args.length; i++) {
                                if (WORD_PATTERN.test(_node.operandArgs!.args[i].value)) {
                                    _hasQuote = true;
                                }
                            }
                        }
                        if (_hasQuote) {
                            _node.operand = NaN;
                            if (typeof _opmeta.outputs !== "number") _node.output = NaN;
                        }
                        else {
                            const _operand = constructByBits(
                                (_opmeta.operand as OperandArgs).map((v, i) => {
                                    if (v.name === "inputs") {
                                        _inputsIndex = i;
                                        return {
                                            value: _node.parameters.length,
                                            bits: v.bits,
                                            computation: v.computation,
                                            validRange: v.validRange
                                        };
                                    }
                                    else return {
                                        value: Number(
                                          _node.operandArgs!.args[_argIndex++]?.value
                                        ),
                                        bits: v.bits,
                                        computation: v.computation,
                                        validRange: v.validRange
                                    };
                                })
                            );
                            if (typeof _operand === "number") {
                                _node.operand = _operand;
                                if (_node.isCtx) {
                                    _node.operand = ((_opmeta as any).column << 8) + _operand;
                                }
                                if (typeof _opmeta.outputs !== "number") {
                                    _node.output = extractByBits(
                                        _operand, 
                                        (_opmeta.outputs as ComputedOutput).bits, 
                                        (_opmeta.outputs as ComputedOutput).computation
                                    );
                                }
                                if (_opmeta.inputs === 0) {
                                    if (_node.parameters.length) this.problems.push({
                                        msg: "out-of-range inputs",
                                        position: [..._node.parens],
                                        code: ErrorCode.OutOfRangeInputs
                                    });
                                }
                                else {
                                    if (_inputsIndex === -1) {
                                        if (
                                            _node.parameters.length !== 
                                            (_opmeta.inputs as InputArgs)
                                                .parameters.length
                                        ) this.problems.push({
                                            msg: "out-of-range inputs",
                                            position: [..._node.parens],
                                            code: ErrorCode.OutOfRangeInputs
                                        });
                                    }
                                }
                            }
                            else {
                                _node.operand = NaN;
                                if (typeof _opmeta.outputs !== "number") {
                                    _node.output = NaN;
                                }
                                for (const _oprnd of _operand) {
                                    if (_inputsIndex > -1) {
                                        if (_oprnd === _inputsIndex) this.problems.push({
                                            msg: "out-of-range inputs",
                                            position: [..._node.parens],
                                            code: ErrorCode.OutOfRangeInputs
                                        });
                                        else if (_oprnd < _inputsIndex) this.problems.push({
                                            msg: "out-of-range operand argument",
                                            position: [
                                                ..._node.operandArgs!.args[_oprnd].position
                                            ],
                                            code: ErrorCode.OutOfRangeOperandArgs
                                        });
                                        else this.problems.push({
                                            msg: "out-of-range operand argument",
                                            position: [
                                                ..._node.operandArgs!.args[_oprnd - 1].position
                                            ],
                                            code: ErrorCode.OutOfRangeOperandArgs
                                        });
                                    }
                                    else this.problems.push({
                                        msg: "out-of-range operand argument",
                                        position: [..._node.operandArgs!.args[_oprnd].position],
                                        code: ErrorCode.OutOfRangeOperandArgs
                                    });
                                }
                            }
                        }
                    }
                    else _node.operand = NaN;
                }
                else {
                    _node.operand = NaN;
                    if (_argsLength > 0 && !_node.operandArgs) this.problems.push({
                        msg: `expected operand arguments for opcode ${_node.opcode.name}`,
                        position: [..._node.opcode.position],
                        code: ErrorCode.ExpectedOperandArgs
                    });
                }
            }
            if (_node.output === 0 && this.state.depth > 1) this.problems.push({
                msg: "zero output opcodes cannot be nested",
                position: [..._node.position],
                code: ErrorCode.InvalidNestedNode
            });
            if (_node.output > 1 && this.state.depth > 1) this.problems.push({
                msg: "multi output opcodes cannot be nested",
                position: [..._node.position],
                code: ErrorCode.InvalidNestedNode
            });
        }
    };

    /**
     * @internal Method that parses an upcoming word to a rainlang AST node
     */
    private resolveWord(exp: string, entry: number): string {
        const _offset = this.findNextBoundry(exp);
        const _index = _offset < 0 
            ? exp.length 
            : _offset;
        const _word = exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        exp = exp.replace(_word, "");

        if (exp.startsWith("(") || exp.startsWith("<")) {
            let _opcode;
            if (!_word) this.problems.push({
                msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                position: [..._wordPos],
                code: ErrorCode.ExpectedOpcode
            });
            if (_word.includes(".")) {
                const _tempOpcode = this.searchName(_word, entry, true);
                if (_tempOpcode && ("operand" in _tempOpcode || "column" in _tempOpcode)) {
                    _opcode = _tempOpcode;
                }
            }
            else {
                if (!_word.match(WORD_PATTERN)) this.problems.push({
                    msg: `invalid word pattern: "${_word}"`,
                    position: [..._wordPos],
                    code: ErrorCode.InvalidWordPattern
                });
                _opcode = this.opmeta.find(
                    v => v.name === _word || v.aliases?.includes(_word)
                );
                if (!_opcode) {
                    if (
                        this.namespaces[_word] && (
                            Namespace.isWord(this.namespaces[_word]) || 
                            Namespace.isContextAlias(this.namespaces[_word])
                        )
                        
                    ) _opcode = this.namespaces[_word].Element as OpMeta | ContextAlias;
                }
            }
            if (!_opcode) this.problems.push({
                msg: `unknown opcode: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.UndefinedOpcode
            });
            let _op: OpASTNode = {
                opcode: {
                    name: _opcode ? _word : "unknown opcode",
                    description: _opcode ? _opcode.desc : "",
                    position: [..._wordPos],
                },
                operand: NaN,
                output: NaN,
                position: [[..._wordPos][0], NaN],
                parens: [NaN, NaN],
                parameters: []
            };
            if (_opcode && "column" in _opcode) _op.isCtx = true;
            if (exp.startsWith("<")) [exp, _op] = this.resolveOperand(
                exp, 
                entry + _word.length, 
                _op
            );
            if (exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._wordPos][1] + 1;
                exp = exp.replace("(", "");
                this.state.parens.open.push(_pos);
                _op.parens[0] = _pos;
                this.updateState(_op);
                this.state.depth++;
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
        else {
            if (_word.includes(".")) {
                if (
                    _word.startsWith(".") && 
                    WORD_PATTERN.test(_word.slice(1)) &&
                    _word.slice(1) === this.binding?.name
                ) {
                    this.problems.push({
                        msg: "cannot reference self",
                        position: [..._wordPos],
                        code: ErrorCode.InvalidSelfReference
                    });
                    this.updateState({
                        name: _word,
                        position: [..._wordPos]
                    });
                }
                else {
                    const _tempItem = this.searchName(_word, entry, true);
                    if (_tempItem) {
                        if ("content" in _tempItem) {
                            if (_tempItem.constant) this.updateState({
                                id: _word,
                                value: _tempItem.constant,
                                position: [..._wordPos],
                            });
                            else {
                                const _msg = _tempItem.elided
                                    ? _tempItem.elided
                                    : `invalid reference to binding: ${
                                        _word
                                    }, only contant bindings can be referenced`;
                                this.problems.push({
                                    msg: _msg,
                                    position: [..._wordPos],
                                    code: _tempItem.elided
                                        ? ErrorCode.ElidedBinding
                                        : ErrorCode.InvalidReference
                                });
                                this.updateState({
                                    name: _word,
                                    position: [..._wordPos]
                                });
                            }
                        }
                        else {
                            this.problems.push({
                                msg: `invalid reference to ${
                                    "operand" in _tempItem
                                        ? "opcode"
                                        : "context alias"
                                }: ${_word}`,
                                position: [..._wordPos],
                                code: ErrorCode.InvalidReference
                            });
                            this.updateState({
                                name: _word,
                                position: [..._wordPos]
                            });
                        }
                    }
                    else this.updateState({
                        name: _word,
                        position: [..._wordPos]
                    });
                }
            }
            else {
                if (_word.match(NUMERIC_PATTERN)) {
                    // let _val = _word;
                    // if (_word.startsWith("0b")) _val = Number(_word).toString();
                    // else if (!isBigNumberish(_word)) {
                    //     const _nums = _word.match(/\d+/g)!;
                    //     _val = _nums[0] + "0".repeat(Number(_nums[1]));
                    // }
                    if (CONSTANTS.MaxUint256.lt(toConvNumber(_word))) {
                        this.problems.push({
                            msg: "value greater than 32 bytes in size",
                            position: [..._wordPos],
                            code: ErrorCode.OutOfRangeValue
                        });
                    }
                    this.updateState({
                        value: _word,
                        position: [..._wordPos],
                    });
                }
                else if (WORD_PATTERN.test(_word)) {
                    if (Object.keys(this.constants).includes(_word)) {
                        this.updateState({
                            id: _word,
                            value: this.constants[_word],
                            position: [..._wordPos],
                        });
                    }
                    else {
                        if (this.state.aliases.find(v => v.name === _word)) {
                            this.problems.push({
                                msg: "cannot reference self",
                                position: [..._wordPos],
                                code: ErrorCode.InvalidSelfReference
                            });
                            this.updateState({
                                name: _word,
                                position: [..._wordPos]
                            });
                        }
                        else if (this.ast[this.ast.length - 1].lines.find(
                            v => !!v.aliases.find(e => e.name === _word)
                        )) this.updateState({
                            name: _word,
                            position: [..._wordPos]
                        });
                        else if (_word === this.binding?.name) {
                            this.problems.push({
                                msg: "cannot reference self",
                                position: [..._wordPos],
                                code: ErrorCode.InvalidSelfReference
                            });
                            this.updateState({
                                name: _word,
                                position: [..._wordPos]
                            });
                        }
                        else if (this.namespaces[_word]) {
                            if ("Element" in this.namespaces[_word]) {
                                const _item = this.namespaces[
                                    _word
                                ].Element as Binding | OpMeta | ContextAlias;
                                if ("content" in _item) {
                                    if (_item.constant) this.updateState({
                                        id: _word,
                                        value: _item.constant,
                                        position: [..._wordPos],
                                    });
                                    else {
                                        const _msg = _item.elided
                                            ? _item.elided
                                            : `invalid reference to binding: ${
                                                _word
                                            }, only contant bindings can be referenced`;
                                        this.problems.push({
                                            msg: _msg,
                                            position: [..._wordPos],
                                            code: _item.elided
                                                ? ErrorCode.ElidedBinding
                                                : ErrorCode.InvalidReference
                                        });
                                        this.updateState({
                                            name: _word,
                                            position: [..._wordPos]
                                        });
                                    }
                                }
                                else {
                                    this.problems.push({
                                        msg: `invalid reference to ${
                                            "operand" in _item
                                                ? "opcode"
                                                : "context alias"
                                        }: ${_word}`,
                                        position: [..._wordPos],
                                        code: ErrorCode.InvalidReference
                                    });
                                    this.updateState({
                                        name: _word,
                                        position: [..._wordPos]
                                    });
                                }
                            }
                            else {
                                this.problems.push({
                                    msg: `invalid reference to namespace: ${_word}`,
                                    position: [..._wordPos],
                                    code: ErrorCode.InvalidReference
                                });
                                this.updateState({
                                    name: _word,
                                    position: [..._wordPos]
                                });
                            }
                        }
                        else {
                            this.problems.push({
                                msg: `undefined word: ${_word}`,
                                position: [..._wordPos],
                                code: ErrorCode.UndefinedWord
                            });
                            this.updateState({
                                name: _word,
                                position: [..._wordPos]
                            });
                        }
                    }
                }
                else {
                    this.problems.push({
                        msg: `"${_word}" is not a valid rainlang word`,
                        position: [..._wordPos],
                        code: ErrorCode.InvalidWordPattern
                    });
                    this.updateState({
                        name: _word,
                        position: [..._wordPos]
                    });
                }
            }
        }
        return exp;
    }

    /**
     * @internal Search in namespaces for a name
     */
    private searchName(
        name: string, 
        offset: number, 
        publishDiagnostics: boolean
    ): OpMeta | ContextAlias | Binding | undefined {
        const _names = exclusiveParse(name, /\./gd, offset, true);
        if (name.startsWith(".")) _names.shift();
        if (_names.length > 32) {
            if (publishDiagnostics) this.problems.push({
                msg: "namespace too depp",
                position: [offset, offset + name.length - 1],
                code: ErrorCode.DeepNamespace
            });
            return undefined;
        }
        if (!_names[_names.length - 1][0]) {
            if (publishDiagnostics) this.problems.push({
                msg: "expected to end with a node",
                position: _names[_names.length - 1][1],
                code: ErrorCode.UnexpectedNamespacePath
            });
            return undefined;
        }
        const _invalidNames = _names.filter(v => !WORD_PATTERN.test(v[0]));
        if (_invalidNames.length) {
            if (publishDiagnostics) _invalidNames.forEach(v => {
                this.problems.push({
                    msg: "invalid word pattern",
                    position: v[1],
                    code: ErrorCode.InvalidWordPattern
                });
            });
            return undefined;
        }
        let _result: any = this.namespaces;
        for (let i = 0; i < _names.length; i++) {
            if (_result[_names[i][0]]) _result = _result[_names[i][0]];
            else {
                if (publishDiagnostics) this.problems.push({
                    msg: "undefined identifier",
                    position: _names[i][1],
                    code: ErrorCode.UndefinedIdentifier
                });
                return undefined;
            }
        }
        if (!("Element" in _result)) {
            if (publishDiagnostics) this.problems.push({
                msg: `expected to end with a node, "${_names[_names.length - 1]}" is a namespace`,
                position: [offset, offset + name.length - 1],
                code: ErrorCode.UnexpectedNamespacePath
            });
            return undefined;
        }
        else return _result.Element;
    }

    /**
     * @internal search for OpMeta in namespaces
     */
    private searchOpmeta(node: OpASTNode | string): OpMeta | undefined {
        let _opmeta;
        const _name = typeof node === "string" ? node : node.opcode.name;
        if (_name.includes(".")) {
            const _tempOpcode = this.searchName(_name, 0, false);
            if (_tempOpcode && ("operand" in _tempOpcode || "column" in _tempOpcode)) {
                _opmeta = _tempOpcode;
            }
        }
        else {
            _opmeta = this.opmeta.find(
                v => v.name === _name || v.aliases?.includes(_name)
            );
            if (!_opmeta) {
                if (
                    this.namespaces[_name] && (
                        Namespace.isWord(this.namespaces[_name]) || 
                        Namespace.isContextAlias(this.namespaces[_name])
                    )
                ) _opmeta = this.namespaces[_name].Element as OpMeta | ContextAlias;
            }
        }
        if (_opmeta && "column" in _opmeta) {
            const _temp = {
                name: _opmeta.name,
                desc: _opmeta.desc,
                operand: isNaN(_opmeta.row)
                    ? [{
                        name: "Row Index",
                        bits: [0, 7]
                    }]
                    : (_opmeta.column << 8) + _opmeta.row,
                inputs: 0,
                outputs: 1
            } as any;
            if (isNaN(_opmeta.row)) _temp.column = _opmeta.column;
            _opmeta = _temp;
        }
        return _opmeta;
    }
}