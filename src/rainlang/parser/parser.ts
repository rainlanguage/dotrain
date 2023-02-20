/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BigNumberish, BytesLike, ethers } from 'ethers';
import OpMetaSchema from "../../schema/op.meta.schema.json";
import { ParseTree, State, Node, Diagnostic, Op, Comment } from './types';
import { 
    OpMeta,
    InputMeta,
    InputArgs,
    OutputMeta,
    OperandArgs,
    OperandMeta,
    ComputedOutput,
    ExpressionConfig
} from '../../types';
import {
    op,
    concat,
    hexlify,
    MemoryType,
    validateMeta,
    extractByBits,
    memoryOperand,
    metaFromBytes,
    isBigNumberish,
    constructByBits,
} from '../../utils';


/**
 * @public
 * Rain Parser is a compiler written in TypeScript in order to parse, compile and output 
 * Rain Expressions into deployable bytes for Rain Protocol's smart contracts and also a
 * parse tree object which contains all the parsed data and info of the opcode, values, 
 * errors and ... that can be used by the caller, for example to be make an enriched Rain
 * in-bowser text editor.
 * Rain Parser uses an standard opcode metadata callled OpMeta in order to parse opcodes
 * into deployable bytes of an Rain Interpreter.
 *
 * @example
 * ```typescript
 * // to import
 * import { Parser } from 'rainlang';
 *
 * // to execute the parsing and get parse tree object and ExpressionConfig
 * let parseTree;
 * let expressionConfig
 * [ parseTree, expressionConfig ] = Parser.get(textScript, opMeta, callback);
 *
 * // to get parse tree object only
 * let parseTree = Parser.getParseTree(textScript, opMeta, callback);
 *
 * // to get ExpressionConfig only
 * let expressionConfig = Parser.getExpressionConfig(textScript, opMeta, callback);
 *
 * // to build ExpressionConfig (compile) from ParseTree object or a Node or array of Node
 * let argument: Node || Node[] || ParseTree
 * let expressionConfig = Parser.compile(argument)
 * ```
 */
export class Parser {
    public static wordPattern = /^[a-z][0-9a-z-]*$/
    public static numericPattern = /^0x[0-9a-zA-Z]+$|^0b[0-1]+$|^\d+$|^[1-9]\d*e\d+$/
    public static constants: BigNumberish[] = []
    public static sources: BytesLike[] = []
    public static parseTree: ParseTree = {}

    private static exp: string
    private static diagnostics: Diagnostic[] = []
    private static operandArgsErr = false
    private static expConf: ExpressionConfig | undefined
    private static comments: Comment[] = []
    private static treeArray: Record<number, Node[]> = {}
    private static opmeta: OpMeta[] = []
    private static names: string[] = []
    private static pops: InputMeta[] = []
    private static pushes: OutputMeta[] = []
    private static operand: OperandMeta[] = []
    private static aliases: (string[] | undefined)[] = []
    private static state: State = {
        parse: {
            tree: [],
            tags: []
        },
        track: {
            parens: {
                open: [],
                close: []
            }
        },
        depthLevel: 0
    }

    /**
     * @public
     * Method to get parse tree object and ExpressionConfig
     *
     * @param expression - the text expression
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed)
     * @param callback - (optional) A callback fn to handle diagnotics and runtime errors
     * @returns Array of parse tree object and ExpressionConfig
     */
    public static get(
        expression: string,
        opmeta: Uint8Array | string | object[],
        callback?: (diagnostics: Diagnostic[], error?: Error) => void
    ): [
        ParseTree & { diagnostics: Diagnostic[], comments: Comment[] }, 
        (ExpressionConfig | undefined)
    ] | undefined {
        let _opmeta: OpMeta[]
        if (isBigNumberish(opmeta)) {
            _opmeta = metaFromBytes(opmeta as BytesLike, OpMetaSchema) as OpMeta[]
        }
        else {
            const _meta = typeof opmeta === "string" ? JSON.parse(opmeta) : opmeta
            if (validateMeta(_meta, OpMetaSchema)) _opmeta = _meta as OpMeta[]
            else throw new Error("invalid op meta")
        }
        try {
            this._parse(expression, _opmeta)
            if (callback) callback(this.diagnostics)
            return [
                {   ... this.parseTree,
                    comments: this.comments,
                    diagnostics: this.diagnostics
                } as any,
                this.expConf
            ]
        }
        catch (err) {
            if (callback) callback(this.diagnostics, err as Error)
            else console.log(err)
            return undefined
        }
    }

