// import { MetaStore } from "./metaStore";
import { ASTNodePosition, BoundExpression, ErrorCode, ValueASTNode, illigalChar, numericPattern, wordPattern } from "../rainLanguageTypes";
import { 
    OpMeta,
    InputMeta,
    InputArgs, 
    OutputMeta,
    OperandArgs,
    OperandMeta,
    // ContractMeta,
    // OpMetaSchema, 
    // metaFromBytes, 
    ComputedOutput,
    // ContractMetaSchema
} from "@rainprotocol/meta";
import { 
    FragmentASTNode, 
    OpASTNode, 
    ProblemASTNode, 
    CommentASTNode, 
    // MemoryType, 
    // MetaHashASTNode, 
    RainlangAST,
    // AliasASTNode,
    RainlangParseState, 
    // ExpressionConfig 
} from "../rainLanguageTypes";
import {
    // op,
    // concat,
    // hexlify,
    deepCopy,
    // BytesLike,
    CONSTANTS,
    // BigNumber, 
    // BigNumberish, 
    extractByBits, 
    // memoryOperand,
    isBigNumberish,
    inclusiveParse,
    exclusiveParse,
    constructByBits, 
} from "../utils";


/**
 * @public
 * Rain Parser is a the main workhorse that does all the heavy work of parsing a document, 
 * written in TypeScript in order to parse a text document using an op meta into known types 
 * which later will be used in RainDocument object and Rain Language Services and Compiler
 */
export class RainlangParser {

    public text: string;
    public ast: RainlangAST = { lines: [] };
    public problems: ProblemASTNode[] = [];
    public comments: CommentASTNode[] = [];
    public boundExps: BoundExpression[] = [];
    public constants: Record<string, string>;

    private opmeta: OpMeta[] = [];
    private names: string[] = [];
    private pops: InputMeta[] = [];
    private pushes: OutputMeta[] = [];
    private operand: OperandMeta[] = [];
    private opAliases: (string[] | undefined)[] = [];

