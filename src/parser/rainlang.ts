
import { Meta } from "@rainprotocol/meta";
import { RainDocument } from "./rainDocument";
import { 
    AST, 
    ErrorCode, 
    TextDocument, 
    HASH_PATTERN,  
    WORD_PATTERN, 
    ILLEGAL_CHAR, 
    NUMERIC_PATTERN, 
    NATIVE_PARSER_ABI 
} from "../languageTypes";
import {
    fillIn,
    hexlify, 
    toInteger, 
    CONSTANTS, 
    isBytesLike, 
    trackedTrim, 
    execBytecode, 
    inclusiveParse, 
    exclusiveParse 
} from "./helpers";


/**
 * @public 
 * Method to be used as Tagged Templates to activate embedded rainlang in 
 * javascript/typescript in vscode that highlights the rainlang syntax. 
 * Requires rainlang vscode extension to be installed.
 */
export function rainlang(
    stringChunks: TemplateStringsArray,
    ...vars: any[]
): string {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
}

/**
 * @public
 * Rainlang class is a the main workhorse that does all the heavy work of parsing a document, 
 * written in TypeScript in order to parse a text document using an authoring meta into known types 
 * which later will be used in RainDocument object and Rain Language Services and Compiler
 */
export class Rainlang {
    public text: string;
    public ast: AST.Rainlang = [];
    public problems: AST.Problem[] = [];
    public comments: AST.Comment[] = [];
    public authoringMeta: Meta.Authoring[] = [];
    public bytecode = "";
    public namespaces: AST.Namespace = {};
    public binding?: AST.Binding;
    