    /**
     * @public
     * Method to get the parse tree object
     *
     * @param expression - the text expression
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed)
     * @param callback - (optional) A callback fn to handle diagnotics and runtime errors
     * @returns A parse tree object
     */
    public static getParseTree(
        expression: string,
        opmeta: Uint8Array | string | object[],
        callback?: (diagnostics: Diagnostic[], error?: Error) => void
    ): ParseTree & { diagnostics: Diagnostic[], comments: Comment[] } | undefined {
        let _opmeta: OpMeta[]
        if (isBigNumberish(opmeta)) {
            _opmeta = metaFromBytes(opmeta as BytesLike, OpMetaSchema) as OpMeta[]
        }
        else {
            const _meta = typeof opmeta === "string" ? JSON.parse(opmeta) : opmeta
            if (validateMeta(_meta, OpMetaSchema)) _opmeta = _meta as OpMeta[]
            else throw new Error("invalid op meta")
        }
        
        try {
            this._parse(expression, _opmeta)
            if (callback) callback(this.diagnostics)
            return {
                ...this.parseTree,
                comments: this.comments,
                diagnostics: this.diagnostics
            } as any
        }
        catch (err) {
            if (callback) callback(this.diagnostics, err as Error)
            else console.log(err)
            return undefined
        }
    }

    /**
     * @public
     * Method to get the ExpressionConfig
     *
     * @param expression - the text expression
     * @param opmeta - Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed)
     * @param callback - (optional) A callback fn to handle diagnotics and runtime errors
     * @returns A ExpressionConfig
     */
    public static getExpressionConfig(
        expression: string,
        opmeta: Uint8Array | string | object[],
        callback?: (diagnostics: Diagnostic[], error?: Error) => void
    ): ExpressionConfig | undefined {
        let _opmeta: OpMeta[]
        if (isBigNumberish(opmeta)) {
            _opmeta = metaFromBytes(opmeta as BytesLike, OpMetaSchema) as OpMeta[]
        }
        else {
            const _meta = typeof opmeta === "string" ? JSON.parse(opmeta) : opmeta
            if (validateMeta(_meta, OpMetaSchema)) _opmeta = _meta as OpMeta[]
            else throw new Error("invalid op meta")
        }
        try {
            this._parse(expression, _opmeta)
            if (callback) callback(this.diagnostics)
            return this.expConf
        }
        catch(err) {
            if (callback) callback(this.diagnostics, err as Error)
            else console.log(err)
            return undefined
        }
    }

    /**
     * @public
     * Method to get ExpressionConfig (bytes) from a Parse Tree object or a Node or array of Nodes
     *
     * @param parseTree - Tree like object (Parse Tree object or a Node or array of Nodes) to get the ExpressionConfig from
     * @returns ExpressionConfig, i.e. compiled bytes ready to be deployed
     */
    public static compile(
        parseTree:
            | Node
            | Node[]
            | Record<number, Node[]>
            | Record<number, { tree: Node[], position: number[] }>
    ): ExpressionConfig | undefined {
        return this._compile(parseTree)
    }

