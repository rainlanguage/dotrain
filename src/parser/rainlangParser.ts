import { 
    OpMeta,
    InputArgs,
    OperandArgs,
    ComputedOutput,
} from "@rainprotocol/meta";
import { 
    ASTNode, 
    OpASTNode, 
    RainlangAST,
    Problem, 
} from "../rainLanguageTypes";
import {
    deepCopy,
    CONSTANTS,
    extractByBits, 
    isBigNumberish,
    inclusiveParse,
    exclusiveParse,
    constructByBits, 
} from "../utils";
import { 
    ErrorCode, 
    WORD_PATTERN,
    ILLEGAL_CHAR,
    ValueASTNode, 
    AliasASTNode, 
    NUMERIC_PATTERN, 
    PositionOffset, 
    NamedExpression,  
} from "../rainLanguageTypes";


/**
 * @public
 * Rainlang Parser is a the main workhorse that does all the heavy work of parsing a document, 
 * written in TypeScript in order to parse a text document using an op meta into known types 
 * which later will be used in RainDocument object and Rain Language Services and Compiler
 */
export class RainlangParser {

    public text: string;
    public ast: RainlangAST = { lines: [] };
    public problems: Problem[] = [];
    // public comments: CommentASTNode[] = [];
    public constants: Record<string, string>;
    public namedExpressions: NamedExpression[] = [];

    private expIndex: number;
    private opmeta: OpMeta[] = [];
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
     * @public Constructs a new RainParser object
     * @param textDocument - TextDocument
     * @param metaStore - (optional) MetaStore object
     */
    /**
     * @public Constructs a new RainParser object
     * @param namedExpressions - The named expressions from parent RainDocument
     * @param currentExpIndex - Current index of this expression among all parent RainDocument expression
     * @param opmeta - The op meta
     * @param options - Options to instantiate
     */
    constructor(
        namedExpressions: NamedExpression[],
        currentExpIndex: number,
        opmeta: OpMeta[],
        options?: { 
            /**
             * Determines if quotes should be resolved into indexes when parsing or not
             */
            resolveQuotes?: boolean; 
            /**
             * Reserved constant values as k/v
             */
            constants?: Record<string, string>;
        }
    ) {
        this.namedExpressions = namedExpressions;
        this.text = namedExpressions[currentExpIndex].text;
        this.expIndex = currentExpIndex;
        this.opmeta = opmeta;
        if (options?.constants) this.constants = options.constants;
        else this.constants = {};
        this.parse(options?.resolveQuotes);
    }

