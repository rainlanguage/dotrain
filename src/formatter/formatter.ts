import { BytesLike, BigNumber, ethers } from 'ethers'
import { AllStandardOps, StateConfig, OpMeta } from '../types'
import { arrayify } from '../utils'
import { rainterpreterOpMeta } from '../rainterpreterOpMeta'
import { Config, PrettifyConfig } from './types'

/**
 * @public
 * The generator of human friendly readable source.
 *
 * @remarks
 * Parse an StateConfig/Script to a more human readable form, making easier to understand. This form allows users read exactly
 * what the Script will do, like the conditions, values used, etc. Also, anyone can learn to write their own scripts
 * if use the Human Form to see the output for each combination that they made.
 */
export class Formatter {

    private static pretty: boolean
    private static opmeta: OpMeta[] = rainterpreterOpMeta

    /**
     * @public
     * Method to set the opmeta with more than AllStandardOps opcodes or with other name/aliases for this instance of the Formatter
     *
     * @param opmeta_ - The OpMeta array
     */
    public static set(opmeta_: OpMeta[]) {
        this.opmeta = opmeta_
    }

    /**
     * Obtain the friendly output from an StateConfig/script.
     * @param _state - The StateConfig/script to generate the friendly version
     * @param _config - The configuration that will run the generator
     * @returns
     */
    public static get(
        _state: StateConfig,
        _config: Config = {
            pretty: false,
            storageEnums: undefined,
            contextEnums: undefined,
            tags: undefined,
            enableTagging: false,
            opmeta: undefined
        }
    ): string {
        if (_config.opmeta) {
            this.set(_config.opmeta)
        }
        this.pretty = _config.pretty ? true : false
        const _constants: string[] = []

        for (const item of _state.constants) {
            _constants.push(BigNumber.from(item).toHexString())
        }

        const _result = this._format(
            _state.sources,
            _constants,
            //_config.storageEnums,
            //_config.contextEnums,
            _config.tags,
            _config.enableTagging
        )
        return this.pretty ? this.prettify(_result) : _result
    }

    /**
     * Make the output from the HumanFriendly Source more readable by adding indenting following the parenthesis
     *
     * @remarks
     * If the string is already indentend, the method will wrongly generate the string
     *
     * @param _text - The output from the HumanFriendlySource
     * @param _config - The configuration of the prettify method (experimental)
     * @returns A prettified output
     */
    public static prettify(_text: string, _config: PrettifyConfig = {}): string {
        let { n } = _config
        if (!n) n = 2
        // if (!length) length = 20
        const space = ' '
        let counter = 0
        const _expressions: string[] = []

        // extract individual expression (sources expressions) that are seperated by semi
        while (_text.length) {
            const _index = _text.search(/;/i)
            if (_index > -1) {
                _expressions.push(_text.slice(0, _index + 1))
                _text = _text.slice(_index + 1)
            } 
        }

        // start prettifying
        for (let j = 0; j < _expressions.length; j++) {
            const _lhsIndex = _expressions[j].search(/:/i)
            for (let i = _lhsIndex + 2; i < _expressions[j].length; i++) {
                if ( _expressions[j][i] === ' ' && counter > 0) {
                    _expressions[j] =
                        _expressions[j].slice(0, i + 1) +
                        '\n' +
                        space.repeat(counter * n) +
                        _expressions[j].slice(i + 1)
                    i += (counter * n) + 2
                }
                if (_expressions[j][i] === '(') {
                    counter++
                    _expressions[j] =
                        _expressions[j].slice(0, i + 1) +
                        '\n' +
                        space.repeat(counter * n) +
                        _expressions[j].slice(i + 1)
                    i += (counter * n) + 2
                }
                if (_expressions[j][i] === ')') {
                    counter--
                    _expressions[j] =
                        _expressions[j].slice(0, i) +
                        '\n' +
                        space.repeat(counter * n) +
                        _expressions[j].slice(i)
                    i += (counter * n) + 1
                    console.log(counter * n)
                }
            }
        }
        return _expressions.join('\n')
    }

