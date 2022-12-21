import { BigNumberish, BytesLike } from 'ethers'

/**
 * @public
 * Type of valid parsed expression, i.e. compiled bytes 
 */
export type StateConfig = {
    /**
     * Sources verbatim.
     */
    sources: BytesLike[];
    /**
     * Constants verbatim.
     */
    constants: BigNumberish[];
}

/**
 * @public
 */
export type OpIO = (_operand: number) => number

/**
 * @public
 * valid number of parameteres an opcode's can have inside its parens
 */
export type ParamsValidRange = (_paramsLength: number) => boolean


/**
 * @public
 */
export type OperandArgConstraints = (_value: number, _paramsLength: number) => boolean

/**
 * @public
 */
export type OperandEncoder = (_args: number[], _paramsLength: number) => number

/**
 * @public
 */
export type OperandDecoder = (_operand: number) => number[]

/**
 * @public
 */
export type OperandMeta = {
    // specifying the rule of each operand argument, the length of the array defines the length of the arguments of an opcode
    argsConstraints: OperandArgConstraints[];
    // function for ops' operands
    encoder: OperandEncoder
    // function to decode ops' opernads
    decoder: OperandDecoder
}

/**
 * @public
 */
export type OpMeta = {
    enum: number;
    name: string;
    outputs: OpIO;
    inputs: OpIO;
    operand: OperandMeta,
    paramsValidRange: ParamsValidRange;
    description?: string;
    aliases?: string[];
    data?: any;
}
