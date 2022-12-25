/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { AllStandardOps } from '../../rainterpreter/allStandardOps';
import { rainterpreterOpMeta } from '../../rainterpreter/opmeta';
import { BigNumberish, BytesLike, ethers } from 'ethers';
import { OperandMeta, OpIO, OpMeta, ParamsValidRange, StateConfig } from '../../types';
import {
    concat,
    isBigNumberish,
    memoryOperand,
    MemoryType,
    op
} from '../../utils';
import {
    virtualGte,
    virtualInEq,
    virtualLte,
    Notations,
    ParseTree,
    State,
    Node,
    Error,
    Op,
    Value,
    Comment,
} from './types';


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
 * import { Parser } from 'rain-sdk';
 *
 * // to set the custom opmeta
 * Parser.set(opmeta)
 *
 * // to set the custom details of GTE and LTE opcodes
 * Parser.setGteMeta(name?, description?, data?, description?)
 * Parser.setLteMeta(name?, description?, data?, description?)
 *
 * // to execute the parsing and get parse tree object and StateConfig
 * let parseTree;
 * let stateConfig
 * [ parseTree, stateConfig ] = Parser.get(textScript, customOpMeta, customMultiOutputPlaceholderChar);
 *
 * // to get parse tree object only
 * let parseTree = Parser.getParseTree(textScript, customOpMeta, customMultiOutputPlaceholderChar);
 *
 * // to get StateConfig only
 * let stateConfig = Parser.getStateConfig(textScript, customOpMeta, customMultiOutputPlaceholderChar);
 *
 * // to build StateConfig (compile) from ParseTree object or a Node or array of Node
 * let argument: Node || Node[] || ParseTree
 * let stateConfig = Parser.compile(argument)
 * ```
 */
export class Parser {
    public static constants: BigNumberish[] = []
    public static sources: BytesLike[] = []
    public static parseTree: ParseTree = {}

    private static exp: string
    private static input: string
    private static argErr = false
    private static placeholder = '_'
    private static comments: Comment[] = []
    private static treeArray: Record<number, Node[]> = {}
    private static data: any[] = rainterpreterOpMeta.map(v => v.data)
    private static enums: number[] = rainterpreterOpMeta.map(v => v.enum)
    private static names: string[] = rainterpreterOpMeta.map(v => v.name)
    private static pops: OpIO[] = rainterpreterOpMeta.map(v => v.inputs)
    private static pushes: OpIO[] = rainterpreterOpMeta.map(v => v.outputs)
    private static operandMetas: OperandMeta[] = rainterpreterOpMeta.map(v => v.operand)
    private static aliases: (string[] | undefined)[] = rainterpreterOpMeta.map(v => v.aliases)
    private static paramsValidRange: ParamsValidRange[] = rainterpreterOpMeta.map(
        v => v.paramsValidRange
    )
    private static state: State = {
        parse: {
            tree: [],
            tags: [],
            multiOutputCache: []
        },
        track: {
            notation: [],
            parens: {
                open: [],
                close: []
            },
            operandArgs: {
                cache: [],
                errorCache: [],
                lenCache: []
            },
        },
        depthLevel: 0,
        ambiguity: false,
    }

    // special literals for gte and lte
    private static gte = virtualGte
    private static lte = virtualLte
    private static ineq = virtualInEq

    /**
     * @public
     * Method to set the details of the GTE opcode
     *
     * @param name - (optional) name of the GTE opcode
     * @param aliases - (optional) The aliases of GTE opcode
     * @param description - (optional) The description
     * @param data - (optional) data
     */
    public static setGteMeta(name?: string, description?: string, data?: any, aliases?: string[]) {
        if (name) this.gte.name = name
        if (data) this.gte.data = data
        if (description) this.gte.aliases = aliases
        if (aliases) this.gte.description = description
        if (this.gte.aliases) {
            this.gte.aliases.forEach(
                (v, i, array) => array[i] = this._normalizeChar(v)
            )
        }
    }

    /**
     * @public
     * Method to set the details of the LTE opcode
     *
     * @param name - (optional) name of the LTE opcode
     * @param aliases - (optional) The aliases of LTE opcode
     * @param description - (optional) The description
     * @param data - (optional) data
     */
    public static setLteMeta(name?: string, description?: string, data?: any, aliases?: string[]) {
        if (name) this.lte.name = name
        if (data) this.lte.data = data
        if (description) this.lte.aliases = aliases
        if (aliases) this.lte.description = description
        if (this.lte.aliases) {
            this.lte.aliases.forEach(
                (v, i, array) => array[i] = this._normalizeChar(v)
            )
        }
    }

    /**
     * @public
     * Method to set the details of the INEQ opcode
     *
     * @param name - (optional) name of the INEQ opcode
     * @param aliases - (optional) The aliases of INEQ opcode
     * @param description - (optional) The description
     * @param data - (optional) data
     */
    public static setInEqMeta(name?: string, description?: string, data?: any, aliases?: string[]) {
        if (name) this.ineq.name = name
        if (data) this.ineq.data = data
        if (description) this.ineq.aliases = aliases
        if (aliases) this.ineq.description = description
        if (this.ineq.aliases) {
            this.ineq.aliases.forEach(
                (v, i, array) => array[i] = this._normalizeChar(v)
            )
        }
    }

    /**
     * @public
     * Method to get parse tree object and StateConfig
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @returns Array of parse tree object and StateConfig
     */
    public static get(
        expression: string,
        opmeta?: OpMeta[],
    ): [ParseTree | (ParseTree & { 'comments': Comment[] }), StateConfig] | string {
        try {
            this._parse(expression, opmeta)
            let ret: any = this.parseTree as ParseTree
            if (this.comments.length > 0) ret = {
                ...this.parseTree,
                'comments': this.comments
            } as (ParseTree & { 'comments': Comment[] })
            return [
                ret,
                { constants: this.constants, sources: this.sources }
            ]
        }
        catch(err) {
            console.log(`an error occured duting parsing, please try again, reason: ${err}`)
            return `an error occured duting parsing, please try again, reason: ${err}`
        }
    }

    /**
     * @public
     * Method to get the parse tree object
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @returns A parse tree object
     */
    public static getParseTree(
        expression: string,
        opmeta?: OpMeta[],
    ): ParseTree | (ParseTree & { 'comments': Comment[] }) | string {
        try {
            this._parse(expression, opmeta)
            let ret: any = this.parseTree as ParseTree
            if (this.comments.length > 0) ret = {
                ...this.parseTree,
                'comments': this.comments
            } as (ParseTree & { 'comments': Comment[] })
            return ret
        }
        catch(err) {
            console.log(`an error occured duting parsing, please try again, reason: ${err}`)
            return `an error occured duting parsing, please try again, reason: ${err}`
        }
    }

    /**
     * @public
     * Method to get the StateConfig
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @returns A StateConfig
     */
    public static getStateConfig(
        expression: string,
        opmeta?: OpMeta[],
    ): StateConfig | string {
        try {
            this._parse(expression, opmeta)
            return {
                constants: this.constants,
                sources: this.sources
            }
        }
        catch(err) {
            console.log(`an error occured duting parsing, please try again, reason: ${err}`)
            return `an error occured duting parsing, please try again, reason: ${err}`
        }
    }

    /**
     * @public
     * Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes
     *
     * @param parseTree - Tree like object (Parse Tree object or a Node or array of Nodes) to get the StateConfig from
     * @returns StateConfig, i.e. compiled bytes ready to be deployed
     */
    public static compile(
        parseTree:
            | Node
            | Node[]
            | Record<number, Node[]>
            | Record<number, { tree: Node[], position: number[] }>
    ): StateConfig {
        return this._compile(parseTree)
    }

    /**
     * Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes
     *
     * @param parseTree - Tree like object (Parse Tree object or a Node or array of Nodes) to get the StateConfig from
     * @param constants - (internal) Used to keep the constants across recursions
     * @param sourceIndex - (internal) Used to keep the original source index across recursions
     * @returns StateConfig
     */
    private static _compile(
        parseTree:
            | Node
            | Node[]
            | Record<number, Node[]>
            | Record<number, { tree: Node[], position: number[] }>,
        constants: BigNumberish[] = [],
        sourceIndex = 0
    ): StateConfig {
        const sources: BytesLike[] = []
        let sourcesCache: BytesLike[] = []
        let nodes : Node[][]
        // let argOffset: number[] = []
        // let isRecord = false

        // convertion to a standard format
        if ('splice' in parseTree) {
            if ('splice' in parseTree[0]) nodes = parseTree as any as Node[][]
            else nodes = [parseTree]
        }   
        else if('0' in parseTree) {
            const array: any = Object.values(parseTree)
            if ('splice' in array[0]) nodes = [array as Node[]]
            else {
                if ('tree' in array[0]) {
                    for (let i = 0; i < array.length; i++) {
                        array[i] = array[i].tree
                    }
                }
                // argOffset = this._countArgs(
                //     parseTree as Record<number, Node[]>
                // )
                // isRecord = true
                nodes = [array as Node[]]
            }
        }
        else nodes = [[parseTree as Node]]

        // check for errors
        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes[i].length; j++) {
                if (!this._errorCheck(nodes[i][j])) return {
                    constants: [],
                    sources: []
                }
            }
        }

        // argOffset = isRecord
        //     ? this._countArgs(parseTree as Record<number, Node[]>)
        //     : [0, 0]
        // const argCount = isRecord ? argOffset.unshift()! : 0

        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].length === 0) sourcesCache = []
            for (let j = 0; j < nodes[i].length; j++) {
                if (i > sourceIndex) sourceIndex = i
                const node = nodes[i][j]
                if ('value' in node) {
                    if (isBigNumberish(node.value)) {
                        if (constants.includes(node.value)) {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.READ_MEMORY,
                                    memoryOperand(
                                        MemoryType.Constant,
                                        constants.indexOf(node.value)
                                    )
                                )
                            )
                        }
                        else {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.READ_MEMORY,
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            )
                            constants.push(node.value)
                        }
                    }
                    // else if ((node.value as string).includes('arg')) {
                    //     const index = Number(
                    //         (node.value as string).replace('arg(', '').slice(0, -1)
                    //     )
                    //     sourcesCache.push(
                    //         op(
                    //             this.names.length, isRecord
                    //                 ? argOffset[i] + index
                    //                 : offset ? offset + index : index
                    //         )
                    //     )
                    // }
                    else if (node.value === 'MaxUint256' || node.value === 'Infinity') {
                        const _i = constants.findIndex(
                            v => ethers.constants.MaxUint256.eq(v)
                        )
                        if (_i > -1) {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.READ_MEMORY,
                                    memoryOperand(MemoryType.Constant, _i)
                                )
                            )
                        }
                        else {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.READ_MEMORY,
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            )
                            constants.push(
                                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
                            )
                        }
                    }
                }
                else if ('name' in node && !('opcode' in node)) {
                    const _i = this.state.parse.tags[sourceIndex].findIndex(
                        v => v.name === node.name
                    )
                    if (_i > -1) sourcesCache.push(
                        op(
                            AllStandardOps.READ_MEMORY,
                            memoryOperand(MemoryType.Stack, _i)
                        )
                    )
                    else throw new Error(`cannot find "${node.name}"`)
                }
                else {
                    for (let i = 0; i < (node as Op).parameters.length; i++) {
                        const tmp = this._compile(
                            (node as Op).parameters[i],
                            constants,
                            sourceIndex
                            // isRecord ? argOffset[i] : offset ? offset : 0,
                        )
                        sourcesCache.push(...tmp.sources)
                    }
                    if (
                        (node as Op).opcode.name === this.gte.name ||
                        (node as Op).opcode.name === this.lte.name ||
                        (node as Op).opcode.name === this.ineq.name
                    ) {
                        sourcesCache.push(
                            op(
                                (node as Op).opcode.name === this.gte.name
                                    ? AllStandardOps.LESS_THAN
                                    : (node as Op).opcode.name === this.lte.name
                                        ? AllStandardOps.GREATER_THAN
                                        : AllStandardOps.EQUAL_TO
                            ),
                            op(AllStandardOps.ISZERO)
                        )
                    }
                    else sourcesCache.push(op(
                        this.enums[
                            this.names.indexOf((node as Op).opcode.name)
                        ],
                        (node as Op).operand
                    ))
                }
            }
            sources.push(concat(sourcesCache))
            sourcesCache = []
        }
        // if (isRecord && argCount > 0) {
        //     ({ constants, sources } = this._updateArgs({constants, sources}))
        // }
        return {
            constants,
            sources
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
        this.data = opmeta.map(v => v.data)
        this.names = opmeta.map(v => v.name)
        this.aliases = opmeta.map(v => v.aliases)
        this.pops = opmeta.map(v => v.inputs)
        this.pushes = opmeta.map(v => v.outputs)
        this.operandMetas = opmeta.map(v => v.operand)
        this.paramsValidRange = opmeta.map(v => v.paramsValidRange)
        for (let i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i]) {
                this.aliases[i]!.forEach(
                    (v, i, array) => array[i] = this._normalizeChar(v)
                )
            }
        }
    }

    /**
     * Method to reset the class private properties
     */
    private static _reset = () => {
        this.state.parse.tree = []
        this.state.depthLevel = 0
        this.state.ambiguity = false
        this.state.track.parens.open = []
        this.state.track.parens.close = []
        this.state.track.operandArgs.cache = []
        this.state.track.operandArgs.errorCache = []
        this.state.track.operandArgs.lenCache = []
        this.state.track.notation = []
        this.state.parse.multiOutputCache = []
        this.argErr = false
        this.comments = []
    }

    /**
     * Method to find index of next element within the text expression
     */
    private static _findIndex = (str: string): number => {
        return str.search(/[()<> ]/g)
    }

    /**
     * Method to trim the text expression from whitespaces and commas from both ends
     */
    private static _trim = (str: string): [string, number, number] => {
        let leadingOffset = 0
        let trailingOffset = 0;
        [str, trailingOffset] = this._trimRight(str);
        [str, leadingOffset] = this._trimLeft(str)
        return [str, leadingOffset, trailingOffset]
    }

    /**
     * Method to trim the right side of the text expression from whitespaces and commas
     */
    private static _trimRight = (str: string): [string, number] => {
        let trailingOffset = 0
        while (str.endsWith(' ') || str.endsWith(',')) {
            str = str.slice(0, -1)
            trailingOffset++
        }
        return [str, trailingOffset]
    }

    /**
     * Method to trim the left side of the text expression from whitespaces and commas
     */
    private static _trimLeft = (str: string): [string, number] => {
        let leadingOffset = 0
        while (str.startsWith(' ') || str.startsWith(',')) {
            str = str.slice(1, str.length)
            leadingOffset++
        }
        return [str, leadingOffset]
    }

    /**
     * Method to handle letter case senivity
     */
    private static _normalizeChar = (str: string): string => {
        if (str !== '-') 
            while (str.includes('-')) 
                str = str.replace('-', '_')
        return str.toUpperCase()
    }

    /**
     * The main workhorse of Rain Parser which parses the words used in an
     * expression and is responsible for building the Parse Tree and Bytes
     */
    private static _parse(script: string, opmeta?: OpMeta[], placeholder?: string) {
        this._reset()
        this.sources = []
        this.constants = []
        this.treeArray = []
        this.parseTree = {}
        opmeta ? this.set(opmeta) : this.set(rainterpreterOpMeta)
        this.placeholder = placeholder ? placeholder : '_'
        this.state.parse.tags = []
        const comments: Comment[] = []

        // start parsing if the string is not empty
        if (script.length) {

            // ----------- remove indents -----------
            script = script.replace(/\n/g, '')

            // ----------- remove extra whitespaces -----------
            //script = script.replace(/\s\s/g, '')

            // ----------- convert html &nbps to standard whitespace -----------
            script = script.replace(/&nbsp/g, '')

            // ----------- extract comments if any exists -----------
            if(script.includes('/*')) {
                while(script.includes('/*')) {
                    const startCm = script.indexOf('/*')
                    let endCm = script.length - 1
                    let cm = script.slice(startCm)
                    let _notEnded = true
                    if (script.includes('*/')) {
                        endCm = script.indexOf('*/')
                        cm = script.slice(startCm, endCm + 2)
                        _notEnded = false
                    }
                    // for (let i = startCm; i < endCm + 2; i++) {
                    //     if (script[i]) {
                    //         script = script.slice(0, i) + ' ' + script.slice(i + 1)
                    //     }
                    // }
                    script = _notEnded 
                        ? script.slice(0, startCm) 
                            + ' ' .repeat(cm.length) 
                        : script.slice(0, startCm) 
                            + ' ' .repeat(cm.length) 
                            + script.slice(endCm + 2)
                
                    if (_notEnded) {
                        comments.push({
                            error: 'expected "*/" to end the comment',
                            position: [startCm, endCm]
                        })
                    }
                    else {
                        comments.push({
                            comment: cm,
                            position: [startCm, endCm + 1]
                        })
                    }
                }
            }

            // ----------- begin caching expression sentences -----------
            const originalExp = script
            //let offset = 0
            const expressions: string[] = []
            const positions: number[][] = []
            while (script.length) {
                //[script, offset] = this._trimLeft(script)
                if (script.includes(';')) {
                    const tmp = script.slice(0, script.indexOf(';'))
                    positions.push([
                        originalExp.length - script.length,
                        originalExp.length - script.length + script.indexOf(';'),
                    ])
                    script = script.slice(script.indexOf(';') + 1)
                    expressions.push(tmp)
                }
                else {
                    positions.push([
                        originalExp.length - script.length,
                        originalExp.length - 1,
                    ])
                    expressions.push(script)
                    script = ''
                }
            }

            // ----------- begin parsing expression sentences -----------
            for (let i = 0; i < expressions.length; i++) {
                this._reset()
                const entry = positions[i][0]
                this.state.parse.tags.push([])
                const subExp: string[] = []
                const subExpEntry: number[] = []
                let tmpExp = expressions[i]
                let lhs: string

                // ----------- cache the sub-expressions -----------
                while (tmpExp.includes(',')) {
                    subExp.push(tmpExp.slice(0, tmpExp.indexOf(',') + 1))
                    subExpEntry.push(expressions[i].length - tmpExp.length)
                    tmpExp = tmpExp.slice(tmpExp.indexOf(',') + 1)
                }
                if (tmpExp.length) {
                    subExp.push(tmpExp)
                    subExpEntry.push(expressions[i].length - tmpExp.length)
                }

                // ----------- begin parsing sub-expressions -----------
                for (let j = 0; j < subExp.length; j++) {
                    this.state.depthLevel = 0
                    this.state.ambiguity = false
                    this.state.track.notation = []
                    this.state.track.parens.open = []
                    this.state.track.parens.close = []
                    let _break = false
                    // const _errRhsComments: number[] = []
                    this.input = subExp[j]
                    this.argErr = false
                    const tagsOffset = this.state.parse.tags[i].length
                    const treeOffset = this.state.parse.tree.length

                    // check for lhs/rhs delimitter, exit from parsing this sub-expression if 
                    // no or more than one delimitter was found, else start parsing lhs and rhs
                    if (this.input.match(/:/g)?.length === 1) {
                        lhs = this.input.slice(0, this.input.indexOf(':'))
                        const _lhs = lhs
                        this.exp = this.input.slice(this.input.indexOf(':') + 1)
                        // if (this.exp.includes(':')) {
                        //     this._updateTree({
                        //         error: 'invalid sub-expression',
                        //         position: [
                        //             entry + subExpEntry[j],
                        //             entry + subExpEntry[j] + this.input.length - 1
                        //         ]
                        //     })
                        //     break
                        // }
                        // if (_break) break

                        // ----------- check for invalid RHS comments -----------
                        for (let k = 0; k < comments.length; k++) {
                            if (
                                comments[k].position[0] > entry + subExpEntry[j] + 
                                    this.input.indexOf(':') &&
                                comments[k].position[0] < entry + subExpEntry[j] + 
                                    this.input.length
                            ) {
                                this._updateTree({
                                    error: 'invalid RHS, comments are not allowed',
                                    position: [
                                        entry + subExpEntry[j] + this.input.indexOf(':') + 1,
                                        entry + subExpEntry[j] + this.input.length - 1
                                    ]
                                })
                                comments[k].error = 'invalid comment, RHS comments are not allowed'
                                _break = true
                            }
                        }
                        if (_break) {
                            // for (let k = 0; k < _errRhsComments.length; k++) {
                            //     comments.splice(_errRhsComments[k], 1)
                            // }
                            break
                        }

                        // ----------- begin parsing lhs -----------
                        while (lhs.length > 0) {
                            lhs = this._trimLeft(lhs)[0]
                            if (lhs.length > 0) {
                                const index = lhs.indexOf(' ') > -1 ? lhs.indexOf(' ') : lhs.length
                                const tagName = lhs.slice(0, index)
                                const tagNameLen = tagName.length
                                lhs = lhs.slice(index)
                                let _err = ''
                                if (tagName.search(/[)(<>]/g) > -1) {
                                    _err = 'invalid character in tag'
                                }
                                const _i = this.state.parse.tags[
                                    this.state.parse.tags.length - 1
                                ].findIndex(
                                    v => v.name === tagName
                                )
                                if (_err.length > 0) {
                                    if (_i > -1) this.state.parse.tags[
                                        this.state.parse.tags.length - 1
                                    ].push({
                                        name: tagName,
                                        position: [
                                            entry + subExpEntry[j] + 
                                                _lhs.length - lhs.length - tagNameLen,
                                            entry + subExpEntry[j] +
                                                _lhs.length - lhs.length - 1
                                        ],
                                        error: `"${tagName}" is already in use`
                                    })
                                    else this.state.parse.tags[
                                        this.state.parse.tags.length -1
                                    ].push({
                                        name: tagName,
                                        position: [
                                            entry + subExpEntry[j] + 
                                                _lhs.length - lhs.length - tagNameLen,
                                            entry + subExpEntry[j] +
                                                _lhs.length - lhs.length - 1
                                        ],
                                        error: _err
                                    })
                                }
                                else {
                                    if (_i > -1) this.state.parse.tags[
                                        this.state.parse.tags.length - 1
                                    ].push({
                                        name: tagName,
                                        position: [
                                            entry + subExpEntry[j] + 
                                                _lhs.length - lhs.length - tagNameLen,
                                            entry + subExpEntry[j] +
                                                _lhs.length - lhs.length - 1
                                        ],
                                        error: `"${tagName}" is already in use`
                                    })
                                    else this.state.parse.tags[
                                        this.state.parse.tags.length -1
                                    ].push({
                                        name: tagName,
                                        position: [
                                            entry + subExpEntry[j] + 
                                                _lhs.length - lhs.length - tagNameLen,
                                            entry + subExpEntry[j] +
                                                _lhs.length - lhs.length - 1
                                        ]
                                    })
                                }
                            }
                        }

                        // ----------- begin parsing rhs -----------
                        while (this.exp.length > 0) {

                            this.exp = this._trimLeft(this.exp)[0]
                            const currentPosition = 
                                entry + subExpEntry[j] + this.input.length - this.exp.length

                            if (this.exp.length > 0) {
                                if (this.exp.startsWith('(')) {
                                    this.state.track.parens.open.push(currentPosition)
                                    this.exp = this.exp.replace('(', '')
                                    if (
                                        this.state.track.notation[
                                            this.state.track.notation.length - 1
                                        ] !== Notations.prefix ||
                                        this.state.track.notation[
                                            this.state.track.notation.length - 2
                                        ] !== this.state.depthLevel
                                    ) {
                                        this._updateTree({
                                            opcode: {
                                                name: 'unknown opcode',
                                                position: [],
                                            },
                                            operand: NaN,
                                            output: NaN,
                                            position: [
                                                currentPosition - (
                                                    this.state.track.operandArgs.lenCache.length > 0
                                                        ? this.state.track.operandArgs.lenCache
                                                            .pop()!
                                                        : 0
                                                )
                                            ],
                                            parens: [],
                                            parameters: [],
                                            error: 
                                            // this.state.track.operandArgs.errorCache.length > 0
                                            //     ? this.state.track.operandArgs.errorCache.pop() 
                                                'unknown opcode',
                                        })
                                    }
                                    this.state.depthLevel++
                                    const op = this._getLastTreeElementAtDepth(
                                        this.state.depthLevel - 1
                                    ) as Op
                                    op.parens.push(currentPosition)
                                    this._updateTree(op, true)
                                }
                                else if (this.exp.startsWith(')')) {
                                    if (this.state.track.parens.open.length > 0) {
                                        let multiOutputResolvingDepth = this.state.depthLevel - 1
                                        this.exp = this.exp.replace(')', '')
                                        const postfix = this._isPostfix(this.exp)
                                        this.state.track.parens.close.push(currentPosition)
                                        if (this._isInfix()) {
                                            this.state.track.notation.pop()
                                            this.state.track.notation.pop()
                                            if (postfix || this._isPrefix()) {
                                                this._resolveInfix(true)
                                                multiOutputResolvingDepth++
                                            }
                                            else this._resolveInfix(false)
                                        }
                                        if (postfix && this._isPrefix()) {
                                            const op = this._getLastTreeElementAtDepth(
                                                this.state.depthLevel - 1
                                            ) as Op
                                            this._updateTree(
                                                {
                                                    error: 'invalid notation',
                                                    position: [
                                                        op.position[0],
                                                        Number(postfix[2]) + currentPosition + 1,
                                                    ],
                                                },
                                                true
                                            )
                                            this.state.track.notation.pop()
                                            this.state.track.notation.pop()
                                        }
                                        else if (postfix) {
                                            this._resolvePostfix(
                                                postfix[0],
                                                Number(postfix[1]) + currentPosition + 1,
                                                Number(postfix[2]) + currentPosition + 1,
                                                entry,
                                                postfix[3]
                                            )
                                        }
                                        else if (this._isPrefix()) {
                                            this._resolvePrefix()
                                            this.state.track.notation.pop()
                                            this.state.track.notation.pop()
                                        }
                                        const item = this._getLastTreeElementAtDepth(
                                            multiOutputResolvingDepth
                                        ) as Op
                                        if (item.output > 1) this._resolveMultiOutput(
                                            item.output,
                                            multiOutputResolvingDepth
                                        )
                                        this.state.depthLevel--
                                    }
                                    else {
                                        this.state.parse.tree.splice(
                                            treeOffset - this.state.parse.tree.length
                                        )
                                        this.state.parse.tags[i].splice(
                                            tagsOffset - this.state.parse.tags[i].length
                                        )
                                        this.state.parse.tags[i].push({
                                            name: '_',
                                            position: []
                                        })
                                        this.state.parse.tree.push({
                                            error: 'unexpected ")"',
                                            position: [
                                                entry + subExpEntry[j],
                                                entry + subExpEntry[j] + this.input.length - 1
                                            ]
                                        })
                                        this.exp = this.exp.replace(')', '')
                                        break
                                    }
                                }
                                // else if (this.exp.startsWith('<')) {
                                //     const tmp = this._resolveOperand()
                                //     if (tmp) {
                                //         (tmp as Error).position = [
                                //             currentPosition,
                                //             currentPosition + (tmp as Error).position[0] - 1
                                //         ]
                                //         this._updateTree(tmp)
                                //     }
                                // }
                                else this._consume(currentPosition)
                            }
                        }
                        // ----------- validating RHS against LHS -----------
                        const tmpTree = this.state.parse.tree
                        const zeroOps = this.checkZeroOutputs(tmpTree, treeOffset)
                        const diff = 
                            (this.state.parse.tags[i].length - tagsOffset) - 
                            (this.state.parse.tree.length - treeOffset - zeroOps)
                        if (diff === 0) {
                            let counter = 0
                            for (let k = 0; k < this.state.parse.tree.length - treeOffset; k++) {
                                if (
                                    this.state.parse.tags[i][tagsOffset + k - counter]?.name !== '_' &&
                                    !(
                                        'opcode' in this.state.parse.tree[treeOffset + k] && 
                                        (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                    )
                                ) {
                                    this.state.parse.tree[tagsOffset + k].tag = 
                                        this.state.parse.tags[i][tagsOffset + k - counter]
                                }
                                if (
                                    'opcode' in this.state.parse.tree[treeOffset + k] && 
                                    (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                ) counter++
                            }
                        }
                        else if (diff > 0) {
                            let counter = 0
                            for (let k = 0; k < this.state.parse.tree.length - treeOffset; k++) {
                                if (
                                    this.state.parse.tags[i][tagsOffset + k - counter]?.name !== '_' &&
                                    !(
                                        'opcode' in this.state.parse.tree[treeOffset + k] && 
                                        (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                    )
                                ) {
                                    this.state.parse.tree[treeOffset + k].tag = 
                                        this.state.parse.tags[i][treeOffset + k - counter]
                                }
                                if (
                                    'opcode' in this.state.parse.tree[treeOffset + k] && 
                                    (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                ) counter++
                            }
                            for (let k = 0; k < diff; k++) {
                                this.state.parse.tree.push({
                                    error: 'no RHS item exists to match this LHS item',
                                    position: this.state.parse.tags[i][
                                        this.state.parse.tags[i].length - diff + k
                                    ].position
                                })
                            }
                        }
                        else {
                            let counter = 0
                            for (let k = 0; k < this.state.parse.tree.length - treeOffset; k++) {
                                if (
                                    this.state.parse.tags[i][tagsOffset + k - counter]?.name !== '_' &&
                                    !(
                                        'opcode' in this.state.parse.tree[treeOffset + k] && 
                                        (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                    )
                                ) {
                                    this.state.parse.tree[treeOffset + k].tag = 
                                        this.state.parse.tags[i][treeOffset + k - counter]
                                }
                                if (
                                    'opcode' in this.state.parse.tree[treeOffset + k] && 
                                    (this.state.parse.tree[treeOffset + k] as Op).output === 0
                                ) counter++
                            }
                            for (let k = 0; k < -diff; k++) {
                                this.state.parse.tree[
                                    this.state.parse.tree.length - 1 - k 
                                ].error = 'no LHS item exists to match this existing RHS item'

                            }
                        }
                    }
                    else {
                        if (this._trim(this.input)[0]) {
                            this.state.parse.tags[i].push({
                                name: '_',
                                position: []
                            })
                            this.state.parse.tree.push({
                                error: 'invalid sub-expression',
                                position: [
                                    entry + subExpEntry[j],
                                    entry + subExpEntry[j] + this.input.length - 1
                                ]
                            })
                        }
                        // break
                    }
                }

                // ----------- constructing final parse tree -----------
                // if (this.state.parse.tree.length) {
                this.parseTree[i] = {
                    position: positions[i],
                    tree: this.state.parse.tree.splice(-this.state.parse.tree.length)
                }
                this.treeArray[i] = this.parseTree[i].tree
            }

            // ----------- store valid parsed comments -----------
            if (comments.length > 0) this.comments = comments;

            // ----------- compile bytes -----------
            ({constants: this.constants, sources: this.sources } = this.compile(this.treeArray))
        }
    }

    /**
     * Method to check if the current state of parsing of a node is prefix or not
     */
    private static _isPrefix(): boolean {
        return (
            this.state.track.notation[this.state.track.notation.length - 1] ===
                Notations.prefix &&
            this.state.track.notation[this.state.track.notation.length - 2] ===
                this.state.depthLevel - 1
        )
    }

    /**
     * * Method to check if the current state of parsing of a node is infix or not
     */
    private static _isInfix(): boolean {
        return (
            this.state.track.notation[this.state.track.notation.length - 1] ===
                Notations.infix &&
            this.state.track.notation[this.state.track.notation.length - 2] ===
                this.state.depthLevel
        )
    }

    /**
     * Method to check if the current state of parsing of a node is postfix or not
     */
    private static _isPostfix(str: string): string[] | undefined {
        let offset = 0
        if (!str.length) return undefined
        if (str[0] === ' ' || str[0] === '(' || str[0] === ')') return undefined
        while (str.startsWith(',')) {
            str = str.replace(',', '')
            offset++
        }
        if (str[0] === ' ' || str[0] === '(' || str[0] === ')') return undefined
        const _str = this._normalizeChar(str)
        if (_str.startsWith(this._normalizeChar(this.gte.name))) {
            const tmp = [
                this.gte.name,
                offset.toString(),
                (offset + this.gte.name.length - 1).toString(),
            ]
            if (_str.replace(this._normalizeChar(this.gte.name), '').startsWith('(')) {
                tmp.push(
                    'ambiguous expression/opcode'
                )
                this.state.ambiguity = true
            }
            else if (offset) tmp.push(
                'illigal characters between opcode and parenthesis'
            )
            return tmp
        }
        if (_str.startsWith(this._normalizeChar(this.lte.name))) {
            const tmp = [
                this.lte.name,
                offset.toString(),
                (offset + this.lte.name.length - 1).toString(),
            ]
            if (_str.replace(this._normalizeChar(this.lte.name), '').startsWith('(')) {
                tmp.push(
                    'ambiguous expression/opcode'
                )
                this.state.ambiguity = true
            }
            else if (offset) tmp.push(
                'illigal characters between opcode and parenthesis'
            )
            return tmp
        }
        if (_str.startsWith(this._normalizeChar(this.ineq.name))) {
            const tmp = [
                this.ineq.name,
                offset.toString(),
                (offset + this.ineq.name.length - 1).toString(),
            ]
            if (_str.replace(this._normalizeChar(this.ineq.name), '').startsWith('(')) {
                tmp.push(
                    'ambiguous expression/opcode'
                )
                this.state.ambiguity = true
            }
            else if (offset) tmp.push(
                'illigal characters between opcode and parenthesis'
            )
            return tmp
        }
        if (this.gte.aliases) {
            for (let i = 0; i < this.gte.aliases.length; i++) {
                if (_str.startsWith(this.gte.aliases[i])) {
                    const tmp = [
                        this.gte.name,
                        offset.toString(),
                        (offset + this.gte.aliases[i].length - 1).toString(),
                    ]
                    if (_str.replace(this.gte.aliases[i], '').startsWith('(')) {
                        tmp.push(
                            'ambiguous expression/opcode'
                        )
                        this.state.ambiguity = true
                    }
                    else if (offset) tmp.push(
                        'illigal characters between opcode and parenthesis'
                    )
                    return tmp
                }
            }
        }
        if (this.lte.aliases) {
            for (let i = 0; i < this.lte.aliases?.length; i++) {
                if (_str.startsWith(this.lte.aliases[i])) {
                    const tmp = [
                        this.lte.name,
                        offset.toString(),
                        (offset + this.lte.aliases[i].length - 1).toString(),
                    ]
                    if (_str.replace(this.lte.aliases[i], '').startsWith('(')) {
                        tmp.push(
                            'ambiguous expression/opcode'
                        )
                        this.state.ambiguity = true
                    }
                    else if (offset) tmp.push(
                        'illigal characters between opcode and parenthesis'
                    )
                    return tmp
                }
            }
        }
        if (this.ineq.aliases) {
            for (let i = 0; i < this.ineq.aliases?.length; i++) {
                if (_str.startsWith(this.ineq.aliases[i])) {
                    const tmp = [
                        this.ineq.name,
                        offset.toString(),
                        (offset + this.ineq.aliases[i].length - 1).toString(),
                    ]
                    if (_str.replace(this.ineq.aliases[i], '').startsWith('(')) {
                        tmp.push(
                            'ambiguous expression/opcode'
                        )
                        this.state.ambiguity = true
                    }
                    else if (offset) tmp.push(
                        'illigal characters between opcode and parenthesis'
                    )
                    return tmp
                }
            }
        }
        for (let i = 0; i < this.names.length; i++) {
            if (_str.startsWith(this._normalizeChar(this.names[i]))) {
                const tmp = [
                    this.names[i],
                    offset.toString(),
                    (offset + this.names[i].length - 1).toString(),
                ]
                if (_str.replace(this._normalizeChar(this.names[i]), '').startsWith('(')) {
                    this.state.ambiguity = true
                    tmp.push('ambiguous expression/opcode')
                }
                else if (offset) tmp.push(
                    'illigal characters between opcode and parenthesis'
                )
                return tmp
            }
        }
        for (let i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i]) {
                for (let j = 0; j < this.aliases[i]!.length; j++) {
                    if (_str.startsWith(this.aliases[i]![j])) {
                        const tmp = [
                            this.names[i],
                            offset.toString(),
                            (offset + this.aliases[i]![j].length - 1).toString(),
                        ]
                        if (_str.replace(this.aliases[i]![j], '').startsWith('(')) {
                            this.state.ambiguity = true
                            tmp.push('ambiguous expression/opcode')
                        }
                        else if (offset) tmp.push(
                            'illigal characters between opcode and parenthesis'
                        )
                        return tmp
                    }
                }
            }
        }
        return undefined
    }

    /**
     * Method to get the last item of a Node at a specified depth level of parse tree
     */
    private static _getLastTreeElementAtDepth(depthLevel: number): Node {
        let tmp: Node
        tmp = this.state.parse.tree[this.state.parse.tree.length - 1]
        for (let i = 0; i < depthLevel; i++) {
            tmp = (tmp as Op).parameters[(tmp as Op).parameters.length - 1]
        }
        return tmp
    }

    /**
     * Method to update the elements of a Node
     */
    private static _updateTree(item: Node, replace?: boolean) {
        let tmp: Node[] = this.state.parse.tree
        if (replace) {
            // const tmp: Node[][] = []
            // tmp.push(this.state.parse.tree)
            // for (let i = 0; i < this.state.depthLevel - 1; i++) {
            //     tmp.push(
            //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
            //     )
            // }
            // tmp[tmp.length - 1].pop()
            // tmp[tmp.length - 1].push(item)
            // while (tmp.length > 1) {
            //     const updatedParams = tmp.pop()!;
            //     (tmp[tmp.length - 1][
            //         tmp[tmp.length - 1].length - 1
            //     ] as Op).parameters = updatedParams
            // }
            // this.state.parse.tree = tmp[0]
            
            for (let i = 0; i < this.state.depthLevel - 1; i++) {
                tmp = (tmp[tmp.length - 1] as Op).parameters
            }
            tmp.pop()
        }
        else {
            // const tmp: Node[][] = []
            // tmp.push(this.state.parse.tree)
            // for (let i = 0; i < this.state.depthLevel; i++) {
            //     tmp.push(
            //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
            //     )
            // }
            // tmp[tmp.length - 1].push(item)
            // while (tmp.length > 1) {
            //     const updatedParams = tmp.pop()!;
            //     (tmp[tmp.length - 1][
            //         tmp[tmp.length - 1].length - 1
            //     ] as Op).parameters = updatedParams
            // }
            // this.state.parse.tree = tmp[0]
            for (let i = 0; i < this.state.depthLevel; i++) {
                tmp = (tmp[tmp.length - 1] as Op).parameters
            }
        }
        tmp.push(item)
    }

    /**
     * Method to handle operand arguments
     */
    private static _resolveOperand(op?: Op, postfixCheck?: boolean): Op | Error | undefined {
        let _err: string | undefined
        let _len = this.exp.length
        
        if (!this.exp.includes('>')) {
            _err = 'expected ">"'
            this.exp = ''
            this.argErr = true
        }
        else {
            let _operandArgs = this.exp.slice(1, this.exp.indexOf('>'))
            this.exp = this.exp.slice(this.exp.indexOf('>') + 1)
            _len = _operandArgs.length + 2
            if (_operandArgs.search(/[()<]/g) > -1) {
                _err = 'found invalid character in operand arguments'
                this.argErr = true
            }
            else {
                this.state.track.operandArgs.cache.push([])
                while (_operandArgs.length) {
                    _operandArgs = this._trimLeft(_operandArgs)[0]
                    const index = this._findIndex(_operandArgs) < 0
                        ? _operandArgs.length
                        : this._findIndex(_operandArgs) === 0
                            ? 1
                            : this._findIndex(_operandArgs)
                    const arg = _operandArgs.slice(0, index)
                    _operandArgs = _operandArgs.slice(index)
                    if (isBigNumberish(arg)) {
                        this.state.track.operandArgs.cache[
                            this.state.track.operandArgs.cache.length - 1
                        ].push(Number(arg))
                    }
                    else {
                        _err = 'found invalid character in operand arguments'
                        this.argErr = true
                        break
                    }
                }
            }
        }
        if (op) {
            if (_err) op.error = _err
            if (postfixCheck) op.position[1] += _len
            return op
        }
        else {
            _err = 'invalid use of <...>, it should come right after an opcode'
            if (this.exp.startsWith('(')) {
                // this.state.track.operandArgs.errorCache.push(_err)
                this.state.track.operandArgs.lenCache.push(_len)
                return undefined
            }
            else return {
                error: 'invalid use of <...>, it should come right after an opcode',
                position: [_len]
            } as Error
        }
    }

    /**
     * Method to resolve prefix notations at current state of parsing
     */
    private static _resolvePrefix() {
        this.state.track.parens.open.pop()
        const endPosition = this.state.track.parens.close.pop()!
        // const tmp: Node[][] = []
        // tmp.push(this.state.parse.tree)
        // for (let i = 0; i < this.state.depthLevel - 1; i++) {
        //     tmp.push(
        //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
        //     )
        // }
        // const node = tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op
        // node.position.push(endPosition)
        // node.parens.push(endPosition)
        // if (node.error === 'no closing parenthesis') {
        //     if (node.opcode.name.includes('unknown')) node.error = 'unknown opcode'
        //     else node.error = undefined
        // }
        // if (!node.error) {
        //     tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] = this._resolveOp(node)
        // }
        // while (tmp.length > 1) {
        //     const resolvedExp = tmp.pop()!;
        //     (tmp[tmp.length - 1][
        //         tmp[tmp.length - 1].length - 1
        //     ] as Op).parameters = resolvedExp
        // }
        // this.state.parse.tree = tmp[0]
        let tmp: Node[] = this.state.parse.tree
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            tmp = (tmp[tmp.length - 1] as Op).parameters
        }
        const node = tmp[tmp.length - 1] as Op
        node.position.push(endPosition)
        node.parens.push(endPosition)
        if (node.error === 'no closing parenthesis') {
            if (node.opcode.name.includes('unknown')) node.error = 'unknown opcode'
            else delete node.error
        }
        tmp[tmp.length - 1] = this._resolveOp(node)
    }

    /**
     * Method to resolve postfix notations at current state of parsing
     */
    private static _resolvePostfix(
        opcode: string,
        startPosition: number,
        endPosition: number,
        entry: number,
        error?: string,
    ) {
        this.exp = this.input.slice(endPosition + 1 - entry)
        this.state.track.parens.open.pop()
        // const tmp: Node[][] = []
        // tmp.push(this.state.parse.tree)
        // for (let i = 0; i < this.state.depthLevel - 1; i++) {
        //     tmp.push(
        //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op)
        //             .parameters
        //     )
        // }
        // const node = tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op
        let tmp: Node[] = this.state.parse.tree
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            tmp = (tmp[tmp.length - 1] as Op).parameters
        }
        const node = tmp[tmp.length - 1] as Op
        let op = {
            opcode: {
                name: opcode,
                position: [startPosition, endPosition],
            },
            operand: 
                opcode === this.gte.name || opcode === this.lte.name || opcode === this.ineq.name
                    ? 0
                    : NaN,
            output:
                opcode === this.gte.name || opcode === this.lte.name || opcode === this.ineq.name
                    ? 1
                    : NaN,
            position: [node.position[0], endPosition],
            parens: [node.position[0], this.state.track.parens.close.pop()!],
            parameters: node.parameters,
            data: opcode === this.gte.name
                ? this.gte.data
                : opcode === this.lte.name
                    ? this.lte.data
                    : opcode === this.ineq.name
                        ? this.ineq.data
                        : this.data[this.names.indexOf(opcode)],
            error,
            tag: node.tag
        } as Op
        if (this.exp.startsWith('<')) op = this._resolveOperand(op, true) as Op
        tmp[tmp.length - 1] = this._resolveOp(op)
        // while (tmp.length > 1) {
        //     const resolvedExp = tmp.pop()!;
        //     (tmp[tmp.length - 1][
        //         tmp[tmp.length - 1].length - 1
        //     ] as Op).parameters = resolvedExp
        // }
        // this.state.parse.tree = tmp[0]
    }

    /**
     * Method to resolve infix notations at current state of parsing
     */
    private static _resolveInfix(isParameter: boolean) {
        // const tmp: Node[][] = []
        // tmp.push(this.state.parse.tree)
        // for (let i = 0; i < this.state.depthLevel; i++) {
        //     tmp.push(
        //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
        //     )
        // } 
        let tmp: Node[] = this.state.parse.tree
        let node: Op = tmp[tmp.length - 1] as Op
        for (let i = 0; i < this.state.depthLevel; i++) {
            tmp = (tmp[tmp.length - 1] as Op).parameters
            if (this.state.depthLevel - 1 !== i) 
                node = tmp[tmp.length - 1] as Op
        }
        const elements = tmp
        //const node = tmp[tmp.length -1] as Op
        let err = false
        let op: Node
        //const elements: Node[] = tmp[tmp.length - 1]
        //const node = tmp[tmp.length - 2][tmp[tmp.length - 2].length - 1] as Op
        const closeParenPosition =
            this.state.track.parens.close[this.state.track.parens.close.length - 1]

        // if prefix-infix
        if ('opcode' in elements[0] && elements[0].infixOp) {
            op = elements[0]
            op.position.push(...node.parens)
            op.parens.push(...node.parens)
            for (let i = 1; i < elements.length; i++) {
                const item = elements[i]
                if ('opcode' in item && item.infixOp) {
                    err = true
                    op.error = 'invalid infix expression'
                    break
                }
            }
            if (!err) op.parameters = elements.slice(1, elements.length)
            op.position.push(closeParenPosition)
            op.parens.push(closeParenPosition)
        }
        // if postfix-infix
        else if (
            'opcode' in elements[elements.length - 1] &&
            (elements[elements.length - 1] as Op).infixOp
        ) {
            op = elements[elements.length - 1] as Op
            op.position.push(...node.parens)
            op.parens.push(...node.parens)
            for (let i = 0; i < elements.length - 1; i++) {
                const item = elements[i]
                if ('opcode' in item && item.infixOp) {
                    err = true
                    op.error = 'invalid infix expression'
                    break
                }
            }
            if (!err) op.parameters = elements.slice(0, -1)
            op.position.push(closeParenPosition)
            op.parens.push(closeParenPosition)
        }

        // if infix-infix
        else {
            const params: Node[] = [elements[0]]
            if ('opcode' in elements[1] && elements[1].infixOp) {
                op = elements[1]
                op.position.push(...node.parens)
                op.parens.push(...node.parens)
                for (let i = 2; i < elements.length; i++) {
                    if (i % 2 === 0) params.push(elements[i])
                    else {
                        const item = elements[i]
                        if ('opcode' in item && item.infixOp && op.opcode.name === item.opcode.name) {
                            op.opcode.position.push(...item.opcode.position)
                        }
                        else {
                            if ('opcode' in item) {
                                op.error = `invalid opcode format at position ${item.opcode.position}`
                            }
                            else {
                                op.error = `expected opcode but got value at position ${item.position}`
                            }
                            err = true
                            break
                        }
                    }
                }
                if (!err) op.parameters = params
                op.position.push(closeParenPosition)
                op.parens.push(closeParenPosition)
            }
            else {
                op = {
                    error: 'invalid infix expression',
                    position: [
                        node.parens[0],
                        closeParenPosition,
                    ],
                }
                err = true
            }
        }
        delete (op as Op).infixOp
        if (!err) op = this._resolveOp(op as Op)
        if (isParameter) {
            const item = this._getLastTreeElementAtDepth(this.state.depthLevel - 1) as Op
            item.parameters = [op]
            op = item
        }
        else {
            this.state.track.parens.open.pop()
            this.state.track.parens.close.pop()
        }
        this._updateTree(op, true)
    }

    /**
     * Method to resolve multi output nodes at current state of parsing
     */
    public static _resolveMultiOutput = (totalCount: number, depthLevel: number) => {
        const isOutput = (element: Node): boolean => {
            return ('value' in element && element.value === this.placeholder)
        }
        let count = 0
        // const tmp: Node[][] = []
        // tmp.push(this.state.parse.tree)
        // for (let i = 0; i < depthLevel; i++) {
        //     tmp.push(
        //         (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
        //     )
        // }
        // for (let i = tmp[tmp.length - 1].length - 2; i > -1; i--) {
        //     if (count !== totalCount) {
        //         if (!isOutput(tmp[tmp.length - 1][i])) {
        //             (tmp[tmp.length - 2][tmp[tmp.length - 2].length - 1] as Op).error =
        //                 `illigal placement of outputs, parameter ${i - 1} cannot be accessed by this opcode`
        //             break
        //         }
        //         else {
        //             count++
        //             tmp[tmp.length - 1][i] = {
        //                 value: (this.state.parse.multiOutputCache[
        //                     this.state.parse.multiOutputCache.length - 1
        //                 ].pop()! as Value).value,
        //                 position: tmp[tmp.length - 1][i].position
        //             }
        //         }
        //     }
        //     else break
        // }
        // while (tmp.length > 1) {
        //     const resolvedExp = tmp.pop()!;
        //     (tmp[tmp.length - 1][
        //         tmp[tmp.length - 1].length - 1
        //     ] as Op).parameters = resolvedExp
        // }
        // this.state.parse.tree = tmp[0]
        // if (count !== totalCount) {
        //     const item = tmp[0].pop()!
        //     tmp[0].push(...this.state.parse.multiOutputCache[
        //         this.state.parse.multiOutputCache.length - 1
        //     ])
        //     this.state.parse.multiOutputCache.pop()
        //     tmp[0].push(item)
        // }
        let _childeNodes: Node[] = this.state.parse.tree
        const _parentNodes: Node[] = [_childeNodes[_childeNodes.length - 1]]
        for (let i = 0; i < depthLevel; i++) {
            _childeNodes = (_childeNodes[_childeNodes.length - 1] as Op).parameters
            if (depthLevel - 1 !== i) 
                _parentNodes.push(_childeNodes[_childeNodes.length - 1])
        }
        for (let i = _childeNodes.length - 2; i > -1; i--) {
            if (count !== totalCount) {
                if (isOutput(_childeNodes[i])) {
                    count++
                    (_childeNodes[i] as Value).value = (
                        this.state.parse.multiOutputCache[
                            this.state.parse.multiOutputCache.length - 1
                        ].pop()! as Value).value
                }
                else {
                    if (depthLevel > 0) {
                        _childeNodes[i].error = 'invalid placement'
                        _parentNodes[_parentNodes.length -1].error = 
                            `unexpected inputs, parameter ${
                                i - 1
                            } cannot be accessed by this opcode`
                    }
                    // else {
                    //     _childeNodes[i].error = 'invalid placement'
                    //     // if (i > 0) _childeNodes[i - 1].error = 
                    //     //     'invalid placement'
                    // }
                    break
                }
            }
            else break
        }
        if (count !== totalCount) {
            if (depthLevel > 1) {
                for (let i = _parentNodes.length - 2; i > -1; i--) {
                    if ((_parentNodes[i] as Op).parameters.length !== 1) {
                        const item = (_parentNodes[i] as Op).parameters.pop()!;
                        (_parentNodes[i] as Op).parameters.push(
                            ...this.state.parse.multiOutputCache[
                                this.state.parse.multiOutputCache.length - 1
                            ]
                        )
                        this.state.parse.multiOutputCache.pop();
                        (_parentNodes[i] as Op).parameters.push(item)
                    }
                }
            }
            else {
                const item = this.state.parse.tree.pop()!
                this.state.parse.tree.push(...this.state.parse.multiOutputCache[
                    this.state.parse.multiOutputCache.length - 1
                ])
                this.state.parse.multiOutputCache.pop()
                this.state.parse.tree.push(item)
            }
        }
    }

    /**
     * Method that resolves the opcode Node once its respective closing paren has consumed
     */
    private static _resolveOp = (opNode: Op): Op | Error => {
        let check = true
        let result: Op | Error = opNode
        const op = this.names.indexOf(opNode.opcode.name)
        if (
            opNode.opcode.name === this.gte.name || 
            opNode.opcode.name === this.lte.name || 
            opNode.opcode.name === this.ineq.name
        ) {
            opNode.operand = 0
            opNode.output = 1
            if (opNode.parameters.length !== 2) {
                opNode.error = "invalid number of parameters, need 2 items to compare"
                opNode.operand = NaN
            }
        }
        else {
            if (op !== -1) {
                const _operandArgs = this.state.track.operandArgs.cache[
                    this.state.track.operandArgs.cache.length - 1
                ]
                if (this.paramsValidRange[op](opNode.parameters.length)) {
                    if (this.operandMetas[op].argsConstraints.length) {
                        this.state.track.operandArgs.cache.pop()
                        if (this.operandMetas[op].argsConstraints.length === _operandArgs.length) {
                            let _err = false
                            for (let i = 0; i < this.operandMetas[op].argsConstraints.length; i++) {
                                if (!this.operandMetas[op].argsConstraints[i](
                                    _operandArgs[i],
                                    opNode.parameters.length
                                )) {
                                    _err = true
                                    opNode.error = `out-of-bound operand argument at index ${i}`
                                    this.pops
                                }
                            }
                            if (!_err) {
                                opNode.operand = this.operandMetas[op].encoder(
                                    _operandArgs,
                                    opNode.parameters.length
                                )
                                opNode.output = this.pushes[op](opNode.operand)
                            }
                        }
                        else {
                            opNode.error = `invalid operand arguments`
                            opNode.output = NaN
                        }
                    }
                    else {
                        opNode.operand = this.operandMetas[op].encoder([], opNode.parameters.length)
                        opNode.output = this.pushes[op](opNode.operand)
                        if (opNode.output === 0 && this.state.depthLevel > 1) {
                            check = false
                            result = {
                                error: 'zero output opcodes cannot be nested',
                                position: opNode.position
                            }
                        }
                    }
                }
                else {
                    opNode.error = `invalid number of parameteres`
                    opNode.output = NaN
                }
            }
            if (opNode.output > 1) {
                this.state.parse.multiOutputCache.push([])
                for (let i = 0; i < opNode.output - 1; i++) {
                    this.state.parse.multiOutputCache[
                        this.state.parse.multiOutputCache.length - 1
                    ].push({
                        value: `${opNode.opcode.name} output ${i + 1} placeholder`,
                        position: [],
                    })
                }
            }
        }
        if (check) result = opNode
        return result
    }

    /**
     * Method that consumes the words from the expression and updates the parse tree with their Node type
     */
    private static _consume(entry: number): void {
        if (this.exp.length > 0) {
            let check = true
            const index = this._findIndex(this.exp) < 0
                ? this.exp.length
                : this._findIndex(this.exp) === 0
                    ? 1
                    : this._findIndex(this.exp)

            let str = this.exp.slice(0, index)
            const consumee = str
            str = this._trim(str)[0]
            const startPosition = entry + consumee.indexOf(str)
            
            if (str.includes(',')) {
                this.state.parse.tree.push({
                    error: `invalid comma: ${str}`,
                    position: [startPosition, startPosition + str.length - 1],
                })
                this.exp = this.exp.replace(consumee, '')
            }
            else {
                const str_ = this._normalizeChar(str)
                if (                        
                    str_ === this._normalizeChar(this.gte.name) ||
                    this.gte.aliases?.includes(str_) ||
                    str_ === this._normalizeChar(this.lte.name) ||
                    this.lte.aliases?.includes(str_) ||
                    str_ === this._normalizeChar(this.ineq.name) ||
                    this.ineq.aliases?.includes(str_)
                ) {
                    check = false
                    const isGte =
                        str_ === this._normalizeChar(this.gte.name) ||
                        this.gte.aliases?.includes(str_)
                    const isLte =
                        str_ === this._normalizeChar(this.lte.name) ||
                        this.lte.aliases?.includes(str_)
                    this.exp = this.exp.replace(consumee, '')
                    const op: Op = {
                        opcode: {
                            name: isGte ? this.gte.name : isLte ? this.lte.name : this.ineq.name,
                            position: [startPosition, startPosition + str_.length - 1],
                        },
                        operand: 0,
                        output: 1,
                        position: [startPosition],
                        parens: [],
                        parameters: [],
                        data: isGte ? this.gte.data : isLte ? this.lte.data : this.ineq.data,
                    }
                    if (this.exp.startsWith('(')) {
                        this.state.track.notation.push(
                            this.state.depthLevel,
                            Notations.prefix
                        )
                        if (consumee.endsWith(str)) {
                            op.error = this.state.ambiguity
                                ? 'ambiguous expression/opcode'
                                : 'no closing parenthesis'
                            this._updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                        else {
                            op.error = this.state.ambiguity
                                ? 'ambiguous expression/opcode'
                                : 'illigal characters between opcode and parenthesis'
                            this._updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                    }
                    else {
                        if (!this._isInfix() && this.state.depthLevel > 0) {
                            this.state.track.notation.push(
                                this.state.depthLevel,
                                Notations.infix
                            )
                        }
                        else {
                            op.error = 
                                'opcodes with no parens is only allowed if wrapped by parens'
                        }
                        op.infixOp = true
                        op.position = []
                        this._updateTree(op)
                        if (this.state.ambiguity) this.state.ambiguity = false
                    }
                }
                else {
                    for (let i = 0; i < this.aliases.length; i++) {
                        if (this.aliases[i] && this.aliases[i]!.includes(str_)) {
                            this.exp = this.exp.replace(consumee, '')
                            const op: Op = {
                                opcode: {
                                    name: this.names[i],
                                    position: [startPosition, startPosition + str_.length - 1],
                                },
                                operand: NaN,
                                output: NaN,
                                position: [startPosition],
                                parens: [],
                                parameters: [],
                                data: this.data[i],
                            }
                            if (this.exp.startsWith('<')) this._resolveOperand(op)
                            if (this.exp.startsWith('(')) {
                                this.state.track.notation.push(
                                    this.state.depthLevel,
                                    Notations.prefix
                                )
                                if (consumee.endsWith(str)) {
                                    if (!this.argErr) {
                                        op.error = this.state.ambiguity 
                                            ? 'ambiguous expression/opcode'
                                            : 'no closing parenthesis'
                                    }
                                    this._updateTree(op)
                                    if (this.state.ambiguity) this.state.ambiguity = false
                                }
                                else {
                                    if (!this.argErr) {
                                        op.error = this.state.ambiguity
                                            ? 'ambiguous expression/opcode'
                                            : 'illigal characters between opcode and parenthesis'
                                    }
                                    this._updateTree(op)
                                    if (this.state.ambiguity) this.state.ambiguity = false
                                }
                            }
                            else {
                                if (!this._isInfix() && this.state.depthLevel > 0) {
                                    this.state.track.notation.push(
                                        this.state.depthLevel,
                                        Notations.infix
                                    )
                                }
                                else {
                                    if (!this.argErr) {
                                        op.error = 
                                            'opcodes with no parens is only allowed if wrapped by parens'
                                    }
                                }
                                op.infixOp = true
                                op.position = []
                                this._updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                            check = false
                            break
                        }
                    }
                }
                if (check) {
                    const str_ = this._normalizeChar(str)
                    const names = this.names.map(
                        (v, i, names) => names[i] = this._normalizeChar(v)
                    )
                    if (names.includes(str_)) {
                        this.exp = this.exp.replace(consumee, '')
                        const enum_ = names.indexOf(str_)
                        const op: Op = {
                            opcode: {
                                name: this.names[enum_],
                                position: [startPosition, startPosition + str_.length - 1],
                            },
                            operand: NaN,
                            output: NaN,
                            position: [startPosition],
                            parens: [],
                            parameters: [],
                            data: this.data[enum_],
                        }
                        if (this.exp.startsWith('<')) this._resolveOperand(op)
                        if (this.exp.startsWith('(')) {
                            this.state.track.notation.push(
                                this.state.depthLevel,
                                Notations.prefix
                            )
                            if (consumee.endsWith(str)) {
                                if (!this.argErr) {
                                    op.error = this.state.ambiguity 
                                        ? 'ambiguous expression/opcode'
                                        : 'no closing parenthesis'
                                }
                                this._updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                            else {
                                if (!this.argErr) {
                                    op.error = this.state.ambiguity
                                        ? 'ambiguous expression/opcode'
                                        : 'illigal characters between opcode and parenthesis'
                                }
                                this._updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                        }
                        else {
                            if (!this._isInfix() && this.state.depthLevel > 0) {
                                this.state.track.notation.push(
                                    this.state.depthLevel,
                                    Notations.infix
                                )
                            }
                            else {
                                if (!this.argErr) {
                                    op.error = 
                                        'opcodes with no parens is only allowed if wrapped by parens'
                                }
                            }
                            op.infixOp = true
                            op.position = []
                            this._updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                    }
                    // else if (str_ === 'ARG') {
                    //     str = 'arg'
                    //     this.exp = this.exp.replace(consumee, '')
                    //     const i_ = this.exp.indexOf(')') + 1
                    //     str = str + this.exp.slice(0, i_)
                    //     this.exp = this.exp.slice(i_, this.exp.length)
                    //     this._updateTree({
                    //         value: str,
                    //         position: [startPosition, startPosition + str.length - 1],
                    //     })
                    // }
                    else if (str === this.placeholder) {
                        this._updateTree({
                            value: this.placeholder,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (isBigNumberish(str)) {
                        this._updateTree({
                            value: str,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (str_ === 'MAXUINT256' || str_ === 'INFINITY') {
                        this._updateTree({
                            value: str_ === 'MAXUINT256' ? 'MaxUint256' : 'Infinity',
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (
                        this.state.parse.tags[this.state.parse.tags.length - 1].findIndex(
                            (v) => v.name === str
                        ) > -1
                    ) {
                        const _i = this.state.parse.tags[
                            this.state.parse.tags.length - 1
                        ].findIndex(
                            (v) => v.name === str
                        )
                        if (this.state.depthLevel === 0) {
                            if (_i === this.state.parse.tree.length) this._updateTree({
                                name: str,
                                position: [startPosition, startPosition + str.length - 1],
                                error: 'invalid word, cannot reference to self'
                            })
                            else this._updateTree({
                                name: str,
                                position: [startPosition, startPosition + str.length - 1],
                            })
                        }
                        else {
                            if (_i === this.state.parse.tree.length - 1) this._updateTree({
                                name: str,
                                position: [startPosition, startPosition + str.length - 1],
                                error: 'invalid word, cannot reference to self'
                            })
                            else this._updateTree({
                                name: str,
                                position: [startPosition, startPosition + str.length - 1],
                            })
                        }
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else {
                        this.exp = this.exp.replace(consumee, '')
                        const op = {
                            opcode: {
                                name: `${str} is unknown opcode`,
                                position: [startPosition, startPosition + str.length],
                            },
                            operand: NaN,
                            output: NaN,
                            position: [startPosition],
                            parens: [],
                            parameters: []
                        } as Op
                        if (this.exp.startsWith('<')) this._resolveOperand(op)
                        if (this.exp.startsWith('(')) {
                            this.state.track.notation.push(
                                this.state.depthLevel,
                                Notations.prefix
                            )
                            if (!this.argErr) {
                                op.error = this.state.ambiguity 
                                    ? 'ambiguous expression/opcode'
                                    : 'no closing parenthesis'
                            }
                            this._updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                        else {
                            this._updateTree({
                                error: `${str} is unknown`,
                                position: [startPosition, startPosition + str.length - 1],
                            })
                        }
                    }
                }
            }
        }
    }

    /**
     * Method to check for errors in parse tree once an expression is fully parsed
     */
    private static _errorCheck(element: Node): boolean {
        if ('opcode' in element) {
            if (element.error) return false
            else if (isNaN(element.operand) || isNaN(element.output)) return false
            else {
                for (let i = 0; i < element.parameters.length; i++) {
                    if (!this._errorCheck(element.parameters[i])) return false
                }
                return true
            }
        }
        else if (element.error) return false
        else return true
    }

    /**
     * Method to check for zero output opcodes
     */
    private static checkZeroOutputs(nodes: Node[], skip?: number): number {
        let _count = 0
        if (skip) nodes = nodes.slice(skip - nodes.length)
        for (let i = 0; i < nodes.length; i++) {
            const _node = nodes[i]
            if ('opcode' in _node && _node.output === 0) _count++
        }
        return _count
    }

    // /**
    //  * Count stackless errors, stackless error are those that do not represent an actual Node
    //  */
    // private static countStacklessErrors(nodes: Node[]): number {
    //     let count = 0
    //     for (let i = 0; i < nodes.length; i++) {
    //         if ('stackless' in nodes[i]) count++
    //     }
    //     return count
    // }

    // /**
    //  * Method to update the arguments of zipmaps after full bytes compilation (if any present)
    //  */
    // public static _updateArgs(config: StateConfig): StateConfig {
    //     for (let i = 0; i < config.sources.length; i++) {
    //         for (let j = 0; j < config.sources[i].length; j += 4) {
    //             if (config.sources[i][j + 1] === this.names.length) {
    //                 (config.sources[i] as Uint8Array)[j + 1] = 0;
    //                 (config.sources[i] as Uint8Array)[j + 3] += config.constants.length
    //             }
    //         }
    //     }
    //     return config
    // }

    // /**
    //  * Method to count all arguments of all zipmaps (if any present)
    //  */
    // private static _countArgs(tree: Record<number, Node[]>): number[] {
    //     let count = 0
    //     const argCache: number[] = []
    //     const elements = Object.values(tree)
    //     const counter = (element: Node): number[] => {
    //         const c_: number[] = []
    //         if ('opcode' in element) {
    //             if (element.opcode.name === 'ZIPMAP') {
    //                 c_.push(element.parameters.length)
    //             }
    //             for (let i = 0; i < element.parameters.length; i++) {
    //                 c_.push(...counter(element.parameters[i]))
    //             }
    //         }
    //         return c_
    //     }
    //     for (let i = 0; i < elements.length; i++) {
    //         for (let j = 0; j < elements[i].length; j++) {
    //             argCache.push(...counter(elements[i][j]))
    //         }
    //     }
    //     for (let i = 0; i < argCache.length; i++) {
    //         count += argCache[i]
    //     }
    //     argCache.unshift(0, 0)
    //     argCache.unshift(count)
    //     return argCache
    // }
}