    /**
     * The main workhorse of the Human Friendly Readable source that builds the whole text
     *
     * @param sources - The StateConfig sources
     * @param constants - The StateConfig constants all in hex string format
     * @param tags - (optional) Tags/names/aliases for individual items in final results (should be passed in order)
     * @param enableTagging - True if the result needs to be tagged and optimized for the RuleBuilder script generator
     * @returns A human friendly readable text of the passed script
     */
    private static _format = (
        sources: BytesLike[],
        constants: string[],
        //storageEnums?: string[],
        //contextEnums?: string[],
        tags?: string[],
        enableTagging = false,
    ): string => {
        let _stack: string[] = []
        const _finalStack: string[] = []
        const _zipmapStack: { [key: number]: string } = {}
        const useableTags = tags
        let counter = 0

        // start formatting
        for (let i = 0; i < sources.length; i++) {
            const lhs: string[] = []
            const src = arrayify(sources[i], { allowMissingPrefix: true })
            for (let j = 0; j < src.length; j += 4) {
                const _op = (src[j] << 8) + src[j + 1]
                const _operand = (src[j + 2] << 8) + src[j + 3]
                const _index = this.opmeta.findIndex(v => v.enum === _op)

                // error if an opcode not found in opmeta
                if (_index < 0) throw new Error(
                    `opcode with enum "${this.opmeta[_index].name}" does not exist on OpMeta`
                )
                else {
                    if (_op === AllStandardOps.STATE && (_operand & 1) === 1) {
                        _stack.push(
                            BigNumber.from(constants[_operand >> 1]).eq(ethers.constants.MaxUint256)
                                ? 'MaxUint256'
                                : constants[_operand >> 1]
                        )
                    }
                    else {
                        let operandArgs = ''
                        const _multiOutputs: string[] = []
                        const inputs = this.opmeta[_index].inputs(_operand)
                        const outputs = this.opmeta[_index].outputs(_operand)

                        // construct operand arguments
                        if (this.opmeta[_index].operand.argsConstraints.length) {
                            const args = this.opmeta[_index].operand.decoder(_operand)
                            if (
                                args.length === this.opmeta[_index].operand.argsConstraints.length
                            ) {
                                operandArgs = '<'
                                for (
                                    let k = 0;
                                    k < this.opmeta[_index].operand.argsConstraints.length;
                                    k++
                                ) {
                                    operandArgs += 
                                        k === this.opmeta[_index].operand.argsConstraints.length - 1
                                            ? args[k].toString()
                                            : args[k].toString() + ' '

                                }
                                operandArgs += '>'
                            }
                            else throw new Error(
                                `decoder of opcode with enum "${
                                    this.opmeta[_index].name
                                }" does not match with its operand arguments`
                            )
                        }

                        // cache multi outputs to use when updating the formatter stack
                        if (outputs > 1) {
                            for (let k = 0; k < outputs - 1; k++) _multiOutputs.push('_')
                        }

                        // update formatter stack with new formatted opcode i.e.
                        // take some items based on the formatted opcode and then
                        // push the appended string with the opcode back into the stack
                        _stack.push(
                            ..._multiOutputs,
                            this.opmeta[_index].name +
                            operandArgs +
                            '(' +
                            (inputs > 0 ? _stack.splice(-inputs).join(' ') : '') +
                            ')'
                        )
                    }
                }

                // handle GTE virtual opcode
                if (_stack[_stack.length - 1].slice(0, 20) === 'ISZERO(GREATER_THAN(') {
                    _stack[_stack.length - 1] = 'LESS_THAN_EQUAL(' +
                        _stack[_stack.length - 1].slice(20, _stack[_stack.length - 1].length - 1)
                }

                // handle LTE virtual opcode
                if (_stack[_stack.length - 1].slice(0, 17) === 'ISZERO(LESS_THAN(') {
                    _stack[_stack.length - 1] = 'GREATER_THAN_EQUAL(' +
                        _stack[_stack.length - 1].slice(17, _stack[_stack.length - 1].length - 1)
                }

                // handle INEQ virtual opcode
                if (_stack[_stack.length - 1].slice(0, 16) === 'ISZERO(EQUAL_TO(') {
                    _stack[_stack.length - 1] = 'GREATER_THAN_EQUAL(' +
                        _stack[_stack.length - 1].slice(16, _stack[_stack.length - 1].length - 1)
                }
            }

            // handle sources taggings if enabled by caller
            if (enableTagging && !Object.keys(_zipmapStack).includes(i.toString())) {
                for (let j = 0; j < _stack.length; j++) {
                    const tempTag = useableTags?.shift()
                    _stack[j] = tempTag
                        ? `${tempTag}: {${_stack[j]}}`
                        : `Item${counter}: {${_stack[j]}}`

                    counter++
                }
            }

            // cache the LHS elements
            for (let j = 0; j < _stack.length; j++) lhs.push('_')

            // construct the source expression at current index, both LHS and RHS
            _finalStack.push(
                lhs.join(' ').concat(': ') + 
                _stack.join(' ').concat(';')
            )
            _stack = []
        }

        // join all sources expressions by seperating them 
        // by new line and return the result
        return _finalStack.join('\n')
    }
}


