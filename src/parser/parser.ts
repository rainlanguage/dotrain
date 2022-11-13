/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { standardOpMeta } from '../standardOpMeta'
import { BigNumberish, BytesLike } from 'ethers'
import { AllStandardOps, IOperand, IOpIO, ParamsValidRange, StateConfig } from '../types'
import {
    concat,
    isBigNumberish,
    memoryOperand,
    MemoryType,
    op
} from '../utils'
import {
    gteParserOpcode,
    ineqParserOpcode,
    lteParserOpcode,
    Notations,
    ParseTree,
    State,
    Node,
    Error,
    Op,
    Tag,
} from './types'

/**
 * @public
 * Parser is a mini compiler to generate a valid StateConfig (deployable bytes) from a text script
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
    private static placeholder = '_'
    private static treeArray: Record<number, Node[]> = {}
    private static data: any[] = standardOpMeta.map(v => v.data)
    private static enums: number[] = standardOpMeta.map(v => v.enum)
    private static names: string[] = standardOpMeta.map(v => v.name)
    private static pops: IOpIO[] = standardOpMeta.map(v => v.inputs)
    private static pushes: IOpIO[] = standardOpMeta.map(v => v.outputs)
    private static oprnds: IOperand[] = standardOpMeta.map(v => v.operand)
    private static aliases: (string[] | undefined)[] = standardOpMeta.map(v => v.aliases)
    private static paramsValidRange: ParamsValidRange[] = standardOpMeta.map(
        v => v.paramsValidRange
    )
    private static state: State = {
        parse: {
            tree: [],
            tags: [],
            moCache: []
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
    private static gte = gteParserOpcode
    private static lte = lteParserOpcode
    private static ineq = ineqParserOpcode

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
        this.gte.data = data
        this.gte.aliases = aliases
        this.gte.description = description
        if (this.gte.aliases) {
            this.gte.aliases.forEach(
                (v, i, array) => array[i] = this.handleLetterCase(v)
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
        this.lte.data = data
        this.lte.aliases = aliases
        this.lte.description = description
        if (this.lte.aliases) {
            this.lte.aliases.forEach(
                (v, i, array) => array[i] = this.handleLetterCase(v)
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
    public static setIneqMeta(name?: string, description?: string, data?: any, aliases?: string[]) {
        if (name) this.ineq.name = name
        this.ineq.data = data
        this.ineq.aliases = aliases
        this.ineq.description = description
        if (this.ineq.aliases) {
            this.ineq.aliases.forEach(
                (v, i, array) => array[i] = this.handleLetterCase(v)
            )
        }
    }

    /**
     * @public
     * Method to get parse tree object and StateConfig
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @param multiOutputPlaceholderChar - (optional) custom multi output placeholder character, default is '_'
     * @returns Array of parse tree object and StateConfig
     */
    public static get(
        expression: string,
        opmeta?: typeof standardOpMeta,
        multiOutputPlaceholderChar?: string
    ): [ParseTree, StateConfig] {
        this.parse(expression, opmeta, multiOutputPlaceholderChar)
        return [this.parseTree, { constants: this.constants, sources: this.sources } ]
    }

    /**
     * @public
     * Method to get the parse tree object
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @param multiOutputPlaceholderChar - (optional) custom multi output placeholder character, default is '_'
     * @returns A parse tree object
     */
    public static getParseTree(
        expression: string,
        opmeta?: typeof standardOpMeta,
        multiOutputPlaceholderChar?: string
    ): ParseTree {
        this.parse(expression, opmeta, multiOutputPlaceholderChar)
        return this.parseTree
    }

    /**
     * @public
     * Method to get the StateConfig
     *
     * @param expression - the text expression
     * @param opmeta - (optional) custom opmeta
     * @param multiOutputPlaceholderChar - (optional) custom multi output placeholder character, default is '_'
     * @returns A StateConfig
     */
    public static getStateConfig(
        expression: string,
        opmeta?: typeof standardOpMeta,
        multiOutputPlaceholderChar?: string
    ): StateConfig {
        this.parse(expression, opmeta, multiOutputPlaceholderChar)
        return {
            constants: this.constants,
            sources: this.sources
        }
    }

    /**
     * @public
     * Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes
     *
     * @param parseTree - Tree like object (Parse Tree object or a Node or array of Nodes) to get the StateConfig from
     * @param offset - This argument is used internally and should be ignored when calling this method externally
     * @param constants - This argument is used internally and should be ignored when calling this method externally
     * @returns StateConfig, i.e. compiled bytes
     */
    public static compile(
        parseTree:
            | Node
            | Node[]
            | Record<number, Node[]>
            | Record<number, { tree: Node[], position: number[] }>,
        offset?: number,
        constants: BigNumberish[] = []
    ): StateConfig {
        let sources: BytesLike[] = []
        let sourcesCache: BytesLike[] = []
        let argOffset: number[] = []
        let nodes : Node[][]
        let isRecord = false

        // convertion to a single type
        if ('0' in parseTree) {
            const array: any = Object.values(parseTree)
            if (!('0' in array[0])) nodes = [array as Node[]]
            else {
                if ('tree' in array[0]) {
                    for (let i = 0; i < array.length; i++) {
                        array[i] = array[i].tree
                    }
                }
                argOffset = this.countArgs(
                    parseTree as Record<number, Node[]>
                )
                isRecord = true
                nodes = array as Node[][]
            }
        }
        else nodes = [[parseTree as Node]]

        // check for errors
        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes[i].length; j++) {
                if (!this.errorCheck(nodes[i][j])) return {
                    constants: [],
                    sources: []
                }
            }
        }

        argOffset = isRecord
            ? this.countArgs(parseTree as Record<number, Node[]>)
            : [0, 0]
        const argCount = isRecord ? argOffset.unshift()! : 0

        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes[i].length; j++) {
                const node = nodes[i][j]
                if ('value' in node) {
                    if (isBigNumberish(node.value)) {
                        if (constants.includes(node.value)) {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.STATE,
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
                                    AllStandardOps.STATE,
                                    memoryOperand(MemoryType.Constant, constants.length)
                                )
                            )
                            constants.push(node.value)
                        }
                    }
                    else if ((node.value as string).includes('arg')) {
                        const index = Number(
                            (node.value as string).replace('arg(', '').slice(0, -1)
                        )
                        sourcesCache.push(
                            op(
                                this.names.length, isRecord
                                    ? argOffset[i] + index
                                    : offset ? offset + index : index
                            )
                        )
                    }
                    else if (node.value === 'MaxUint256' || node.value === 'Infinity') {
                        if (constants.includes(
                            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
                        ) {
                            sourcesCache.push(
                                op(
                                    AllStandardOps.STATE,
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
                                    AllStandardOps.STATE,
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
                    sourcesCache.push(
                        op(
                            AllStandardOps.STATE,
                            memoryOperand(
                                MemoryType.Stack,
                                this.state.parse.tags[i].findIndex(
                                    v => v.name === node.name
                                )
                            )
                        )
                    )
                }
                else {
                    for (let i = 0; i < (node as Op).parameters.length; i++) {
                        const tmp = this.compile(
                            (node as Op).parameters[i],
                            isRecord ? argOffset[i] : offset ? offset : 0,
                            constants
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
        if (isRecord && argCount > 0) {
            ({ constants, sources } = this.updateArgs({constants, sources}))
        }
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
    private static set(opmeta: typeof standardOpMeta) {
        this.data = opmeta.map(v => v.data)
        this.names = opmeta.map(v => v.name)
        this.aliases = opmeta.map(v => v.aliases)
        this.pops = opmeta.map(v => v.inputs)
        this.pushes = opmeta.map(v => v.outputs)
        for (let i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i]) {
                this.aliases[i]!.forEach(
                    (v, i, array) => array[i] = this.handleLetterCase(v)
                )
            }
        }
    }

    /**
     * Method to reset the class private properties
     */
    private static reset = () => {
        this.state.parse.tree = []
        this.state.depthLevel = 0
        this.state.track.parens.open = []
        this.state.track.parens.close = []
    }

    /**
     * Method to find index of next element within the text expression
     */
    private static findIndex = (str: string): number => {
        const indexes = []
        indexes[0] = str.indexOf('(')
        indexes[1] = str.indexOf(')')
        indexes[2] = str.indexOf(' ')
        indexes[3] = str.indexOf('<')
        if (
            indexes[0] === -1 && 
            indexes[1] === -1 && 
            indexes[2] === -1 && 
            indexes[3] === -1
        ) {
            return -1
        }
        else {
            const ret = indexes.filter(v => v !== -1)
            return ret.reduce((a, b) => (a <= b ? a : b))
        }
    }

    /**
     * Method to trim the text expression from whitespaces and commas from both ends
     */
    private static trim = (str: string): [string, number, number] => {
        let leadingOffset = 0
        let trailingOffset = 0;
        [str, trailingOffset] = this.trimRight(str);
        [str, leadingOffset] = this.trimLeft(str)
        return [str, leadingOffset, trailingOffset]
    }

    /**
     * Method to trim the right side of the text expression from whitespaces and commas
     */
    private static trimRight = (str: string): [string, number] => {
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
    private static trimLeft = (str: string): [string, number] => {
        let leadingOffset = 0
        while (str.startsWith(' ') || str.startsWith(',')) {
            str = str.slice(1, str.length)
            leadingOffset++
        }
        return [str, leadingOffset]
    }

    /**
     * Method to check if a string has any invalid characters which can be passed to it
     */
    private static includesInvalidChars = (
        str: string,
        charsToCheck: string[]
    ): boolean => {
        let check = false
        for (let i = 0; i < charsToCheck.length; i++) {
            if (str.includes(charsToCheck[i])) {
                check = true
                break
            }
        }
        return check
    }

    /**
     * Method to handle letter case senivity
     */
    private static handleLetterCase = (str: string): string => {
        while (str.includes('-')) str = str.replace('-', '_')
        return str.toUpperCase()
    }

    /**
     * The main workhorse of Rain Parser which parses the words used in an
     * expression and is responsible for building the Parse Tree and Bytes
     */
    private static parse(script: string, opmeta?: typeof standardOpMeta, placeholder?: string) {
        this.reset()
        this.sources = []
        this.constants = []
        this.treeArray = []
        this.parseTree = {}
        opmeta ? this.set(opmeta) : this.set(standardOpMeta)
        this.placeholder = placeholder ? placeholder : '_'

        // ----------- remove indents -----------
        while(script.includes(`\n`)) script = script.replace(`\n`, '')

        // ----------- convert html &nbps to standard whitespace -----------
        while(script.includes(`&nbsp`)) script = script.replace(`&nbsp`, ' ')

        // ----------- begin caching expression sentences -----------
        const originalExp = script
        let offset = 0;
        [script, offset] = this.trimLeft(script)
        const expressions: string[] = []
        let positions = [[0, originalExp.length - 1]]
        if (script.includes(';')) {
            positions = [[
                offset,
                originalExp.indexOf(';')
            ]]
            while (script.includes(';')) {
                const tmp = script.slice(0, script.indexOf(';') + 1)
                script = script.slice(script.indexOf(';') + 1)
                script = this.trimLeft(script)[0]
                expressions.push(tmp.slice(0, tmp.length - 1))
                if (script.includes(';')) {
                    positions.push([
                        originalExp.length - script.length,
                        originalExp.length - script.length + script.indexOf(';'),
                    ])
                }
            }
        }
        else expressions.push(script)

        // ----------- begin parsing expression sentences -----------
        for (let i = 0; i < expressions.length; i++) {
            this.reset()
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
            subExp.push(tmpExp)
            subExpEntry.push(expressions[i].length - tmpExp.length)

            // ----------- begin parsing sub-expressions -----------
            for (let j = 0; j < subExp.length; j++) {
                this.input = subExp[j]

                // check for lhs/rhs delimitter, exit from parsing this sub-expression if 
                // no or more than one delimitter was found, else start parsing lhs and rhs
                if (this.input.includes(':')) {
                    lhs = this.input.slice(0, this.input.indexOf(':'))
                    const _lhs = lhs
                    this.exp = this.input.slice(this.input.indexOf(':') + 1)
                    if (this.exp.includes(':')) {
                        this.updateTree({
                            error: 'invalid sub-expression',
                            position: [
                                entry + subExpEntry[j],
                                entry + subExpEntry[j + 1] + this.input.length - 1
                            ]
                        })
                        break
                    }

                    // ----------- begin parsing lhs -----------
                    while (lhs.length > 0) {
                        lhs = this.trimLeft(lhs)[0]
                        if (lhs.length > 0) {
                            const index = lhs.indexOf(' ') > -1 ? lhs.indexOf(' ') : lhs.length
                            let tagName = lhs.slice(0, index)
                            const tagNameLen = tagName.length
                            lhs = lhs.slice(index)
                            if (this.includesInvalidChars(tagName, [')', '(', '<', '>'])) {
                                tagName = 'invalid character in tag'
                            }
                            this.state.parse.tags[this.state.parse.tags.length - 1].push({
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

                    // ----------- begin parsing rhs -----------
                    while (this.exp.length > 0) {
                        this.exp = this.trimLeft(this.exp)[0]
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
                                    this.updateTree({
                                        opcode: {
                                            name: 'unknown opcode',
                                            position: [],
                                        },
                                        operand: NaN,
                                        output: NaN,
                                        position: [
                                            currentPosition - (
                                                this.state.track.operandArgs.lenCache.length > 0 
                                                    ? this.state.track.operandArgs.lenCache.pop()! 
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
                                const op = this.getLastTreeElementAtDepth(
                                    this.state.depthLevel - 1
                                ) as Op
                                op.parens.push(currentPosition)
                                this.updateTree(op, true)
                            }
                            else if (this.exp.startsWith(')')) {
                                if (this.state.track.parens.open.length > 0) {
                                    let multiOutputResolvingDepth = this.state.depthLevel - 1
                                    this.exp = this.exp.replace(')', '')
                                    const postfix = this.isPostfix(this.exp)
                                    this.state.track.parens.close.push(currentPosition)
                                    if (this.isInfix()) {
                                        this.state.track.notation.pop()
                                        this.state.track.notation.pop()
                                        if (postfix || this.isPrefix()) {
                                            this.resolveInfix(true)
                                            multiOutputResolvingDepth++
                                        }
                                        else this.resolveInfix(false)
                                    }
                                    if (postfix && this.isPrefix()) {
                                        const op = this.getLastTreeElementAtDepth(
                                            this.state.depthLevel - 1
                                        ) as Op
                                        this.updateTree(
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
                                        this.resolvePostfix(
                                            postfix[0],
                                            Number(postfix[1]) + currentPosition + 1,
                                            Number(postfix[2]) + currentPosition + 1,
                                            entry,
                                            postfix[3]
                                        )
                                        // this.exp = this.input.slice(
                                        //     Number(postfix[2]) + currentPosition + 2 - entry
                                        // )
                                        // if (this.exp.startsWith('<')) {
                                        //     const _updtatedOp = this.resolveOperand(
                                        //         this.getLastTreeElementAtDepth(this.state.depthLevel) as Op,
                                        //         true
                                        //     ) as Op
                                        //     this.updateTree(_updtatedOp, true)
                                        // }
                                    }
                                    else if (this.isPrefix()) {
                                        this.resolvePrefix()
                                        this.state.track.notation.pop()
                                        this.state.track.notation.pop()
                                    }
                                    const item = this.getLastTreeElementAtDepth(
                                        multiOutputResolvingDepth
                                    ) as Op
                                    if (item.output > 1) this.resolveMultiOutput(
                                        item.output,
                                        multiOutputResolvingDepth
                                    )
                                    this.state.depthLevel--
                                }
                                else {
                                    this.state.parse.tree.push({
                                        error: 'invalid closing paren',
                                        position: [currentPosition]
                                    })
                                }
                            }
                            else if (this.exp.startsWith('<')) {
                                const tmp = this.resolveOperand()
                                if (tmp) {
                                    (tmp as Error).position = [
                                        currentPosition,
                                        currentPosition + (tmp as Error).position[0] - 1
                                    ]
                                    this.updateTree(tmp)
                                }
                            }
                            else this.consume(currentPosition)
                        }
                    }
                }
                else {
                    this.updateTree({
                        error: 'invalid sub-expression',
                        position: [
                            entry + subExpEntry[j],
                            entry + subExpEntry[j + 1] + this.input.length - 1
                        ]
                    })
                    break
                }
            }

            // ----------- validating RHS against LHS -----------
            if (this.state.parse.tags[i].length === this.state.parse.tree.length) {
                for (let j = 0; j < this.state.parse.tags[i].length; j++) {
                    if (this.state.parse.tags[i][j].name !== '_') {
                        if (!(
                            'name' in this.state.parse.tree[j] && 
                            !('opcode' in this.state.parse.tree[j])
                        )) {
                            (this.state.parse.tree[j] as Exclude<Node, Tag>).tag = 
                            this.state.parse.tags[i][j]
                        }
                    }
                }
                this.parseTree[i] = {
                    position: positions[i],
                    tree: this.state.parse.tree.splice(-this.state.parse.tree.length)
                }
            }
            else {
                this.parseTree[i] = {
                    position: positions[i],
                    tree: [{
                        error: `invalid expression, RHS and LHS don't match`,
                        position: positions[i]
                    }]
                }
            }
            this.treeArray[i] = this.parseTree[i].tree
        }

        // ----------- compile bytes -----------
        ({constants: this.constants, sources: this.sources } = this.compile(this.treeArray))
    }

    /**
     * Method to check if the current state of parsing of a node is prefix or not
     */
    private static isPrefix(): boolean {
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
    private static isInfix(): boolean {
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
    private static isPostfix(str: string): string[] | undefined {
        let offset = 0
        if (!str.length) return undefined
        if (str[0] === ' ' || str[0] === '(' || str[0] === ')') return undefined
        while (str.startsWith(',')) {
            str = str.replace(',', '')
            offset++
        }
        if (str[0] === ' ' || str[0] === '(' || str[0] === ')') return undefined
        const _str = this.handleLetterCase(str)
        if (_str.startsWith(this.handleLetterCase(this.gte.name))) {
            const tmp = [
                this.gte.name,
                offset.toString(),
                (offset + this.gte.name.length - 1).toString(),
            ]
            if (_str.replace(this.handleLetterCase(this.gte.name), '').startsWith('(')) tmp.push(
                'ambiguous expression/opcode'
            )
            else if (offset) tmp.push(
                'illigal characters between opcode and parenthesis'
            )
            return tmp
        }
        if (_str.startsWith(this.handleLetterCase(this.lte.name))) {
            const tmp = [
                this.lte.name,
                offset.toString(),
                (offset + this.lte.name.length - 1).toString(),
            ]
            if (_str.replace(this.handleLetterCase(this.lte.name), '').startsWith('(')) tmp.push(
                'ambiguous expression/opcode'
            )
            else if (offset) tmp.push(
                'illigal characters between opcode and parenthesis'
            )
            return tmp
        }
        if (_str.startsWith(this.handleLetterCase(this.ineq.name))) {
            const tmp = [
                this.ineq.name,
                offset.toString(),
                (offset + this.ineq.name.length - 1).toString(),
            ]
            if (_str.replace(this.handleLetterCase(this.ineq.name), '').startsWith('(')) tmp.push(
                'ambiguous expression/opcode'
            )
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
                    if (_str.replace(this.gte.aliases[i], '').startsWith('(')) tmp.push(
                        'ambiguous expression/opcode'
                    )
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
                    if (_str.replace(this.lte.aliases[i], '').startsWith('(')) tmp.push(
                        'ambiguous expression/opcode'
                    )
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
                    if (_str.replace(this.ineq.aliases[i], '').startsWith('(')) tmp.push(
                        'ambiguous expression/opcode'
                    )
                    else if (offset) tmp.push(
                        'illigal characters between opcode and parenthesis'
                    )
                    return tmp
                }
            }
        }
        for (let i = 0; i < this.names.length; i++) {
            if (_str.startsWith(this.handleLetterCase(this.names[i]))) {
                const tmp = [
                    this.names[i],
                    offset.toString(),
                    (offset + this.names[i].length - 1).toString(),
                ]
                if (_str.replace(this.handleLetterCase(this.names[i]), '').startsWith('(')) {
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
    private static getLastTreeElementAtDepth(depthLevel: number): Node {
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
    private static updateTree(item: Node, replace?: boolean) {
        if (replace) {
            const tmp: Node[][] = []
            tmp.push(this.state.parse.tree)
            for (let i = 0; i < this.state.depthLevel - 1; i++) {
                tmp.push(
                    (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
                )
            }
            tmp[tmp.length - 1].pop()
            tmp[tmp.length - 1].push(item)
            while (tmp.length > 1) {
                const updatedParams = tmp.pop()!;
                (tmp[tmp.length - 1][
                    tmp[tmp.length - 1].length - 1
                ] as Op).parameters = updatedParams
            }
            this.state.parse.tree = tmp[0]
        }
        else {
            const tmp: Node[][] = []
            tmp.push(this.state.parse.tree)
            for (let i = 0; i < this.state.depthLevel; i++) {
                tmp.push(
                    (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
                )
            }
            tmp[tmp.length - 1].push(item)
            while (tmp.length > 1) {
                const updatedParams = tmp.pop()!;
                (tmp[tmp.length - 1][
                    tmp[tmp.length - 1].length - 1
                ] as Op).parameters = updatedParams
            }
            this.state.parse.tree = tmp[0]
        }
    }

    /**
     * Method to handle operand arguments
     */
    private static resolveOperand(op?: Op, postfixCheck?: boolean): Op | Error | undefined {
        let _err: string | undefined
        let _len = this.exp.length
        if (!this.exp.includes('>')) _err = 'expected ">"'
        else {
            let _operandArgs = this.exp.slice(1, this.exp.indexOf('>'))
            this.exp = this.exp.slice(this.exp.indexOf('>') + 1)
            _len = _operandArgs.length + 2
            if (
                _operandArgs.includes('(') || 
                _operandArgs.includes(')') ||
                _operandArgs.includes('<')
            ) {
                _err = 'found invalid character in operand arguments'
            }
            else {
                this.state.track.operandArgs.cache.push([])
                while (_operandArgs.length) {
                    _operandArgs = this.trimLeft(_operandArgs)[0]
                    const index = this.findIndex(_operandArgs) < 0
                        ? _operandArgs.length
                        : this.findIndex(_operandArgs) === 0
                            ? 1
                            : this.findIndex(_operandArgs)
                    const arg = _operandArgs.slice(0, index)
                    _operandArgs = _operandArgs.slice(index)
                    if (isBigNumberish(arg)) {
                        this.state.track.operandArgs.cache[
                            this.state.track.operandArgs.cache.length - 1
                        ].push(Number(arg))
                    }
                    else {
                        _err = 'found invalid character in operand arguments'
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
    private static resolvePrefix() {
        this.state.track.parens.open.pop()
        const endPosition = this.state.track.parens.close.pop()!
        const tmp: Node[][] = []
        tmp.push(this.state.parse.tree)
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            tmp.push(
                (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
            )
        }
        const node = tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op
        node.position.push(endPosition)
        node.parens.push(endPosition)
        if (node.error === 'no closing parenthesis') node.error = undefined
        if (!node.error) {
            tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] = this.resolveOp(node)
        }
        while (tmp.length > 1) {
            const resolvedExp = tmp.pop()!;
            (tmp[tmp.length - 1][
                tmp[tmp.length - 1].length - 1
            ] as Op).parameters = resolvedExp
        }
        this.state.parse.tree = tmp[0]
    }

    /**
     * Method to resolve postfix notations at current state of parsing
     */
    private static resolvePostfix(
        opcode: string,
        startPosition: number,
        endPosition: number,
        entry: number,
        error?: string,
    ) {
        this.exp = this.input.slice(endPosition + 1 - entry)
        this.state.track.parens.open.pop()
        const tmp: Node[][] = []
        tmp.push(this.state.parse.tree)
        for (let i = 0; i < this.state.depthLevel - 1; i++) {
            tmp.push(
                (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op)
                    .parameters
            )
        }
        const node = tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op
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
        if (this.exp.startsWith('<')) op = this.resolveOperand(op, true) as Op
        tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] = this.resolveOp(op)
        while (tmp.length > 1) {
            const resolvedExp = tmp.pop()!;
            (tmp[tmp.length - 1][
                tmp[tmp.length - 1].length - 1
            ] as Op).parameters = resolvedExp
        }
        this.state.parse.tree = tmp[0]
    }

    /**
     * Method to resolve infix notations at current state of parsing
     */
    private static resolveInfix(isParameter: boolean) {
        const tmp: Node[][] = []
        tmp.push(this.state.parse.tree)
        for (let i = 0; i < this.state.depthLevel; i++) {
            tmp.push(
                (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
            )
        }
        let err = false
        let op: Node
        const elements: Node[] = tmp[tmp.length - 1]
        const node = tmp[tmp.length - 2][tmp[tmp.length - 2].length - 1] as Op
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
                        (tmp[tmp.length - 2][tmp[tmp.length - 2].length - 1] as Op).parens[0],
                        closeParenPosition,
                    ],
                }
                err = true
            }
        }
        delete (op as Op).infixOp
        if (!err) op = this.resolveOp(op as Op)
        if (isParameter) {
            const item = this.getLastTreeElementAtDepth(this.state.depthLevel - 1) as Op
            item.parameters = [op]
            op = item
        }
        else {
            this.state.track.parens.open.pop()
            this.state.track.parens.close.pop()
        }
        this.updateTree(op, true)
    }

    /**
     * Method to resolve multi output nodes at current state of parsing
     */
    public static resolveMultiOutput = (totalCount: number, depthLevel: number) => {
        let count = 0
        const tmp: Node[][] = []
        const isOutput = (element: Node): boolean => {
            return ('value' in element && element.value === this.placeholder)
        }
        tmp.push(this.state.parse.tree)
        for (let i = 0; i < depthLevel; i++) {
            tmp.push(
                (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters
            )
        }
        while (tmp.length > 1) {
            if (count !== totalCount) {
                for (let i = tmp[tmp.length - 1].length - 2; i > -1; i--) {
                    if (count !== totalCount) {
                        if (!isOutput(tmp[tmp.length - 1][i])) {
                            (tmp[tmp.length - 2][tmp[tmp.length - 2].length - 1] as Op).error =
                                `illigal placement of outputs, parameter ${i - 1} cannot be accessed by this opcode`
                            break
                        }
                        else {
                            count++
                            tmp[tmp.length - 1][i] = this.state.parse.moCache[
                                this.state.parse.moCache.length - 1
                            ].pop()!
                        }
                    }
                    else break
                }
            }
            const resolvedOutputs = tmp.pop()!;
            (tmp[tmp.length - 1][tmp[tmp.length - 1].length - 1] as Op).parameters = resolvedOutputs
        }
        if (count !== totalCount) {
            const item = tmp[0].pop()!
            tmp[0].push(...this.state.parse.moCache[this.state.parse.moCache.length - 1])
            this.state.parse.moCache.pop()
            tmp[0].push(item)
        }
    }

    /**
     * Method that resolves the opcode Node once its respective closing paren has consumed
     */
    private static resolveOp = (opNode: Op): Op => {
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
                    if (this.oprnds[op].argsRules.length) {
                        if (this.oprnds[op].argsRules.length === _operandArgs.length) {
                            let _err = false
                            this.state.track.operandArgs.cache.pop()
                            for (let i = 0; i < this.oprnds[op].argsRules.length; i++) {
                                if (!this.oprnds[op].argsRules[i](
                                    _operandArgs[i],
                                    opNode.parameters.length
                                )) {
                                    _err = true
                                    opNode.error = `out-of-bound operand argument at index ${i}`
                                    this.pops
                                }
                            }
                            if (!_err) {
                                opNode.operand = this.oprnds[op].encoder(
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
                        opNode.operand = this.oprnds[op].encoder([], opNode.parameters.length)
                        opNode.output = this.pushes[op](opNode.operand)
                    }
                }
                else {
                    opNode.error = `invalid number of parameteres`
                    opNode.output = NaN
                }
            }
            if (opNode.output > 1) {
                this.state.parse.moCache.push([])
                for (let i = 0; i < opNode.output - 1; i++) {
                    this.state.parse.moCache[this.state.parse.moCache.length - 1].push({
                        value: `${opNode.opcode.name} output ${i + 1} placeholder`,
                        position: [],
                    })
                }
            }
        }
        return opNode
    }

    /**
     * Method that consumes the words from the expression and updates the parse tree with their Node type
     */
    private static consume(entry: number): void {
        if (this.exp.length > 0) {
            let check = true
            const index = this.findIndex(this.exp) < 0
                ? this.exp.length
                : this.findIndex(this.exp) === 0
                    ? 1
                    : this.findIndex(this.exp)

            let str = this.exp.slice(0, index)
            const consumee = str
            str = this.trim(str)[0]
            const startPosition = entry + consumee.indexOf(str)
            
            if (str.includes(',')) {
                this.state.parse.tree.push({
                    error: `invalid comma: ${str}`,
                    position: [startPosition, startPosition + str.length - 1],
                })
                this.exp = this.exp.replace(consumee, '')
            }
            else {
                const str_ = this.handleLetterCase(str)
                if (                        
                    str_ === this.handleLetterCase(this.gte.name) ||
                    this.gte.aliases?.includes(str_) ||
                    str_ === this.handleLetterCase(this.lte.name) ||
                    this.lte.aliases?.includes(str_) ||
                    str_ === this.handleLetterCase(this.ineq.name) ||
                    this.ineq.aliases?.includes(str_)
                ) {
                    check = false
                    const isGte =
                        str_ === this.handleLetterCase(this.gte.name) ||
                        this.gte.aliases?.includes(str_)
                    const isLte =
                        str_ === this.handleLetterCase(this.lte.name) ||
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
                            this.updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                        else {
                            op.error = this.state.ambiguity
                                ? 'ambiguous expression/opcode'
                                : 'illigal characters between opcode and parenthesis'
                            this.updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                    }
                    else {
                        if (!this.isInfix()) {
                            this.state.track.notation.push(
                                this.state.depthLevel,
                                Notations.infix
                            )
                        }
                        op.position = []
                        op.error = 'ambiguous expression/opcode'
                        if (!this.state.ambiguity) delete op.error
                        op.infixOp = true
                        this.updateTree(op)
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
                            if (this.exp.startsWith('<')) this.resolveOperand(op)
                            if (this.exp.startsWith('(')) {
                                this.state.track.notation.push(
                                    this.state.depthLevel,
                                    Notations.prefix
                                )
                                if (consumee.endsWith(str)) {
                                    op.error = this.state.ambiguity
                                        ? 'ambiguous expression/opcode'
                                        : 'no closing parenthesis'
                                    this.updateTree(op)
                                    if (this.state.ambiguity) this.state.ambiguity = false
                                }
                                else {
                                    op.error = this.state.ambiguity
                                        ? 'ambiguous expression/opcode'
                                        : 'illigal characters between opcode and parenthesis'
                                    this.updateTree(op)
                                    if (this.state.ambiguity) this.state.ambiguity = false
                                }
                            }
                            else {
                                if (this.pops[i].name !== 'zero' && !this.isInfix()) {
                                    this.state.track.notation.push(
                                        this.state.depthLevel,
                                        Notations.infix
                                    )
                                }
                                op.position = []
                                op.error = 'ambiguous expression/opcode'
                                if (!this.state.ambiguity) delete op.error
                                op.infixOp = this.pops[i].name !== 'zero' ? true : undefined
                                this.updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                            check = false
                            break
                        }
                    }
                }
                if (check) {
                    const str_ = this.handleLetterCase(str)
                    const names = this.names.map(
                        (v, i, names) => names[i] = this.handleLetterCase(v)
                    )
                    if (names.includes(str_)) {
                        this.state.track.notation.push(
                            this.state.depthLevel,
                            Notations.prefix
                        )
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
                        if (this.exp.startsWith('<')) this.resolveOperand(op)
                        if (this.exp.startsWith('(')) {
                            if (consumee.endsWith(str)) {
                                op.error = this.state.ambiguity
                                    ? 'ambiguous expression/opcode'
                                    : 'no closing parenthesis'
                                this.updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                            else {
                                op.error = this.state.ambiguity
                                    ? 'ambiguous expression/opcode'
                                    : 'illigal characters between opcode and parenthesis'
                                this.updateTree(op)
                                if (this.state.ambiguity) this.state.ambiguity = false
                            }
                        }
                        else {
                            if (this.pops[enum_].name !== 'zero' && !this.isInfix()) {
                                this.state.track.notation.push(
                                    this.state.depthLevel,
                                    Notations.infix
                                )
                            }
                            op.position = []
                            op.error = 'ambiguous expression/opcode'
                            if (!this.state.ambiguity) delete op.error
                            op.infixOp = this.pops[enum_].name !== 'zero'
                                ? true
                                : undefined
                            this.updateTree(op)
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                    }
                    else if (str_ === 'ARG') {
                        str = 'arg'
                        this.exp = this.exp.replace(consumee, '')
                        const i_ = this.exp.indexOf(')') + 1
                        str = str + this.exp.slice(0, i_)
                        this.exp = this.exp.slice(i_, this.exp.length)
                        this.updateTree({
                            value: str,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                    }
                    else if (str === this.placeholder) {
                        this.updateTree({
                            value: this.placeholder,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (isBigNumberish(str)) {
                        this.updateTree({
                            value: str,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (str_ === 'MAXUINT256' || str_ === 'INFINITY') {
                        this.updateTree({
                            value: str_ === 'MAXUINT256' ? 'MaxUint256' : 'Infinity',
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else if (
                        this.state.parse.tags[this.state.parse.tags.length - 1]
                            .map(v => v.name).includes(str)
                    ) {
                        this.updateTree({
                            name: str,
                            position: [startPosition, startPosition + str.length - 1],
                        })
                        this.exp = this.exp.replace(consumee, '')
                    }
                    else {
                        this.exp = this.exp.replace(consumee, '')
                        if (this.exp.startsWith('(')) {
                            this.state.track.notation.push(
                                this.state.depthLevel,
                                Notations.prefix
                            )
                            this.updateTree({
                                opcode: {
                                    name: `${str} is unknown opcode`,
                                    position: [startPosition, startPosition + str.length],
                                },
                                operand: NaN,
                                output: NaN,
                                position: [startPosition],
                                parens: [],
                                parameters: [],
                                error: this.state.ambiguity
                                    ? 'ambiguous expression/opcode'
                                    : 'unknown opcode',
                            })
                            if (this.state.ambiguity) this.state.ambiguity = false
                        }
                        else {
                            this.updateTree({
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
    private static errorCheck(element: Node): boolean {
        if ('opcode' in element) {
            if (element.error !== undefined) return false
            else {
                for (let i = 0; i < element.parameters.length; i++) {
                    if (!this.errorCheck(element.parameters[i])) return false
                }
                return true
            }
        }
        else if ('error' in element) return false
        else return true
    }

    /**
     * Method to update the arguments of zipmaps after full bytes build (if any present)
     */
    public static updateArgs(config: StateConfig): StateConfig {
        for (let i = 0; i < config.sources.length; i++) {
            for (let j = 0; j < config.sources[i].length; j += 4) {
                if (config.sources[i][j + 1] === this.names.length) {
                    (config.sources[i] as Uint8Array)[j + 1] = 0;
                    (config.sources[i] as Uint8Array)[j + 3] += config.constants.length
                }
            }
        }
        return config
    }

    /**
     * Method to count all arguments of all zipmaps (if any present)
     */
    private static countArgs(tree: Record<number, Node[]>): number[] {
        let count = 0
        const argCache: number[] = []
        const elements = Object.values(tree)
        const counter = (element: Node): number[] => {
            const c_: number[] = []
            if ('opcode' in element) {
                if (element.opcode.name === 'ZIPMAP') {
                    c_.push(element.parameters.length)
                }
                for (let i = 0; i < element.parameters.length; i++) {
                    c_.push(...counter(element.parameters[i]))
                }
            }
            return c_
        }
        for (let i = 0; i < elements.length; i++) {
            for (let j = 0; j < elements[i].length; j++) {
                argCache.push(...counter(elements[i][j]))
            }
        }
        for (let i = 0; i < argCache.length; i++) {
            count += argCache[i]
        }
        argCache.unshift(0, 0)
        argCache.unshift(count)
        return argCache
    }
}