    /**
     * Method to get ExpressionConfig (bytes) from a Parse Tree object or a Node or array of Nodes
     *
     * @param parseTree - Tree like object (Parse Tree object or a Node or array of Nodes) to get the ExpressionConfig from
     * @param constants - (internal) Used to keep the constants across recursions
     * @param sourceIndex - (internal) Used to keep the original source index across recursions
     * @returns ExpressionConfig
     */
    private static _compile(
        parseTree:
            | Node
            | Node[]
            | Record<number, Node[]>
            | Record<number, { tree: Node[], position: number[] }>,
        constants: BigNumberish[] = [],
        sourceIndex = 0
    ): ExpressionConfig | undefined {
        const _sources: BytesLike[] = []
        let _sourcesCache: BytesLike[] = []
        let _nodes : Node[][]

        // convertion to a standard format
        if ('splice' in parseTree) {
            if ('splice' in parseTree[0]) _nodes = parseTree as any as Node[][]
            else _nodes = [parseTree]
        }   
        else if('0' in parseTree) {
            const array: any = Object.values(parseTree)
            if ('splice' in array[0]) _nodes = [array as Node[]]
            else {
                if ('tree' in array[0]) {
                    for (let i = 0; i < array.length; i++) {
                        array[i] = array[i].tree
                    }
                }
                _nodes = [array as Node[]]
            }
        }
        else _nodes = [[parseTree as Node]]

        // check for errors
        for (let i = 0; i < _nodes.length; i++) {
            for (let j = 0; j < _nodes[i].length; j++) {
                if (!this._errorCheck(_nodes[i][j])) return undefined
            }
        }

        // compile from parsed tree
        for (let i = 0; i < _nodes.length; i++) {
            if (_nodes[i].length === 0) _sourcesCache = []
            for (let j = 0; j < _nodes[i].length; j++) {
                if (i > sourceIndex) sourceIndex = i
                const _node = _nodes[i][j]
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
                            )
                        }
                        else {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            )
                            constants.push(_node.value)
                        }
                    }
                    else if (_node.value === 'max-uint256' || _node.value === 'infinity') {
                        const _i = constants.findIndex(
                            v => ethers.constants.MaxUint256.eq(v)
                        )
                        if (_i > -1) {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, _i)
                                )
                            )
                        }
                        else {
                            _sourcesCache.push(
                                op(
                                    this.names.indexOf("read-memory"),
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            )
                            constants.push(
                                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                            )
                        }
                    }
                }
                else if ('name' in _node && !('opcode' in _node)) {
                    const _i = this.state.parse.tags[sourceIndex].findIndex(
                        v => v.name === _node.name
                    )
                    if (_i > -1) _sourcesCache.push(
                        op(
                            this.names.indexOf("read-memory"),
                            memoryOperand(MemoryType.Stack, _i)
                        )
                    )
                    else throw new Error(`cannot find "${_node.name}"`)
                }
                else {
                    for (let i = 0; i < (_node as Op).parameters.length; i++) {
                        const _expConf = this._compile(
                            (_node as Op).parameters[i],
                            constants,
                            sourceIndex
                        )
                        _sourcesCache.push(..._expConf!.sources)
                    } 
                    _sourcesCache.push(op(
                        this.names.indexOf((_node as Op).opcode.name),
                        (_node as Op).operand
                    ))
                }
            }
            _sources.push(concat(_sourcesCache))
            _sourcesCache = []
        }
        return {
            constants,
            sources: _sources.length 
                ? _sources.map(
                    v => hexlify(v, { allowMissingPrefix: true })
                ) 
                : []
        }
    }

    /**
     * @public
     * Method to set the opmeta for parser to compile based on
     * 
     * @param opmeta - Array of IOpMeta objects that hold the necessary data for parser
     * to compile an expression
     */
    private static set(opmeta: OpMeta[]) {
        this.opmeta = opmeta
        this.names = opmeta.map(v => v.name)
        this.aliases = opmeta.map(v => v.aliases)
        this.pops = opmeta.map(v => v.inputs)
        this.pushes = opmeta.map(v => v.outputs)
        this.operand = opmeta.map(v => v.operand)
        this.aliases = opmeta.map(v => v.aliases)
    }

    /**
     * Method to reset the class private properties
     */
    private static _reset = () => {
        this.state.parse.tree = []
        this.state.depthLevel = 0
        this.state.track.parens.open = []
        this.state.track.parens.close = []
        this.operandArgsErr = false
    }

    /**
     * Method to find index of next element within the text expression
     */
    private static _findIndex = (str: string): number => {
        return str.search(/[()<> ]/g)
    }

    // /**
    //  * Method to trim the text expression from whitespaces and commas from both ends
    //  */
    // private static _trim = (str: string): [string, number, number] => {
    //     let leadingOffset = 0
    //     let trailingOffset = 0;
    //     [str, trailingOffset] = this._trimRight(str);
    //     [str, leadingOffset] = this._trimLeft(str)
    //     return [str, leadingOffset, trailingOffset]
    // }

    // /**
    //  * Method to trim the right side of the text expression from whitespaces and commas
    //  */
    // private static _trimRight = (str: string): [string, number] => {
    //     let trailingOffset = 0
    //     while (str.endsWith(' ')) {
    //         str = str.slice(0, -1)
    //         trailingOffset++
    //     }
    //     return [str, trailingOffset]
    // }

    // /**
    //  * Method to trim the left side of the text expression from whitespaces and commas
    //  */
    // private static _trimLeft = (str: string): [string, number] => {
    //     let leadingOffset = 0
    //     while (str.startsWith(' ')) {
    //         str = str.slice(1, str.length)
    //         leadingOffset++
    //     }
    //     return [str, leadingOffset]
    // }

    /**
     * The main workhorse of Rain Parser which parses the words used in an
     * expression and is responsible for building the Parse Tree and Bytes
     */
    private static _parse(document: string, opmeta: OpMeta[]) {
        this._reset()
        this.sources = []
        this.constants = []
        this.treeArray = []
        this.parseTree = {}
        this.set(opmeta)
        this.state.parse.tags = []
        this.expConf = undefined
        const _comments: Comment[] = []

        // start parsing if the string is not empty
        if (document.length) {

            // ----------- remove indents -----------
            document = document.replace(/\n/g, ' ')

            // ----------- convert html &nbps to standard whitespace -----------
            document = document.replace(/&nbsp/g, ' ')

            // ----------- extract comments if any exists -----------
            if(document.includes('/*')) {
                while(document.includes('/*')) {
                    const _startCmPos = document.indexOf('/*')
                    let _endCmPos = document.length - 1
                    let _cm = document.slice(_startCmPos)
                    let _notEnded = true
                    if (document.includes('*/')) {
                        _endCmPos = document.indexOf('*/')
                        _cm = document.slice(_startCmPos, _endCmPos + 2)
                        _notEnded = false
                    }
                    document = _notEnded 
                        ? document.slice(0, _startCmPos) 
                            + ' ' .repeat(_cm.length) 
                        : document.slice(0, _startCmPos) 
                            + ' ' .repeat(_cm.length) 
                            + document.slice(_endCmPos + 2)
                
                    if (_notEnded) {
                        this.diagnostics.push({
                            msg: 'expected end of comment syntax "*/"',
                            position: [_startCmPos, _endCmPos]
                        })
                    }
                    else {
                        _comments.push({
                            comment: _cm,
                            position: [_startCmPos, _endCmPos + 1]
                        })
                    }
                }
            }

            // ----------- store comments -----------
            this.comments = _comments;

            // ----------- begin caching expression sentences -----------
            const _doc = document
            const _expressions: string[] = []
            const _positions: [number, number][] = []
            while (document.length) {
                if (document.includes(';')) {
                    const tmp = document.slice(0, document.indexOf(';'))
                    _positions.push([
                        _doc.length - document.length,
                        _doc.length - document.length + document.indexOf(';'),
                    ])
                    document = document.slice(document.indexOf(';') + 1)
                    _expressions.push(tmp)
                }
                else {
                    if (document.match(/[^\s+]/)) {
                        _positions.push([
                            _doc.length - document.length,
                            _doc.length - 1,
                        ])
                        _expressions.push(document)
                    }
                    document = ''
                }
            }

            // ----------- begin parsing expression sentences -----------
            for (let i = 0; i < _expressions.length; i++) {
                this._reset()
                this.state.parse.tags.push([])
                const _entry = _positions[i][0]
                const _subExp: string[] = []
                const _subExpEntry: number[] = []
                let _exp = _expressions[i]
                let _lhs: string

                // ----------- cache the sub-expressions -----------
                while (_exp.includes(',')) {
                    _subExp.push(_exp.slice(0, _exp.indexOf(',')))
                    _subExpEntry.push(_expressions[i].length - _exp.length)
                    _exp = _exp.slice(_exp.indexOf(',') + 1)
                }
                if (_exp.length) {
                    _subExp.push(_exp)
                    _subExpEntry.push(_expressions[i].length - _exp.length)
                }

                // ----------- begin parsing sub-expressions -----------
                for (let j = 0; j < _subExp.length; j++) {
                    this.state.depthLevel = 0
                    this.state.track.parens.open = []
                    this.state.track.parens.close = []
                    this.operandArgsErr = false
                    const _orgSubExp = _subExp[j]
                    const _positionOffset = _entry + _subExpEntry[j]
                    const _tagsOffset = this.state.parse.tags[i].length
                    const _treeOffset = this.state.parse.tree.length

                    // check for LHS/RHS delimitter, exit from parsing this sub-expression if 
                    // no or more than one delimitter was found, else start parsing LHS and RHS
                    if (_orgSubExp.match(/:/g)?.length === 1) {
                        _lhs = _orgSubExp.slice(0, _orgSubExp.indexOf(':'))
                        this.exp = _orgSubExp.slice(_orgSubExp.indexOf(':') + 1)

                        // ----------- check for invalid RHS comments -----------
                        for (let k = 0; k < _comments.length; k++) {
                            if (
                                _comments[k].position[0] > _positionOffset + 
                                    _orgSubExp.indexOf(':') &&
                                _comments[k].position[0] < _positionOffset + 
                                    _orgSubExp.length
                            ) {
                                this.diagnostics.push({
                                    msg: 'invalid RHS, comments are not allowed',
                                    position: [
                                        _positionOffset + _orgSubExp.indexOf(':') + 1,
                                        _positionOffset + _orgSubExp.length - 1
                                    ]
                                })
                            }
                        }

                        // ----------- begin parsing LHS -----------
                        if (_lhs.length > 0) {
                            const _aliases: string[] = []
                            const _aliasesPos: [number, number][] = []
                            let counter = 0
                            while (_lhs.length) {
                                if (_lhs.startsWith(" ")) {
                                    _lhs = _lhs.slice(1)
                                    counter++
                                }
                                else {
                                    const _i = _lhs.indexOf(" ") > -1 
                                        ? _lhs.indexOf(" ")
                                        : _lhs.length
                                    _aliases.push(_lhs.slice(0, _i))
                                    _aliasesPos.push([_positionOffset + counter, NaN])
                                    counter = counter + _aliases[_aliases.length - 1].length
                                    _aliasesPos[_aliasesPos.length - 1].pop()
                                    _aliasesPos[
                                        _aliasesPos.length - 1
                                    ][1] = _positionOffset + counter - 1
                                    
                                    _lhs = _lhs.slice(_i)
                                }
                            }
                            for (let k = 0; k < _aliases.length; k++) {
                                this.state.parse.tags[
                                    this.state.parse.tags.length - 1
                                ].push({
                                    name: _aliases[k],
                                    position: _aliasesPos[k]
                                })
                                if (!_aliases[k].match(/^[a-z][a-z0-9-]*$|\_/)) {
                                    this.diagnostics.push({
                                        msg: `invalid LHS alias: ${_aliases[k]}`,
                                        position: _aliasesPos[k]
                                    })
                                }
                            }
                        }

                        // ----------- begin parsing RHS -----------
                        while (this.exp.length > 0) {
                            const _currentPosition = 
                                _positionOffset + 
                                _orgSubExp.length - 
                                this.exp.length

                            if (this.exp.startsWith(" ")) this.exp = this.exp.slice(1)
                            else if (this.exp.startsWith('(')) {
                                this.exp = this.exp.slice(1)
                                let __exp = this.exp
                                const _pos: number[] = []
                                let _index = -1
                                let _check = true
                                while (_check && (__exp.includes("(") || __exp.includes(")"))) {
                                    const _i = __exp.search(/\(|\)/)
                                    if (__exp[_i] === "(") _pos.push(_i)
                                    else {
                                        const _x = _pos.pop()
                                        if (!_x) {
                                            _index = _i
                                            _check = false
                                        }
                                    }
                                    __exp = __exp.slice(_i + 1)
                                }
                                this.diagnostics.push({
                                    msg: "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                                    position: [
                                        _currentPosition,
                                        _index > -1 
                                            ? _currentPosition + _index + 1 
                                            : _currentPosition + this.exp.length
                                    ]
                                })
                                if (_index === -1) this.exp = ""
                                else this.exp = this.exp.slice(_index + 1)
                            }
                            else if (this.exp.startsWith(')')) {
                                
                                if (this.state.track.parens.open.length > 0) {
                                    this.state.track.parens.close.push(_currentPosition)
                                    this._resolveNode()
                                    this.state.depthLevel--
                                }
                                else this.diagnostics.push({
                                    msg: 'unexpected ")"',
                                    position: [_currentPosition, _currentPosition]
                                })
                                this.exp = this.exp.replace(')', '')
                                if (
                                    this.exp.length &&
                                    !this.exp.startsWith(" ") && 
                                    !this.exp.startsWith(")") && 
                                    !this.exp.startsWith(";") && 
                                    !this.exp.startsWith(",")
                                ) this.diagnostics.push({
                                    msg: "expected to be seperated by space",
                                    position: [_currentPosition, _currentPosition + 1]
                                })
                            }
                            else this._consume(_currentPosition)
                        }

                        // ----------- validating RHS against LHS -----------
                        const _outputCount = this._countOutputs(
                            [...this.state.parse.tree], 
                            _treeOffset
                        )
                        if (!isNaN(_outputCount)) {
                            const _tagsCount = this.state.parse.tags[i].length - _tagsOffset
                            const _treeCount = this.state.parse.tree.length - _treeOffset
                            const _diff = _tagsCount - _outputCount
                            const _tags = [...this.state.parse.tags[
                                this.state.parse.tags.length - 1
                            ]]
                            if (_diff === 0) {
                                for (let k = 0; k < _treeCount; k++) {
                                    const _node = this.state.parse.tree[
                                        this.state.parse.tree.length - 1 - k
                                    ]
                                    if ("opcode" in _node) {
                                        if (_node.output > 0) {
                                            _node.tags = []
                                            _tags.splice(-_node.output).forEach(v => {
                                                if (v.name !== "_") _node.tags?.push(v)
                                            })
                                        }
                                    }
                                    else _tags.splice(-1).forEach(v => {
                                        if (v.name !== "_") _node.tag = v
                                    })
                                }
                            }
                            else if (_diff > 0) {
                                for (let k = 0; k < _diff; k++) {
                                    const _tag = _tags.pop()!
                                    this.diagnostics.push({
                                        msg: `no RHS item exists to match this LHS item: ${_tag.name}`,
                                        position: _tag.position
                                    })
                                }
                                for (let k = 0; k < _treeCount; k++) {
                                    const _node = this.state.parse.tree[
                                        this.state.parse.tree.length - 1 - k
                                    ]
                                    if ("opcode" in _node) {
                                        if (_node.output > 0) {
                                            _node.tags = []
                                            _tags.splice(-_node.output).forEach(v => {
                                                if (v.name !== "_") _node.tags?.push(v)
                                            }) 
                                        }
                                    }
                                    else _tags.splice(-1).forEach(v => {
                                        if (v.name !== "_") _node.tag = v
                                    })
                                }
                            }
                            else {
                                const _nodes = [...this.state.parse.tree]
                                for (let k = 0; k < -_diff; k++) {
                                    const _node = _nodes.pop()!
                                    this.diagnostics.push({
                                        msg: `no LHS item exists to match this RHS item`,
                                        position: _node.position
                                    })
                                }
                                for (let k = 0; k < _treeCount; k++) {
                                    const _node = this.state.parse.tree[
                                        this.state.parse.tree.length - 1 - k + _diff
                                    ]
                                    if ("opcode" in _node) {
                                        if (_node.output > 0) {
                                            _node.tags = []
                                            _tags.slice(-_node.output).forEach(v => {
                                                if (v.name !== "_") _node.tags?.push(v)
                                            })
                                        }
                                    }
                                    else _tags.slice(-1).forEach(v => {
                                        if (v.name !== "_") _node.tag = v
                                    })
                                }
                            }
                        }
                    }
                    else {
                        this.diagnostics.push({
                            msg: 'invalid sub-expression',
                            position: [
                                _positionOffset,
                                _positionOffset + _orgSubExp.length - 1
                            ]
                        })
                    }
                }

                // ----------- constructing final parse tree -----------
                this.parseTree[i] = {
                    position: _positions[i],
                    tree: this.state.parse.tree.splice(-this.state.parse.tree.length)
                }
                this.treeArray[i] = this.parseTree[i].tree
            }

            // ----------- compile bytes -----------
            this.expConf = this.compile(this.treeArray)
            if (this.expConf) ({constants: this.constants, sources: this.sources } = this.expConf)
        }
    }

    /**
     * Method to resolve a valid closed node at current state of parsing
     */
    private static _resolveNode() {
        this.state.track.parens.open.pop()
        const _endPosition = this.state.track.parens.close.pop()!
        let _nodes: Node[] = this.state.parse.tree
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            _nodes = (_nodes[_nodes.length - 1] as Op).parameters
        }
        const _node = _nodes[_nodes.length - 1] as Op
        _node.position[1] = _endPosition
        _node.parens[1] = _endPosition
        const _i = this.diagnostics.findIndex(
            v => v.msg === 'expected ")"' && 
            v.position[0] === _node.parens[0] &&
            v.position[1] === _node.parens[0]
        )
        if (_i > -1) this.diagnostics.splice(_i, 1)
        _nodes[_nodes.length - 1] = this._resolveOp(_node)
    }

    // /**
    //  * Method to get the last item of a Node at a specified depth level of parse tree
    //  */
    // private static _getLastTreeElementAtDepth(depthLevel: number): Node {
    //     let tmp: Node
    //     tmp = this.state.parse.tree[this.state.parse.tree.length - 1]
    //     for (let i = 0; i < depthLevel; i++) {
    //         tmp = (tmp as Op).parameters[(tmp as Op).parameters.length - 1]
    //     }
    //     return tmp
    // }

    /**
     * Method to update the elements of a Node
     */
    private static _updateTree(node: Node, replace?: boolean) {
        let _nodes: Node[] = this.state.parse.tree
        if (replace) {
            for (let i = 0; i < this.state.depthLevel - 1; i++) {
                _nodes = (_nodes[_nodes.length - 1] as Op).parameters
            }
            _nodes.pop()
        }
        else {
            for (let i = 0; i < this.state.depthLevel; i++) {
                _nodes = (_nodes[_nodes.length - 1] as Op).parameters
            }
        }
        _nodes.push(node)
    }

    /**
     * Method to handle operand arguments
     */
    private static _resolveOperand(pos: number, op?: Op, count = 0): Op | undefined {
        if (!this.exp.includes('>')) {
            this.operandArgsErr = true
            this.diagnostics.push({
                msg: 'expected ">"',
                position: [pos, pos + this.exp.length - 1]
            })
            if (op) if (!op.operandArgs) op.operandArgs = {
                position: [pos, pos + this.exp.length - 1],
                args: []
            }
            this.exp = ''
        }
        else {
            const _operandArgs = this.exp.slice(1, this.exp.indexOf('>'))
            this.exp = this.exp.slice(this.exp.indexOf('>') + 1)
            if (_operandArgs.search(/[^0-9\s]/) > -1) {
                if (op) this.operandArgsErr = true
                const _erros = _operandArgs.match(/[^0-9\s]+/g)!
                for (let i = 0; i < _erros.length; i++) {
                    this.diagnostics.push({
                        msg: 'unexpected argument',
                        position: [
                            pos + _operandArgs.indexOf(_erros[i]) + 1,
                            pos + _operandArgs.indexOf(_erros[i]) + _erros[i].length,
                        ]
                    })
                }
            }
            else {
                if (!op) this.diagnostics.push({
                    msg: "invalid syntax, operand args need to follow an opcode",
                    position: [pos, pos + _operandArgs.length + 1]
                })
                else {
                    if (!op.operandArgs) op.operandArgs = {
                        position: [pos, pos + _operandArgs.length + 1],
                        args: []
                    }
                    if (op.opcode.name !== ("unknown opcode") && count === 0) {
                        this.operandArgsErr = true
                        this.diagnostics.push({
                            msg: `opcode ${op.opcode.name} doesn't have argumented operand`,
                            position: [pos, pos + _operandArgs.length + 1]
                        })
                    }
                    else {
                        const _parsedArgs = _operandArgs.match(/[0-9]+/g)!
                        const _argsPos: [number, number][] = []
                        let _tmp = _operandArgs
                        for (let i = 0; i < _parsedArgs.length; i++) {
                            _argsPos.push([
                                pos + _tmp.indexOf(_parsedArgs[i]) + 1,
                                pos + _tmp.indexOf(_parsedArgs[i]) + _parsedArgs[i].length 
                            ])
                            _tmp = _tmp.replace(_parsedArgs[i], " ".repeat(_parsedArgs[i].length))
                        }
                        if (op.opcode.name === "unknown opcode") {
                            _parsedArgs.forEach((v, i) => op.operandArgs?.args.push({
                                value: Number(v),
                                name: "unknown",
                                position: _argsPos[i]
                            }))
                        }
                        else {
                            const _opMetaOperandArgs = [...(this.operand[
                                this.names.indexOf(op.opcode.name)
                            ] as OperandArgs)]
                            const _i = _opMetaOperandArgs.findIndex(v => v.name === "inputs")
                            if (_i > -1) _opMetaOperandArgs.splice(_i, 1)
                            const _diff = _parsedArgs.length - _opMetaOperandArgs.length
                            if (_diff === 0) _opMetaOperandArgs.forEach(
                                (v, i) => op.operandArgs?.args.push({
                                    value: Number(_parsedArgs[i]),
                                    name: v.name,
                                    description: v?.desc,
                                    position: _argsPos[i]
                                })
                            )
                            else if (_diff > 0) {
                                this.operandArgsErr = true
                                for (let i = 0; i < _diff; i++) {
                                    this.diagnostics.push({
                                        msg: `unexpected operand argument for ${op.opcode.name}`,
                                        position: [..._argsPos[_argsPos.length - 1 - i]]
                                    })
                                }
                            }
                            else {
                                this.operandArgsErr = true
                                this.diagnostics.push({
                                    msg: `unexpected number of operand args for ${op.opcode.name}`,
                                    position: [pos, pos + _operandArgs.length + 1]
                                })
                            }
                        } 
                    }
                }
            }
        }
        return op
    }

    /**
     * Method that resolves the opcode Node once its respective closing paren has consumed
     */
    private static _resolveOp = (node: Op): Op => {
        const op = this.names.indexOf(node.opcode.name)
        if (op !== -1) {
            if (typeof this.pushes[op] === "number") node.output = this.pushes[op] as number
            if (this.operandArgsErr) {
                this.operandArgsErr = false
                node.operand = NaN
            } 
            else {
                if (this.operand[op] === 0) {
                    node.operand = 0
                    if (this.pops[op] === 0) {
                        if (node.parameters.length) this.diagnostics.push({
                            msg: "invalid number of inputs",
                            position: [...node.position]
                        })
                    }
                    else {
                        if (
                            "bits" in (this.pops[op] as InputArgs) || 
                            "computation" in (this.pops[op] as InputArgs)
                        ) this.diagnostics.push({
                            msg: "invalid input meta format",
                            position: [...node.position]
                        })
                        else {
                            if (
                                node.parameters.length !== 
                                (this.pops[op] as InputArgs).parameters.length
                            ) this.diagnostics.push({
                                msg: "out-of-range inputs",
                                position: [...node.position]
                            })
                        }
                    }
                    if (typeof this.pushes[op] !== "number") {
                        node.output = NaN
                        this.diagnostics.push({
                            msg: "invalid output meta format",
                            position: [...node.position]
                        })
                    }
                }
                else {
                    let _argIndex = 0
                    let _inputsIndex = -1
                    const _operand = constructByBits(
                        (this.operand[op] as OperandArgs).map((v, i) => {
                            if (v.name === "inputs") {
                                _inputsIndex = i
                                return {
                                    value: node.parameters.length,
                                    bits: v.bits,
                                    computation: v.computation,
                                    validRange: v.validRange
                                }
                            }
                            else return {
                                value: node.operandArgs!.args[_argIndex++].value,
                                bits: v.bits,
                                computation: v.computation,
                                validRange: v.validRange
                            }
                        })
                    )
                    if (typeof _operand === "number") {
                        node.operand = _operand
                        if (typeof this.pushes[op] !== "number") node.output = extractByBits(
                            _operand, 
                            (this.pushes[op] as ComputedOutput).bits, 
                            (this.pushes[op] as ComputedOutput).computation
                        )
                    }
                    else {
                        node.operand = NaN
                        if (typeof this.pushes[op] !== "number") node.output = NaN
                        for (let i = 0; i < _operand.length; i++) {
                            if (_inputsIndex > -1) {
                                if (_operand[i] === _inputsIndex) this.diagnostics.push({
                                    msg: "out-of-range inputs",
                                    position: [...node.parens]
                                })
                                else if (_operand[i] < _inputsIndex) this.diagnostics.push({
                                    msg: "out-of-range operand argument",
                                    position: [...node.operandArgs!.args[_operand[i]].position]
                                })
                                else this.diagnostics.push({
                                    msg: "out-of-range operand argument",
                                    position: [...node.operandArgs!.args[_operand[i] - 1].position]
                                })
                            }
                            else this.diagnostics.push({
                                msg: "out-of-range operand argument",
                                position: [...node.operandArgs!.args[_operand[i]].position]
                            })
                        }
                    }
                }
            }
            if (node.output === 0 && this.state.depthLevel > 1) this.diagnostics.push({
                msg: 'zero output opcodes cannot be nested',
                position: [...node.position]
            })
            if (node.output > 1 && this.state.depthLevel > 1) this.diagnostics.push({
                msg: 'multi output opcodes cannot be nested',
                position: [...node.position]
            })
        }
        return node
    }

    /**
     * Method that consumes the words from the expression and updates the parse tree with their Node type
     */
    private static _consume(entry: number): void {
        const _tmp = this._findIndex(this.exp)
        const _index = _tmp < 0 ? this.exp.length : _tmp
        const _word = this.exp.slice(0, _index)
        const _wordPos: [number, number] = [entry, entry + _word.length - 1]
        this.exp = this.exp.replace(_word, '')
        const _aliasIndex = this.state.parse.tags[
            this.state.parse.tags.length - 1
        ].findIndex(
            v => v.name === _word
        )

        if (_aliasIndex > -1) {
            if (!_word.match(this.wordPattern)) this.diagnostics.push({
                msg: `invalid pattern for alias: ${_word}`,
                position: [..._wordPos]
            })
            if (this.state.depthLevel === 0) {
                if (_aliasIndex === this.state.parse.tree.length) this.diagnostics.push({
                    msg: `cannot reference self`,
                    position: [..._wordPos]
                })
                else this._updateTree({
                    name: _word,
                    position: [..._wordPos],
                })
            }
            else {
                if (_aliasIndex === this.state.parse.tree.length - 1) this.diagnostics.push({
                    msg: `cannot reference self`,
                    position: [..._wordPos]
                })
                else this._updateTree({
                    name: _word,
                    position: [..._wordPos],
                })
            }
        }
        else if (_word.match(this.numericPattern)) {
            let _val = _word
            if (!isBigNumberish(_word)) {
                const _nums = _word.match(/\d+/g)!
                _val = _nums[0] + "0".repeat(Number(_nums[1]))
            }
            if (ethers.constants.MaxUint256.lt(_val)) {
                this.diagnostics.push({
                    msg: "value greater than 32 bytes in size",
                    position: [..._wordPos]
                })
            }
            this._updateTree({
                value: _val,
                position: [..._wordPos],
            })
        }
        else if (_word.match(this.wordPattern)) {
            if (_word === 'max-uint-256' || _word === 'max-uint256' || _word === 'infinity') {
                this._updateTree({
                    value: _word,
                    position: [..._wordPos],
                })
            }
            else {
                let _enum = this.names.indexOf(_word)
                if (_enum === -1) _enum = this.aliases.findIndex(v => v?.includes(_word))
                let count = 0
                if (_enum > -1 && typeof this.operand[_enum] !== "number") {
                    (this.operand[_enum] as OperandArgs).forEach(v => {
                        if (v.name !== "inputs") count++
                    })
                }
                if (this.exp.startsWith('<') || this.exp.startsWith('(')) {
                    const _errIndex = this.diagnostics.length
                    if (_enum === -1) {
                        this.diagnostics.push({
                            msg: `unknown opcode: "${_word}"`,
                            position: [..._wordPos]
                        })
                    }
                    let _op: Op = {
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
                    }
                    if (this.exp.startsWith("<")) _op = 
                        this._resolveOperand(entry + _word.length, _op, count)!
                    else if (count) this.diagnostics.push({
                        msg: `expected operand arguments for opcode ${_op.opcode.name}`,
                        position: [..._wordPos]
                    })
                    if (this.exp.startsWith("(")) {
                        const __pos = _op.operandArgs 
                            ? [..._op.operandArgs!.position][1] + 1 
                            : [..._wordPos][1] + 1
                        this.exp = this.exp.replace('(', '')
                        this.state.track.parens.open.push(__pos)
                        _op.parens[0] = __pos
                        this._updateTree(_op)
                        this.state.depthLevel++
                        this.diagnostics.push({
                            msg: 'expected ")"',
                            position: [__pos, __pos]
                        })
                    }
                    else {
                        if (_enum === -1) this.diagnostics[_errIndex].position[1] = 
                            [..._op.operandArgs!.position][1]
                        else this.diagnostics.push({
                            msg: 'expected "("',
                            position: [..._wordPos]
                        })
                    }
                }
                else {
                    if (_enum === -1) this.diagnostics.push({
                        msg: `undefined word: ${_word}`,
                        position: [..._wordPos]
                    })
                    else {
                        this.diagnostics.push({
                            msg: `expected "${_word}" opcode to be followed by ${
                                count > 0 ? "operand args and parens" : "parens"
                            }`,
                            position: [..._wordPos]
                        })
                    }
                }
            }   
        }
        else this.diagnostics.push({
            msg: `"${_word}" is not a valid rainlang word`,
            position: [..._wordPos]
        })
        // }
    }

    /**
     * Method to check for errors in parse tree once an expression is fully parsed
     */
    private static _errorCheck(element: Node): boolean {
        if (this.diagnostics.length) return false
        if ('opcode' in element) {
            if (isNaN(element.operand) || isNaN(element.output)) return false
            else {
                for (let i = 0; i < element.parameters.length; i++) {
                    if (!this._errorCheck(element.parameters[i])) return false
                }
                return true
            }
        }
        else return true
    }

    /**
     * Method to count outputs of nodes in a parse tree
     */
    private static _countOutputs(nodes: Node[], skip?: number): number {
        let _count = 0
        if (skip) nodes = nodes.slice(skip - nodes.length)
        for (let i = 0; i < nodes.length; i++) {
            const _node = nodes[i]
            if ('opcode' in _node) {
                if (!isNaN(_node.output)) _count = _count + _node.output
                else return NaN
            }
            if ('value' in _node || 'name' in _node) _count++
        }
        return _count
    }
}