    private currentIndex: number;
    private state: RainlangParseState = {
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
    constructor(
        text: string, 
        opmeta: OpMeta[],
        currentExpIndex: number,
        options?: { 
            boundExpressions?: BoundExpression[];
            compilationParse?: boolean; 
            constants?: Record<string, string>;
        }
    ) {
        this.text = text;
        this.opmeta = opmeta;
        this.currentIndex = currentExpIndex;
        this.names = this.opmeta.map(v => v.name);
        this.pops = this.opmeta.map(v => v.inputs);
        this.pushes = this.opmeta.map(v => v.outputs);
        this.operand = this.opmeta.map(v => v.operand);
        this.opAliases = this.opmeta.map(v => v.aliases);
        if (options?.boundExpressions) this.boundExps = options.boundExpressions;
        if (options?.constants) this.constants = options.constants;
        else this.constants = {};
        this.parse(options?.compilationParse);
    }

    /**
     * @public
     * Parses this instance of RainParser
     */
    public parse(compilationParse = false) {
        if (/[^\s]+/.test(this.text)) {
            try {
                this._parse(compilationParse);
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
                        this.text.length - 1
                    ],
                    code: ErrorCode.RuntimeError
                });
            }
        }
        else {
            this._resetState();
            this.ast.lines = [];
            this.problems = [];
            this.comments = [];
            this.state.track.char = 0;
            this.state.runtimeError = undefined;
            this.problems.push({
                msg: "invalid empty expression",
                position: this.boundExps[this.currentIndex].namePosition,
                code: ErrorCode.InvalidEmptyExpression
            });
        }
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
    private parseNodes(exp: string, offset: number, compilationParse = false) {
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
            else exp = this.consume(exp, _currentPosition, compilationParse);
        }
    }

    /**
     * @internal 
     * The main workhorse of RainParser which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private _parse(compilationParse = false) {
        this._resetState();
        this.ast.lines = [];
        this.problems = [];
        this.comments = [];
        this.state.track.char = 0;
        this.state.runtimeError = undefined;
        let document = this.text;

        // check for illigal characters
        inclusiveParse(document, illigalChar).forEach(v => {
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

        // begin parsing expression sources and cache them
        const _trimmed = this.trim(document);
        const _sourceExp = _trimmed.text;
        const _sourceExpPos: [number, number] = [
            _trimmed.startDelCount,
            document.length - _trimmed.endDelCount - 1
        ];

        // begin parsing individual expression sources
        this._resetState();
        const _subExp: string[] = [];
        const _subExpPos: ASTNodePosition[] = [];
        let multiNode = false;
        let type: "exp" | "const";

        // parse and cache the sub-expressions
        exclusiveParse(_sourceExp, /,/gd, _sourceExpPos[0]).forEach((v, i) => {
            if (i === 0) {
                if (v[0].includes(":")) type = "exp";
                else type = "const";
            }
            const _trimmed = this.trim(v[0]);
            _subExp.push(_trimmed.text);
            _subExpPos.push([
                v[1][0] + _trimmed.startDelCount,
                v[1][1] - _trimmed.endDelCount
            ]);
        });

        // begin parsing individual sub-expressions
        for (let i = 0; i < _subExp.length; i++) {
            this._resetState();
            const _positionOffset = _subExpPos[i][0];
            this.state.track.char = _positionOffset;

            // check for LHS/RHS delimitter, exit from parsing this sub-expression if 
            // no or more than one delimitter was found, else start parsing LHS and RHS

            if (_subExp[i].match(/^\s+$/)) this.problems.push({
                msg: "invalid empty expression",
                position: _subExpPos[i],
                code: ErrorCode.InvalidExpression
            });
            else if (_subExp[i].includes(":")) {
                if (type! === "const") this.problems.push({
                    msg: "unexpected expression",
                    position: _subExpPos[i],
                    code: ErrorCode.UnexpectedExpression
                });
                else {
                    const _lhs = _subExp[i].slice(0, _subExp[i].indexOf(":"));
                    const exp = _subExp[i].slice(_subExp[i].indexOf(":") + 1);

                    // check for invalid RHS comments
                    for (const _cm of this.comments) {
                        if (
                            _cm.position[0] > _positionOffset + 
                                _subExp[i].indexOf(":") &&
                            _cm.position[0] < _positionOffset + 
                                _subExp[i].length
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
                                position: _p[1],
                                // type: AliasType.STACK
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
                    this.parseNodes(exp, _positionOffset + _subExp[i].length, compilationParse);

                    // validating RHS against LHS
                    const _outputCount = this.countOutputs(this.state.parse.tree);
                    if (!isNaN(_outputCount)) {
                        const _treeCount = this.state.parse.tree.length;
                        const _tags = [...this.state.parse.aliases];
                        this.state.track.char = _positionOffset;
                        if (!(this.ast.lines.at(-1)?.nodes.length === 0 && _treeCount === 0)) {
                            for (let j = 0; j < _treeCount; j++) {
                                const _node = this.state.parse.tree[j];
                                if (OpASTNode.is(_node)) {
                                    _node.lhsAlias = [];
                                    if (_node.output > 0) {
                                        if (_tags.length >= _node.output) {
                                            for (let k = 0; k < _node.output; k++) {
                                                _node.lhsAlias.push(_tags.shift()!);
                                            }
                                        }
                                        else {
                                            for (let k = 0; k < _tags.length; k++) {
                                                _node.lhsAlias.push(_tags.shift()!);
                                            }
                                            this.problems.push({
                                                msg: "no LHS item exists to match this RHS item",
                                                position: _node.position,
                                                code: ErrorCode.MismatchLHS
                                            });
                                        }
                                    }
                                }
                                else {
                                    if (_tags.length >= 1) _node.lhsAlias = _tags.shift();
                                    else this.problems.push({
                                        msg: "no LHS item exists to match this RHS item",
                                        position: _node.position,
                                        code: ErrorCode.MismatchLHS
                                    });
                                }
                            }
                            if (_tags.length > 0) {
                                for (let j = 0; j < _tags.length; j++) {
                                    this.problems.push({
                                        msg: `no RHS item exists to match this LHS item: ${
                                            _tags[j].name
                                        }`,
                                        position: _tags[j].position,
                                        code: ErrorCode.MismatchRHS
                                    });
                                }
                            }
                        }
                    }
                }
            }
            else {
                this.parseNodes(
                    _subExp[i], 
                    _positionOffset + _subExp[i].length, 
                    compilationParse
                );
                if (type! === "exp") this.problems.push({
                    msg: "invalid expression",
                    position: _subExpPos[i],
                    code: ErrorCode.InvalidExpression
                });
                else {
                    if (
                        this.state.parse.tree.length + 
                        this.ast.lines.map(v => v.nodes).flat().length !== 1
                    ) {
                        for (let j = 0; j < this.state.parse.tree.length; j++) {
                            if (multiNode) this.problems.push({
                                msg: "unexpected fragment",
                                position: this.state.parse.tree[j].position,
                                code: ErrorCode.UnexpectedFragment
                            });
                            else {
                                if (j === 0) {
                                    multiNode = true;
                                    if (!ValueASTNode.is(this.state.parse.tree[j])) {
                                        this.problems.push({
                                            msg: "expected a constant value",
                                            position: this.state.parse.tree[j].position,
                                            code: ErrorCode.ExpectedConstant
                                        });
                                    }
                                }
                            }
                        }
                    }
                    else {
                        if (!ValueASTNode.is(this.state.parse.tree[0])) {
                            this.problems.push({
                                msg: "expected a constant value",
                                position: this.state.parse.tree[0].position,
                                code: ErrorCode.ExpectedConstant
                            });
                        }
                    }
                }
            }

            this.ast.lines.push({
                nodes: this.state.parse.tree.splice(
                    -this.state.parse.tree.length
                ),
                aliases: this.state.parse.aliases.splice(
                    -this.state.parse.aliases.length
                ),
                position: _subExpPos[i]
            });
        }
    }

    /**
     * @internal Method to resolve a valid closed paren node at current state of parsing
     */
    private resolveParen() {
        this.state.track.parens.open.pop();
        const _endPosition = this.state.track.parens.close.pop()!;
        let _nodes: FragmentASTNode[] = this.state.parse.tree;
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
    private updateAST(node: FragmentASTNode, replace?: boolean) {
        let _nodes: FragmentASTNode[] = this.state.parse.tree;
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
    private resolveOperand(
        exp: string, 
        pos: number, 
        op: OpASTNode, 
        compilationParse = false
    ): [string, OpASTNode] {
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
                const _isValid = /^[0-9]+$|^0x[a-fA-F0-9]+$|^(?:')[a-z][a-z0-9-]*$/.test(v[0]);
                if (_isValid) {
                    let quoteIndex = -1;
                    let quoteValue = -1;
                    const quote = v[0].match(/^(?:')[a-z][a-z0-9-]*$/);
                    if (quote) {
                        quoteIndex = this.boundExps.findIndex(v => v.name === quote[0]);
                        if (quoteIndex === -1) this.problems.push({
                            msg: `undefined expression binding key: ${v[0]}`,
                            position: v[1],
                            code: ErrorCode.UndefinedExpression
                        });
                        else {
                            if (BoundExpression.isConstant(this.boundExps[quoteIndex])) {
                                quoteValue = Number((this.boundExps[
                                    quoteIndex
                                ].doc?.ast.lines[0].nodes[0] as ValueASTNode).value);
                            }
                        }
                    }
                    op.operandArgs!.args.push({
                        value: !v[0].startsWith("'") 
                            ? v[0] 
                            : quoteValue !== -1
                                ? quoteValue.toString()
                                : quoteIndex > -1 && compilationParse
                                    ? quoteIndex.toString() 
                                    : v[0].slice(1),
                        name: _operandMetas[i]?.name ?? "unknown",
                        position: v[1],
                        description: _operandMetas[i]?.desc
                    });
                }
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
                        let hasQuote = false;
                        if (node.operandArgs?.args) {
                            for (let i = 0; i < node.operandArgs.args.length; i++) {
                                if (wordPattern.test(node.operandArgs!.args[i].value)) {
                                    hasQuote = true;
                                }
                            }
                        }
                        if (hasQuote) {
                            node.operand = NaN;
                            if (typeof this.pushes[_index] !== "number") node.output = NaN;
                        }
                        else {
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
                                        value: Number(
                                          node.operandArgs!.args[_argIndex++]?.value
                                        ),
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
            if (node.output && node.output === 0 && this.state.depthLevel > 1) this.problems.push({
                msg: "zero output opcodes cannot be nested",
                position: [...node.position],
                code: ErrorCode.InvalidNestedNode
            });
            if (node.output && node.output > 1 && this.state.depthLevel > 1) this.problems.push({
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
    private consume(exp: string, entry: number, compilationParse = false): string {
        const _tmp = this.findIndex(exp);
        const _index = _tmp < 0 ? exp.length : _tmp === 0 ? 1 : _tmp;
        const _word = exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        this.state.track.char = entry + _word.length - 1;
        exp = exp.replace(_word, "");
        const _aliasIndex = this.ast.lines.findIndex(v => !!v.aliases.find(e => e.name === _word));
        const _currentAliasIndex = this.state.parse.aliases.findIndex(v => v.name === _word);
        const _bindingsAliasIndex = this.boundExps.findIndex(v => v.name === _word);

        if (exp.startsWith("(") || exp.startsWith("<")) {
            if (!_word.match(wordPattern)) this.problems.push({
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
            if (exp.startsWith("<")) [exp, _op] = this.resolveOperand(
                exp, 
                entry + _word.length, 
                _op, 
                compilationParse
            );
            if (exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._wordPos][1] + 1;
                exp = exp.replace("(", "");
                this.state.track.parens.open.push(_pos);
                _op.parens[0] = _pos;
                this.updateAST(_op);
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
        else if (_aliasIndex > -1 || _currentAliasIndex > -1 || _bindingsAliasIndex > -1) {
            if (!_word.match(wordPattern)) this.problems.push({
                msg: `invalid pattern for alias: ${_word}`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            if (_currentAliasIndex > -1) this.problems.push({
                msg: "cannot reference self",
                position: [..._wordPos],
                code: ErrorCode.InvalidSelfReferenceLHS
            });
            if (_aliasIndex === -1 && _currentAliasIndex === -1 && _bindingsAliasIndex > -1) {
                if (!BoundExpression.isConstant(this.boundExps[_bindingsAliasIndex])) {
                    this.problems.push({
                        msg: "unexpected usage of binding key",
                        position: [..._wordPos],
                        code: ErrorCode.UnexpectedBindingKeyUsage
                    });
                }
            }
            this.updateAST({
                name: _word,
                position: [..._wordPos]
            });
        }
        else if (_word.match(numericPattern)) {
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
            this.updateAST({
                value: _val,
                position: [..._wordPos],
            });
        }
        else if (wordPattern.test(_word)) {
            if (this.isConstant(_word)) {
                this.updateAST({
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
                this.updateAST({
                    name: _word,
                    position: [..._wordPos]
                });
            }
        }
        else {
            this.problems.push({
                msg: `"${_word}" is not a valid rainlang word`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            this.updateAST({
                name: _word,
                position: [..._wordPos]
            });
        }
        return exp;
    }

    /**
     * @internal Method to count outputs of nodes in a parse tree
     */
    private countOutputs(nodes: FragmentASTNode[]): number {
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
}