    private _ignoreUAM = false;
    private state: {
        nodes: AST.Node[];
        aliases: AST.Alias[];
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
     * @param authoringMeta - Array of ops metas
     * @param authoringMeta - ExpressionDeployerNP deployed bytecode
     * @param dotrainOptions - RainDocument (dotrain) only options
     */
    constructor(
        text: string,
        authoringMeta: Meta.Authoring[],
        bytecode: string,
        dotrainOptions?: { 
            /**
             * RainDocument namespace
             */
            namespaces?: AST.Namespace;
            // /**
            //  * 
            //  */
            // thisBinding?: AST.Binding;
            /**
             * option to ignore unknown opcodes
             */
            ignoreAuthoringMeta?: boolean
        }
    ) {
        this.text = text;
        this.bytecode = bytecode;
        this.authoringMeta = authoringMeta;
        if (dotrainOptions?.namespaces) this.namespaces = dotrainOptions.namespaces;
        // if (dotrainOptions?.thisBinding) this.binding = dotrainOptions.thisBinding;
        if (dotrainOptions?.ignoreAuthoringMeta) {
            this._ignoreUAM = dotrainOptions.ignoreAuthoringMeta;
        }
        this.parse();
    }


    /**
     * Creates a new Rainlang instance with a contract bytecode
     * @param text - The text
     * @param bytecode - The ExpressionDeployerNP deployed bytecode
     * @param metaStore - (optional) The Meta.Store instance
     */
    public static async create(
        text: string, 
        bytecode: string, 
        metaStore?: Meta.Store
    ): Promise<Rainlang>

    /**
     * Creates a new Rainlang instance with a bytecode meta hash
     * @param text - The text
     * @param bytecodeHash - The bytecode meta hash
     * @param metaStore - (optional) The Meta.Store instance
     */
    public static async create(
        text: string, 
        bytecodeHash: string, 
        metaStore?: Meta.Store
    ): Promise<Rainlang>

    public static async create(
        text: string, 
        bytecodeSource: string, 
        metaStore?: Meta.Store
    ): Promise<Rainlang> {
        let _bytecode;
        let _dispair;
        const _metaStore = metaStore ?? new Meta.Store();
        if (!isBytesLike(bytecodeSource)) throw new Error("invalid bytecode");
        if (HASH_PATTERN.test(bytecodeSource)) {
            let _record = _metaStore.getMeta(bytecodeSource);
            if (!_record) {
                await _metaStore.update(bytecodeSource);
                _record = _metaStore.getMeta(bytecodeSource);
                if (!_record) throw new Error("cannot find settlement for provided bytecode hash");
            }
            const _map = Meta.decode(_record).find(
                v => v.get(1) === Meta.MagicNumbers.EXPRESSION_DEPLOYER_V2_BYTECODE_V1
            );
            if (!_map) throw new Error("cannot find settlement for provided bytecode hash");
            _bytecode = Meta.decodeMap(_map);
            if (typeof _bytecode === "string") throw new Error("corrupt bytecode meta");
            _dispair = bytecodeSource;
        }
        else {
            _bytecode = bytecodeSource;
            _dispair = await Meta.hash([{
                payload: bytecodeSource,
                magicNumber: Meta.MagicNumbers.EXPRESSION_DEPLOYER_V2_BYTECODE_V1,
                contentType: "application/octet-stream"
            }], false);
        }
        
        const _authoringMetaHash = (await execBytecode(
            _bytecode,
            NATIVE_PARSER_ABI,
            "authoringMetaHash",
            []
        ))[0]?.toLowerCase();
        let _authoringMetaBytes = await _metaStore.getAuthoringMeta(
            _authoringMetaHash,
            "authoring-meta-hash"
        );
        if (!_authoringMetaBytes) {
            _authoringMetaBytes = await _metaStore.getAuthoringMeta(_dispair, "deployer-bytecode-hash");
        }
        if (!_authoringMetaBytes) throw new Error(
            "cannot find any settlement for authoring meta of specified dispair source"
        );
        else {
            try {
                const _authoringMeta = Meta.Authoring.abiDecode(
                    _authoringMetaBytes
                );
                return new Rainlang(
                    text,
                    _authoringMeta,
                    hexlify(_bytecode, { allowMissingPrefix: true })
                );
            }
            catch (error) {
                throw new Error("corrupt authoring meta");
            }
        }
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
     * @public Get the current runtime error of this Rainlang instance
     */
    public getRuntimeError(): Error | undefined {
        return this.state.runtimeError;
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

    // /**
    //  * @internal Method to count outputs of nodes in a parse tree
    //  */
    // private countOutputs(nodes: AST.Node[]): number {
    //     let _count = 0;
    //     for (const _node of nodes) {
    //         if (AST.Opcode.is(_node)) {
    //             if (!isNaN(_node.output)) _count += _node.output;
    //             else return NaN;
    //         }
    //         else _count++;
    //     }
    //     return _count;
    // }

    /**
     * @internal 
     * The main workhorse of Rainlang which parses the words used in an
     * expression and is responsible for building the parse tree and collect problems
     */
    private _parse() {
        this.resetState();
        this.ast                = [];
        this.problems           = [];
        this.comments           = [];
        this.state.runtimeError = undefined;
        let document            = this.text;

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
        // if (!this.binding) {
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
        // }
        
        const _sourceExp: string[] = [];
        const _sourceExpPos: AST.Offsets[] = []; 

        // begin parsing expression sources and cache them
        exclusiveParse(document, /;/gd).forEach((v, i, a) => {
            // trim excess whitespaces from start and end of the whole text
            const _trimmed = trackedTrim(v[0]);

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
            ...this.authoringMeta.map(v => v.word),
            // ...this.authoringMeta.map(v => v.aliases).filter(v => v !== undefined).flat(),
            ...Object.keys(RainDocument.CONSTANTS),
        ];
        for (let i = 0; i < _sourceExp.length; i++) {
            const _reservedKeys = [
                ..._mainResKeys,
                // ...this.expNames
                ...Object.keys(this.namespaces)
            ];
            const _endDels: number[] = [];
            const _subExp: string[] = [];
            const _subExpPos: AST.Offsets[] = [];
            this.ast.push({ lines: [], position: [..._sourceExpPos[i]] });

            // parse and cache the sub-expressions
            exclusiveParse(_sourceExp[i], /,/gd, _sourceExpPos[i][0], true).forEach(v => {
                const _trimmed = trackedTrim(v[0]);
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

                    // // validating RHS against LHS
                    // const _outputCount = this.countOutputs(this.state.nodes);
                    // if (!isNaN(_outputCount)) {
                    //     const _tags = [...this.state.aliases];
                    //     if (!(
                    //         this.ast[i].lines.map(v => v.nodes).flat().length === 0 && 
                    //         this.state.nodes.length === 0
                    //     )) {
                    //         for (let k = 0; k < this.state.nodes.length; k++) {
                    //             const _node = this.state.nodes[k];
                    //             _node.lhsAlias = [];
                    //             if (AST.Opcode.is(_node)) {
                    //                 if (_node.output > 0) {
                    //                     if (_tags.length >= _node.output) {
                    //                         for (let k = 0; k < _node.output; k++) {
                    //                             _node.lhsAlias.push(_tags.shift()!);
                    //                         }
                    //                     }
                    //                     else {
                    //                         for (let l = 0; l < _tags.length; l++) {
                    //                             _node.lhsAlias.push(_tags.shift()!);
                    //                         }
                    //                         // this.problems.push({
                    //                         //     msg: "no LHS item exists to match this RHS item",
                    //                         //     position: [..._node.position],
                    //                         //     code: ErrorCode.MismatchLHS
                    //                         // });
                    //                     }
                    //                 }
                    //             }
                    //             else {
                    //                 if (_tags.length >= 1) _node.lhsAlias.push(_tags.shift()!);
                    //                 // else this.problems.push({
                    //                 //     msg: "no LHS item exists to match this RHS item",
                    //                 //     position: [..._node.position],
                    //                 //     code: ErrorCode.MismatchLHS
                    //                 // });
                    //             }
                    //         }
                    //         if (_tags.length > 0) {
                    //             // for (let k = 0; k < _tags.length; k++) {
                    //             //     this.problems.push({
                    //             //         msg: `no RHS item exists to match this LHS item: ${
                    //             //             _tags[k].name
                    //             //         }`,
                    //             //         position: [..._tags[k].position],
                    //             //         code: ErrorCode.MismatchRHS
                    //             //     });
                    //             // }
                    //         }
                    //     }
                    // }
                    // else for (let k = 0; k < this.state.nodes.length; k++) {
                    //     this.state.nodes[k].lhsAlias = [];
                    // }
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

        // ignore next line problems
        this.comments.forEach(v => {
            if (/\bignore-next-line\b/.test(v.comment)) {
                const _td = TextDocument.create("untitled", "rainlang", 0, this.text);
                const _astLine = this.ast.flatMap(
                    e => e.lines
                ).find(e => 
                    _td.positionAt(e.position[0]).line === 
                    _td.positionAt(v.position[1] + 1).line + 1
                );
                if (_astLine) {
                    let _index;
                    while (
                        (_index = this.problems.findIndex(
                            e => e.position[0] >= _astLine.position[0] && 
                            e.position[1] <= _astLine.position[1]
                        )) > -1
                    ) {
                        this.problems.splice(_index, 1);
                    }
                }
            }
        });
    }

    /**
     * @internal Method to update the parse state
     */
    private updateState(node: AST.Node) {
        let _nodes: AST.Node[] = this.state.nodes;
        for (let i = 0; i < this.state.depth; i++) {
            _nodes = (_nodes[_nodes.length - 1] as AST.Opcode).parameters;
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
                    this.processOpcode();
                    this.state.depth--;
                }
                else this.problems.push({
                    msg: "unexpected \")\"",
                    position: [_currentPosition, _currentPosition],
                    code: ErrorCode.UnexpectedClosingParen
                });
                exp = exp.slice(1);
                if (exp && !exp.match(/^[\s),]/)) this.problems.push({
                    msg: "expected to be separated by space",
                    position: [_currentPosition, _currentPosition + 1],
                    code: ErrorCode.ExpectedSpace
                });
            }
            else exp = this.processChunk(exp, _currentPosition);
        }
    }

    /**
     * @internal Method to handle operand arguments
     */
    private processOperand(exp: string, pos: number, op: AST.Opcode): [string, AST.Opcode] {
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
            const _operandMeta: any[] = [];
            const _operandArgs = exp.slice(1, exp.indexOf(">"));
            const _parsedVals = inclusiveParse(_operandArgs, /\S+/gd, pos + 1);
            // const _opmeta = this.opmeta.find(v => v.name === op.opcode.name);
            // const _word = this.searchWord(op);
            exp = exp.slice(exp.indexOf(">") + 1);
            op.operandArgs = {
                position: [pos, pos + _operandArgs.length + 1],
                args: []
            };
            // if (_opmeta) {
            //     if (typeof _opmeta.operand !== "number") {
            //         _operandMeta = deepCopy(_opmeta.operand as OperandArgs);
            //         const _i = _operandMeta.findIndex(v => v.name === "inputs");
            //         if (_i > -1) _operandMeta.splice(_i, 1);
            //     }
            //     if (_operandMeta.length === 0) this.problems.push({
            //         msg: `opcode ${op.opcode.name} doesn't have argumented operand`,
            //         position: [pos, pos + _operandArgs.length + 1],
            //         code: ErrorCode.MismatchOperandArgs
            //     });
            //     if (_operandMeta.length > _parsedVals.length) this.problems.push({
            //         msg: `expected ${
            //             _operandMeta.length - _parsedVals.length
            //         }${
            //             _parsedVals.length ? " more" : ""
            //         } operand argument${
            //             (_operandMeta.length - _parsedVals.length) > 1 ? "s" : ""
            //         } for ${
            //             op.opcode.name
            //         }`,
            //         position: [pos, pos + _operandArgs.length + 1],
            //         code: ErrorCode.MismatchOperandArgs
            //     });
            // }
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
                                if (AST.Namespace.isBinding(this.namespaces[_quote])) {
                                    if ("elided" in this.namespaces[_quote].Element) {
                                        this.problems.push({
                                            msg: (this.namespaces[
                                                _quote
                                            ].Element as AST.Binding).elided!,
                                            position: v[1],
                                            code: ErrorCode.ElidedBinding
                                        });
                                    }
                                    if ("constant" in this.namespaces[_quote].Element) {
                                        this.problems.push({
                                            msg: `invalid quote: ${_quote}, cannot quote constants`,
                                            position: v[1],
                                            code: ErrorCode.InvalidQuote
                                        });
                                    }
                                    if ((this.namespaces[
                                        _quote
                                    ].Element as AST.Binding).problems.find(
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
                        name: _operandMeta[i]?.name ?? "operand arg",
                        position: v[1],
                        description: _operandMeta[i]?.desc ?? ""
                    });
                }
                else this.problems.push({
                    msg: `invalid argument pattern: ${v[0]}`,
                    position: v[1],
                    code: ErrorCode.InvalidOperandArg
                });
                // if (_word && i >= _operandMeta.length) this.problems.push({
                //     msg: `unexpected operand argument for ${op.opcode.name}`,
                //     position: v[1],
                //     code: ErrorCode.MismatchOperandArgs
                // });
            });
        }
        return [exp, op];
    }

    /**
     * @internal Method that resolves the RDOpNode once its respective closing paren has been consumed
     */
    private processOpcode = () => {
        this.state.parens.open.pop();
        const _endPosition = this.state.parens.close.pop()!;
        let _nodes: AST.Node[] = this.state.nodes;
        for (let i = 0; i < this.state.depth - 1; i++) {
            _nodes = (_nodes[_nodes.length - 1] as AST.Opcode).parameters;
        }
        const _node = _nodes[_nodes.length - 1] as AST.Opcode;
        _node.position[1] = _endPosition;
        _node.parens[1] = _endPosition;

        const _i = this.problems.findIndex(
            v => v.msg === "expected \")\"" && 
            v.position[0] === _node.opcode.position[0] &&
            v.position[1] === _node.parens[0]
        );
        if (_i > -1) this.problems.splice(_i, 1);

        const _word = this.searchWord(_node);
        if (_word) {
            _node.output = 1;
            _node.operand = 0;
            // if (typeof _opmeta.outputs === "number") {
            //     _node.output = _opmeta.outputs as number;
            // }
            // if (typeof _opmeta.operand === "number") {
            //     _node.operand = _opmeta.operand;
            //     if (_node.operandArgs) {
            //         _node.operand = NaN;
            //         this.problems.push({
            //             msg: `opcode ${_node.opcode.name} doesn't have argumented operand`,
            //             position: [..._node.operandArgs.position],
            //             code: ErrorCode.MismatchOperandArgs
            //         });
            //     }
            //     if (_opmeta.inputs === 0) {
            //         if (_node.parameters.length) this.problems.push({
            //             msg: "out-of-range inputs",
            //             position: [..._node.parens],
            //             code: ErrorCode.OutOfRangeInputs
            //         });
            //     }
            //     else {
            //         if (
            //             _node.parameters.length !== 
            //           (_opmeta.inputs as InputArgs).parameters.length
            //         ) this.problems.push({
            //             msg: "out-of-range inputs",
            //             position: [..._node.parens],
            //             code: ErrorCode.OutOfRangeInputs
            //         });
            //     }
            // }
            // else {
            //     let _argIndex = 0;
            //     let _inputsIndex = -1;
            //     const _argsLength = (_opmeta.operand as OperandArgs)
            //         .find(v => v.name === "inputs")
            //         ? (_opmeta.operand as OperandArgs).length - 1
            //         : (_opmeta.operand as OperandArgs).length;

            //     if (_argsLength === (_node.operandArgs?.args.length ?? 0)) {
            //         if ((_argsLength === 0 && !_node.operandArgs) || _argsLength > 0) {
            //             let _hasQuote = false;
            //             if (_node.operandArgs?.args) {
            //                 for (let i = 0; i < _node.operandArgs.args.length; i++) {
            //                     if (!/^[0-9]+$|^0x[a-fA-F0-9]+$/.test(
            //                         _node.operandArgs!.args[i].value
            //                     )) _hasQuote = true;
            //                 }
            //             }
            //             if (_hasQuote) {
            //                 _node.operand = NaN;
            //                 if (typeof _opmeta.outputs !== "number") _node.output = NaN;
            //             }
            //             else {
            //                 const _operand = constructByBits(
            //                     (_opmeta.operand as OperandArgs).map((v, i) => {
            //                         if (v.name === "inputs") {
            //                             _inputsIndex = i;
            //                             return {
            //                                 value: _node.parameters.length,
            //                                 bits: v.bits,
            //                                 computation: v.computation,
            //                                 validRange: v.validRange
            //                             };
            //                         }
            //                         else return {
            //                             value: Number(
            //                               _node.operandArgs!.args[_argIndex++]?.value
            //                             ),
            //                             bits: v.bits,
            //                             computation: v.computation,
            //                             validRange: v.validRange
            //                         };
            //                     })
            //                 );
            //                 if (typeof _operand === "number") {
            //                     _node.operand = _operand;
            //                     if (_node.isCtx) {
            //                         _node.operand = ((_opmeta as any).column << 8) + _operand;
            //                     }
            //                     if (typeof _opmeta.outputs !== "number") {
            //                         _node.output = extractByBits(
            //                             _operand, 
            //                             (_opmeta.outputs as ComputedOutput).bits, 
            //                             (_opmeta.outputs as ComputedOutput).computation
            //                         );
            //                     }
            //                     if (_opmeta.inputs === 0) {
            //                         if (_node.parameters.length) this.problems.push({
            //                             msg: "out-of-range inputs",
            //                             position: [..._node.parens],
            //                             code: ErrorCode.OutOfRangeInputs
            //                         });
            //                     }
            //                     else {
            //                         if (_inputsIndex === -1) {
            //                             if (
            //                                 _node.parameters.length !== 
            //                                 (_opmeta.inputs as InputArgs)
            //                                     .parameters.length
            //                             ) this.problems.push({
            //                                 msg: "out-of-range inputs",
            //                                 position: [..._node.parens],
            //                                 code: ErrorCode.OutOfRangeInputs
            //                             });
            //                         }
            //                     }
            //                 }
            //                 else {
            //                     _node.operand = NaN;
            //                     if (typeof _opmeta.outputs !== "number") {
            //                         _node.output = NaN;
            //                     }
            //                     for (const _oprnd of _operand) {
            //                         if (_inputsIndex > -1) {
            //                             if (_oprnd === _inputsIndex) this.problems.push({
            //                                 msg: "out-of-range inputs",
            //                                 position: [..._node.parens],
            //                                 code: ErrorCode.OutOfRangeInputs
            //                             });
            //                             else if (_oprnd < _inputsIndex) this.problems.push({
            //                                 msg: "out-of-range operand argument",
            //                                 position: [
            //                                     ..._node.operandArgs!.args[_oprnd].position
            //                                 ],
            //                                 code: ErrorCode.OutOfRangeOperandArgs
            //                             });
            //                             else this.problems.push({
            //                                 msg: "out-of-range operand argument",
            //                                 position: [
            //                                     ..._node.operandArgs!.args[_oprnd - 1].position
            //                                 ],
            //                                 code: ErrorCode.OutOfRangeOperandArgs
            //                             });
            //                         }
            //                         else this.problems.push({
            //                             msg: "out-of-range operand argument",
            //                             position: [..._node.operandArgs!.args[_oprnd].position],
            //                             code: ErrorCode.OutOfRangeOperandArgs
            //                         });
            //                     }
            //                 }
            //             }
            //         }
            //         else _node.operand = NaN;
            //     }
            //     else {
            //         _node.operand = NaN;
            //         if (_argsLength > 0 && !_node.operandArgs) this.problems.push({
            //             msg: `expected operand arguments for opcode ${_node.opcode.name}`,
            //             position: [..._node.opcode.position],
            //             code: ErrorCode.ExpectedOperandArgs
            //         });
            //     }
            // }
            // if (_node.output === 0 && this.state.depth > 1) this.problems.push({
            //     msg: "zero output opcodes cannot be nested",
            //     position: [..._node.position],
            //     code: ErrorCode.InvalidNestedNode
            // });
            // if (_node.output > 1 && this.state.depth > 1) this.problems.push({
            //     msg: "multi output opcodes cannot be nested",
            //     position: [..._node.position],
            //     code: ErrorCode.InvalidNestedNode
            // });
        }
    };

    /**
     * @internal Method that parses an upcoming word to a rainlang AST node
     */
    private processChunk(exp: string, entry: number): string {
        const _offset = this.findNextBoundry(exp);
        const _index = _offset < 0 
            ? exp.length 
            : _offset;
        const _chunk = exp.slice(0, _index);
        const _chunkPos: [number, number] = [entry, entry + _chunk.length - 1];
        exp = exp.replace(_chunk, "");

        if (exp.startsWith("(") || exp.startsWith("<")) {
            let _opcode;
            if (!_chunk) this.problems.push({
                msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                position: [..._chunkPos],
                code: ErrorCode.ExpectedOpcode
            });
            if (_chunk.includes(".")) {
                const _tempOpcode = this.searchName(_chunk, entry, true, true);
                if (_tempOpcode && ("word" in _tempOpcode || "column" in _tempOpcode)) {
                    _opcode = _tempOpcode;
                }
            }
            else {
                if (!_chunk.match(WORD_PATTERN)) this.problems.push({
                    msg: `invalid word pattern: "${_chunk}"`,
                    position: [..._chunkPos],
                    code: ErrorCode.InvalidWordPattern
                });
                _opcode = this.authoringMeta.find(
                    v => v.word === _chunk
                );
                if (!_opcode) {
                    if (
                        this.namespaces[_chunk] && (
                            AST.Namespace.isWord(this.namespaces[_chunk]) || 
                            AST.Namespace.isContextAlias(this.namespaces[_chunk])
                        )
                        
                    ) _opcode = this.namespaces[
                        _chunk
                    ].Element as Meta.Authoring | AST.ContextAlias;
                }
            }
            if (!_opcode && !this._ignoreUAM) this.problems.push({
                msg: `unknown opcode: "${_chunk}"`,
                position: [..._chunkPos],
                code: ErrorCode.UndefinedOpcode
            });
            let _op: AST.Opcode = {
                opcode: {
                    name: _chunk,
                    description: _opcode ? _opcode.description : "",
                    position: [..._chunkPos],
                },
                operand: NaN,
                output: NaN,
                position: [[..._chunkPos][0], NaN],
                parens: [NaN, NaN],
                parameters: []
            };
            if (_opcode && "column" in _opcode) _op.isCtx = true;
            if (exp.startsWith("<")) [exp, _op] = this.processOperand(
                exp, 
                entry + _chunk.length, 
                _op
            );
            if (exp.startsWith("(")) {
                const _pos = _op.operandArgs 
                    ? [..._op.operandArgs!.position][1] + 1 
                    : [..._chunkPos][1] + 1;
                exp = exp.replace("(", "");
                this.state.parens.open.push(_pos);
                _op.parens[0] = _pos;
                this.updateState(_op);
                this.state.depth++;
                this.problems.push({
                    msg: "expected \")\"",
                    position: [[..._chunkPos][0], _pos],
                    code: ErrorCode.ExpectedClosingParen
                });
            }
            else {
                this.problems.push({
                    msg: "expected \"(\"",
                    position: [..._chunkPos],
                    code: ErrorCode.ExpectedOpeningParen
                });
            }
        }
        else {
            if (_chunk.includes(".")) {
                if (
                    _chunk.startsWith(".") && 
                    WORD_PATTERN.test(_chunk.slice(1)) &&
                    _chunk.slice(1) === this.binding?.name
                ) {
                    this.problems.push({
                        msg: "cannot reference self",
                        position: [..._chunkPos],
                        code: ErrorCode.InvalidSelfReference
                    });
                    this.updateState({
                        name: _chunk,
                        position: [..._chunkPos]
                    });
                }
                else {
                    const _tempItem = this.searchName(_chunk, entry, true);
                    if (_tempItem) {
                        if ("content" in _tempItem) {
                            if (_tempItem.constant) this.updateState({
                                id: _chunk,
                                value: _tempItem.constant,
                                position: [..._chunkPos],
                            });
                            else {
                                const _msg = _tempItem.elided
                                    ? _tempItem.elided
                                    : `invalid reference to binding: ${
                                        _chunk
                                    }, only contant bindings can be referenced`;
                                this.problems.push({
                                    msg: _msg,
                                    position: [..._chunkPos],
                                    code: _tempItem.elided
                                        ? ErrorCode.ElidedBinding
                                        : ErrorCode.InvalidReference
                                });
                                this.updateState({
                                    name: _chunk,
                                    position: [..._chunkPos]
                                });
                            }
                        }
                        else {
                            this.problems.push({
                                msg: `invalid reference to ${
                                    "word" in _tempItem
                                        ? "opcode"
                                        : "context alias"
                                }: ${_chunk}`,
                                position: [..._chunkPos],
                                code: ErrorCode.InvalidReference
                            });
                            this.updateState({
                                name: _chunk,
                                position: [..._chunkPos]
                            });
                        }
                    }
                    else this.updateState({
                        name: _chunk,
                        position: [..._chunkPos]
                    });
                }
            }
            else {
                if (_chunk.match(NUMERIC_PATTERN)) {
                    // let _val = _word;
                    // if (_word.startsWith("0b")) _val = Number(_word).toString();
                    // else if (!isBigNumberish(_word)) {
                    //     const _nums = _word.match(/\d+/g)!;
                    //     _val = _nums[0] + "0".repeat(Number(_nums[1]));
                    // }
                    if (CONSTANTS.MaxUint256.lt(toInteger(_chunk))) {
                        this.problems.push({
                            msg: "value greater than 32 bytes in size",
                            position: [..._chunkPos],
                            code: ErrorCode.OutOfRangeValue
                        });
                    }
                    this.updateState({
                        value: _chunk,
                        position: [..._chunkPos],
                    });
                }
                else if (WORD_PATTERN.test(_chunk)) {
                    if (Object.keys(RainDocument.CONSTANTS).includes(_chunk)) {
                        this.updateState({
                            id: _chunk,
                            value: RainDocument.CONSTANTS[_chunk],
                            position: [..._chunkPos],
                        });
                    }
                    else {
                        if (this.state.aliases.find(v => v.name === _chunk)) {
                            this.problems.push({
                                msg: "cannot reference self",
                                position: [..._chunkPos],
                                code: ErrorCode.InvalidSelfReference
                            });
                            this.updateState({
                                name: _chunk,
                                position: [..._chunkPos]
                            });
                        }
                        else if (this.ast[this.ast.length - 1].lines.find(
                            v => !!v.aliases.find(e => e.name === _chunk)
                        )) this.updateState({
                            name: _chunk,
                            position: [..._chunkPos]
                        });
                        else if (_chunk === this.binding?.name) {
                            this.problems.push({
                                msg: "cannot reference self",
                                position: [..._chunkPos],
                                code: ErrorCode.InvalidSelfReference
                            });
                            this.updateState({
                                name: _chunk,
                                position: [..._chunkPos]
                            });
                        }
                        else if (this.namespaces[_chunk]) {
                            if ("Element" in this.namespaces[_chunk]) {
                                const _item = this.namespaces[
                                    _chunk
                                ].Element as AST.Binding | Meta.Authoring | AST.ContextAlias;
                                if ("content" in _item) {
                                    if (_item.constant) this.updateState({
                                        id: _chunk,
                                        value: _item.constant,
                                        position: [..._chunkPos],
                                    });
                                    else {
                                        const _msg = _item.elided
                                            ? _item.elided
                                            : `invalid reference to binding: ${
                                                _chunk
                                            }, only contant bindings can be referenced`;
                                        this.problems.push({
                                            msg: _msg,
                                            position: [..._chunkPos],
                                            code: _item.elided
                                                ? ErrorCode.ElidedBinding
                                                : ErrorCode.InvalidReference
                                        });
                                        this.updateState({
                                            name: _chunk,
                                            position: [..._chunkPos]
                                        });
                                    }
                                }
                                else {
                                    this.problems.push({
                                        msg: `invalid reference to ${
                                            "word" in _item
                                                ? "opcode"
                                                : "context alias"
                                        }: ${_chunk}`,
                                        position: [..._chunkPos],
                                        code: ErrorCode.InvalidReference
                                    });
                                    this.updateState({
                                        name: _chunk,
                                        position: [..._chunkPos]
                                    });
                                }
                            }
                            else {
                                this.problems.push({
                                    msg: `invalid reference to namespace: ${_chunk}`,
                                    position: [..._chunkPos],
                                    code: ErrorCode.InvalidReference
                                });
                                this.updateState({
                                    name: _chunk,
                                    position: [..._chunkPos]
                                });
                            }
                        }
                        else {
                            this.problems.push({
                                msg: `undefined word: ${_chunk}`,
                                position: [..._chunkPos],
                                code: ErrorCode.UndefinedWord
                            });
                            this.updateState({
                                name: _chunk,
                                position: [..._chunkPos]
                            });
                        }
                    }
                }
                else {
                    this.problems.push({
                        msg: `"${_chunk}" is not a valid rainlang word`,
                        position: [..._chunkPos],
                        code: ErrorCode.InvalidWordPattern
                    });
                    this.updateState({
                        name: _chunk,
                        position: [..._chunkPos]
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
        publishDiagnostics: boolean,
        isOpcode = false
    ): Meta.Authoring | AST.ContextAlias | AST.Binding | undefined {
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
                if (publishDiagnostics) {
                    if (!(isOpcode && this._ignoreUAM)) this.problems.push({
                        msg: `namespace has no member "${_names[i][0]}"`,
                        position: _names[i][1],
                        code: ErrorCode.UndefinedNamespaceMember
                    });
                }
                return undefined;
            }
        }
        if (!("Element" in _result)) {
            if (publishDiagnostics) this.problems.push({
                msg: `expected to end with a node, "${_names[_names.length - 1][0]}" is a namespace`,
                position: [offset, offset + name.length - 1],
                code: ErrorCode.UnexpectedNamespacePath
            });
            return undefined;
        }
        else return _result.Element;
    }

    /**
     * @internal search for Word in namespaces
     */
    private searchWord(node: AST.Opcode | string): Meta.Authoring | undefined {
        let _word;
        const _name = typeof node === "string" ? node : node.opcode.name;
        if (_name.includes(".")) {
            const _tempOpcode = this.searchName(_name, 0, false);
            if (_tempOpcode && ("word" in _tempOpcode || "column" in _tempOpcode)) {
                _word = _tempOpcode;
            }
        }
        else {
            _word = this.authoringMeta.find(v => v.word === _name);
            if (!_word) {
                if (
                    this.namespaces[_name] && (
                        AST.Namespace.isWord(this.namespaces[_name]) || 
                        AST.Namespace.isContextAlias(this.namespaces[_name])
                    )
                ) _word = this.namespaces[_name].Element as Meta.Authoring | AST.ContextAlias;
            }
        }
        if (_word && "column" in _word) {
            const _temp = {
                name: _word.name,
                desc: _word.description,
                operand: isNaN(_word.row)
                    ? [{
                        name: "Row Index",
                        bits: [0, 7]
                    }]
                    : (_word.column << 8) + _word.row,
                inputs: 0,
                outputs: 1
            } as any;
            if (isNaN(_word.row)) _temp.column = _word.column;
            _word = _temp;
        }
        return _word;
    }
}