    /**
     * @public
     * Parses this instance of RainParser
     */
    public parse(resolveQuotes = false) {
        if (/[^\s]+/.test(this.text)) {
            try {
                this._parse(resolveQuotes);
            }
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
        else {
            this.resetState();
            this.ast.lines = [];
            this.problems = [];
            // this.comments = [];
            this.state.runtimeError = undefined;
            this.problems.push({
                msg: "invalid empty expression",
                position: deepCopy(this.namedExpressions[this.expIndex].namePosition),
                code: ErrorCode.InvalidEmptyExpression
            });
        }
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
    private findOffset = (str: string): number => {
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
     * The main workhorse of RainParser which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private _parse(resolveQuotes = false) {
        this.resetState();
        this.ast.lines = [];
        this.problems = [];
        // this.comments = [];
        this.state.runtimeError = undefined;
        let document = this.text;

        // check for illigal characters
        inclusiveParse(document, ILLEGAL_CHAR).forEach(v => {
            this.problems.push({
                msg: `illegal character: "${v[0]}"`,
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

        // // parse comments
        // inclusiveParse(document, /\/\*[^]*?(?:\*\/|$)/gd).forEach(v => {
        //     if (!v[0].endsWith("*/")) this.problems.push({
        //         msg: "unexpected end of comment",
        //         position: v[1],
        //         code: ErrorCode.UnexpectedEndOfComment
        //     });
        //     this.comments.push({
        //         comment: v[0],
        //         position: v[1]
        //     });
        //     document = 
        //       document.slice(0, v[1][0]) +
        //       " ".repeat(v[0].length) +
        //       document.slice(v[1][1] + 1);
        // });

        // trim excess whitespaces from start and end of the whole text
        const _trimmed = this.trim(document);
        const _exp = _trimmed.text;
        const _expPos: [number, number] = [
            _trimmed.startDelCount,
            document.length - _trimmed.endDelCount - 1
        ];
        let multiNode = false;
        let type: "exp" | "const";
        const _subExp: string[] = [];
        const _subExpPos: PositionOffset[] = [];

        // parse and cache the sub-expressions
        exclusiveParse(_exp, /,/gd, _expPos[0], true).forEach((v, i) => {
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
        if (_subExp.length > 1) type = "exp";

        const _reservedKeys = [
            ...this.opmeta.map(v => v.name),
            ...this.opmeta.map(v => v.aliases).filter(v => v !== undefined).flat(),
            ...Object.keys(this.constants),
            ...this.namedExpressions.map(v => v.name)
        ];

        // begin parsing individual sub-expressions
        for (let i = 0; i < _subExp.length; i++) {
            this.resetState();
            const _positionOffset = _subExpPos[i][0];
            _reservedKeys.push(...(
                this.ast.lines[this.ast.lines.length - 1]
                    ? this.ast.lines[
                        this.ast.lines.length - 1
                    ].aliases.map(v => v.name).filter(v => v !== "_")
                    : []
            ));

            // error if sub expressions is empty
            if (!_subExp[i] || _subExp[i].match(/^\s+$/)) this.problems.push({
                msg: "invalid empty expression",
                position: _subExpPos[i],
                code: ErrorCode.InvalidExpression
            });
            // check for LHS/RHS delimitter and parse accordingly
            else if (_subExp[i].includes(":")) {
                if (type! === "const") this.problems.push({
                    msg: "unexpected expression",
                    position: _subExpPos[i],
                    code: ErrorCode.UnexpectedExpression
                });
                else {
                    const _lhs = _subExp[i].slice(0, _subExp[i].indexOf(":"));
                    const _rhs = _subExp[i].slice(_subExp[i].indexOf(":") + 1);

                    // // check for invalid RHS comments
                    // for (const _cm of this.comments) {
                    //     if (
                    //         _cm.position[0] > _positionOffset + 
                    //             _subExp[i].indexOf(":") &&
                    //         _cm.position[0] < _positionOffset + 
                    //             _subExp[i].length
                    //     ) this.problems.push({
                    //         msg: "invalid RHS, comments are not allowed",
                    //         position: [..._cm.position],
                    //         code: ErrorCode.UnexpectedRHSComment
                    //     });
                    // }

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
                    this.consume(_rhs, _positionOffset + _subExp[i].length, resolveQuotes);

                    // validating RHS against LHS
                    const _outputCount = this.countOutputs(this.state.nodes);
                    if (!isNaN(_outputCount)) {
                        const _tags = [...this.state.aliases];
                        if (!(
                            this.ast.lines.map(v => v.nodes).flat().length === 0 && 
                            this.state.nodes.length === 0
                        )) {
                            for (let j = 0; j < this.state.nodes.length; j++) {
                                const _node = this.state.nodes[j];
                                _node.lhsAlias = [];
                                if (OpASTNode.is(_node)) {
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
                                    if (_tags.length >= 1) _node.lhsAlias.push(_tags.shift()!);
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
                    else for (let j = 0; j < this.state.nodes.length; j++) {
                        this.state.nodes[j].lhsAlias = [];
                    }
                }
            }
            // parse accordingly if there is no lhs/rhs delimiter
            else {
                this.consume(
                    _subExp[i], 
                    _positionOffset + _subExp[i].length, 
                    resolveQuotes
                );
                if (type! === "exp") this.problems.push({
                    msg: "invalid expression",
                    position: _subExpPos[i],
                    code: ErrorCode.InvalidExpression
                });
                else {
                    if (
                        this.state.nodes.length + 
                        this.ast.lines.map(v => v.nodes).flat().length !== 1
                    ) {
                        for (let j = 0; j < this.state.nodes.length; j++) {
                            if (multiNode) this.problems.push({
                                msg: "unexpected fragment",
                                position: this.state.nodes[j].position,
                                code: ErrorCode.UnexpectedFragment
                            });
                            else {
                                if (j === 0) {
                                    multiNode = true;
                                    if (!ValueASTNode.is(this.state.nodes[j])) {
                                        this.problems.push({
                                            msg: "expected a constant value",
                                            position: this.state.nodes[j].position,
                                            code: ErrorCode.ExpectedConstant
                                        });
                                    }
                                }
                            }
                        }
                    }
                    else {
                        if (!ValueASTNode.is(this.state.nodes[0])) {
                            this.problems.push({
                                msg: "expected a constant value",
                                position: this.state.nodes[0].position,
                                code: ErrorCode.ExpectedConstant
                            });
                        }
                    }
                }
            }

            // uppdate AST
            this.ast.lines.push({
                nodes: this.state.nodes.splice(
                    -this.state.nodes.length
                ),
                aliases: this.state.aliases.splice(
                    -this.state.aliases.length
                ),
                position: _subExpPos[i]
            });
        }
    }

    /**
     * @internal Method to update the parse tree
     */
    private updateAST(node: ASTNode) {
        let _nodes: ASTNode[] = this.state.nodes;
        for (let i = 0; i < this.state.depth; i++) {
            _nodes = (_nodes[_nodes.length - 1] as OpASTNode).parameters;
        }
        _nodes.push(node);
    }

    /**
     * @internal Consumes items in an expression
     */
    private consume(exp: string, offset: number, resolveQuotes = false) {
        while (exp.length > 0) {
            const _currentPosition = offset - exp.length;
            if (exp.startsWith(" ")) {
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
            else exp = this.resolveWord(exp, _currentPosition, resolveQuotes);
        }
    }

    /**
     * @internal Method to handle operand arguments
     */
    private resolveOperand(
        exp: string, 
        pos: number, 
        op: OpASTNode, 
        resolveQuotes = false
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
            let _operandMeta: OperandArgs = [];
            const _operandArgs = exp.slice(1, exp.indexOf(">"));
            const _parsedVals = inclusiveParse(_operandArgs, /\S+/gd, pos + 1);
            const _index = this.opmeta.findIndex(v => v.name === op.opcode.name);
            exp = exp.slice(exp.indexOf(">") + 1);
            op.operandArgs = {
                position: [pos, pos + _operandArgs.length + 1],
                args: []
            };
            if (_index > -1) {
                if (typeof this.opmeta[_index].operand !== "number") {
                    _operandMeta = deepCopy(this.opmeta[_index].operand as OperandArgs);
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
                const _isValid = /^[0-9]+$|^0x[a-fA-F0-9]+$|^(?:')[a-z][a-z0-9-]*$/.test(v[0]);
                if (_isValid) {
                    let quoteIndex = -1;
                    let quoteValue = -1;
                    const quote = v[0].match(/^(?:')[a-z][a-z0-9-]*$/);
                    if (quote) {
                        quoteIndex = this.namedExpressions.findIndex(v => v.name === quote[0]);
                        if (quoteIndex === -1) this.problems.push({
                            msg: `undefined expression binding key: ${v[0]}`,
                            position: v[1],
                            code: ErrorCode.UndefinedExpression
                        });
                        else {
                            if (NamedExpression.isConstant(this.namedExpressions[quoteIndex])) {
                                quoteValue = Number((this.namedExpressions[
                                    quoteIndex
                                ].parseObj?.ast.lines[0].nodes[0] as ValueASTNode).value);
                            }
                        }
                    }
                    op.operandArgs!.args.push({
                        value: !v[0].startsWith("'") 
                            ? v[0] 
                            : quoteValue !== -1
                                ? quoteValue.toString()
                                : quoteIndex > -1 && resolveQuotes
                                    ? quoteIndex.toString() 
                                    : v[0].slice(1),
                        name: _operandMeta[i]?.name ?? "unknown",
                        position: v[1],
                        description: _operandMeta[i]?.desc ?? ""
                    });
                }
                else this.problems.push({
                    msg: `invalid argument pattern: ${v[0]}`,
                    position: v[1],
                    code: ErrorCode.InvalidWordPattern
                });
                if (_index > -1 && i >= _operandMeta.length) this.problems.push({
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

        const _index = this.opmeta.findIndex(v => v.name === _node.opcode.name);
        if (_index !== -1) {
            if (typeof this.opmeta[_index].outputs === "number") {
                _node.output = this.opmeta[_index].outputs as number;
            }
            if (this.opmeta[_index].operand === 0) {
                _node.operand = 0;
                if (_node.operandArgs) {
                    _node.operand = NaN;
                    this.problems.push({
                        msg: `opcode ${_node.opcode.name} doesn't have argumented operand`,
                        position: _node.operandArgs.position,
                        code: ErrorCode.MismatchOperandArgs
                    });
                }
                if (this.opmeta[_index].inputs === 0) {
                    if (_node.parameters.length) this.problems.push({
                        msg: "out-of-range inputs",
                        position: [..._node.parens],
                        code: ErrorCode.OutOfRangeInputs
                    });
                }
                else {
                    if (
                        _node.parameters.length !== 
                      (this.opmeta[_index].inputs as InputArgs).parameters.length
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
                const _argsLength = (
                  this.opmeta[_index].operand as OperandArgs
                ).find(
                    v => v.name === "inputs"
                )
                    ? (this.opmeta[_index].operand as OperandArgs).length - 1
                    : (this.opmeta[_index].operand as OperandArgs).length;
                if (_argsLength === (_node.operandArgs?.args.length ?? 0)) {
                    if ((_argsLength === 0 && !_node.operandArgs) || _argsLength > 0) {
                        let hasQuote = false;
                        if (_node.operandArgs?.args) {
                            for (let i = 0; i < _node.operandArgs.args.length; i++) {
                                if (WORD_PATTERN.test(_node.operandArgs!.args[i].value)) {
                                    hasQuote = true;
                                }
                            }
                        }
                        if (hasQuote) {
                            _node.operand = NaN;
                            if (typeof this.opmeta[_index].outputs !== "number") _node.output = NaN;
                        }
                        else {
                            const _operand = constructByBits(
                                (this.opmeta[_index].operand as OperandArgs).map((v, i) => {
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
                                if (typeof this.opmeta[_index].outputs !== "number") {
                                    _node.output = extractByBits(
                                        _operand, 
                                        (this.opmeta[_index].outputs as ComputedOutput).bits, 
                                        (this.opmeta[_index].outputs as ComputedOutput).computation
                                    );
                                }
                                if (this.opmeta[_index].inputs === 0) {
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
                                            (this.opmeta[_index].inputs as InputArgs)
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
                                if (typeof this.opmeta[_index].outputs !== "number") {
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
                        position: _node.opcode.position,
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
    private resolveWord(exp: string, entry: number, resolveQuotes = false): string {
        const _offset = this.findOffset(exp);
        const _index = _offset < 0 
            ? exp.length 
            : _offset;
        const _word = exp.slice(0, _index);
        const _wordPos: [number, number] = [entry, entry + _word.length - 1];
        exp = exp.replace(_word, "");
        const _aliasIndex = this.ast.lines.findIndex(v => !!v.aliases.find(e => e.name === _word));
        const _currentAliasIndex = this.state.aliases.findIndex(v => v.name === _word);
        const _bindingsAliasIndex = this.namedExpressions.findIndex(v => v.name === _word);

        if (exp.startsWith("(") || exp.startsWith("<")) {
            if (!_word) this.problems.push({
                msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                position: [..._wordPos],
                code: ErrorCode.ExpectedOpcode
            });
            else if (!_word.match(WORD_PATTERN)) this.problems.push({
                msg: `invalid word pattern: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.InvalidWordPattern
            });
            let _enum = this.opmeta.findIndex(v => v.name === _word);
            if (_enum === -1) _enum = this.opmeta.findIndex(v => v.aliases?.includes(_word));
            if (_enum === -1) this.problems.push({
                msg: `unknown opcode: "${_word}"`,
                position: [..._wordPos],
                code: ErrorCode.UnknownOp
            });
            let _op: OpASTNode = {
                opcode: {
                    name: _enum > -1 ? this.opmeta[_enum].name : "unknown opcode",
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
                resolveQuotes
            );
            if (exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._wordPos][1] + 1;
                exp = exp.replace("(", "");
                this.state.parens.open.push(_pos);
                _op.parens[0] = _pos;
                this.updateAST(_op);
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
        else if (_aliasIndex > -1 || _currentAliasIndex > -1 || _bindingsAliasIndex > -1) {
            if (!_word.match(WORD_PATTERN)) this.problems.push({
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
                if (!NamedExpression.isConstant(this.namedExpressions[_bindingsAliasIndex])) {
                    this.problems.push({
                        msg: "unexpected usage of expression key",
                        position: [..._wordPos],
                        code: ErrorCode.UnexpectedExpressionKeyUsage
                    });
                }
            }
            this.updateAST({
                name: _word,
                position: [..._wordPos]
            });
        }
        else if (_word.match(NUMERIC_PATTERN)) {
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
        else if (WORD_PATTERN.test(_word)) {
            if (Object.keys(this.constants).includes(_word)) {
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
}
