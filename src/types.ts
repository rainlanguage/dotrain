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
 * Type Definitions for opcodes metadata used by RainLang.
*/
export type OpMeta = {
    /**
     * The primary word used to identify the opcode.
     */
    name: string;
    /**
     * Describes what the opcode does briefly.
     */
    desc: string;
    /**
     * Data required in order to calculate and format the operand.
     */
    operand: OperandMeta;
    /**
     * Data required to specify the inputs of the opcode. 0 for opcodes with no input, 
     * for opcodes with constant number of inputs, the length of "parameters" array 
     * defines the number of inputs and for opcodes with dynamic number of inputs, 
     * "bits" field must be specified which determines this opcode has dynamic inputs 
     * and number of inputs will be derived from the operand bits with "computation" 
     * field applied if specified.
     */
    inputs: InputMeta;
    /**
     * Data required to specify the outputs of the opcode. An integer specifies the 
     * number of outputs for opcodes with constants number of outputs and for opcodes 
     * with dynamic outputs the "bits" field will determine the number of outputs 
     * with "computation" field applied if specified.
     */
    outputs: OutputMeta;
    /**
     * Extra word used to identify the opcode.
     */
    aliases?: string[];
}

/**
 * @public
 * Data type of opcode's inputs that determines the number of 
 * inputs an opcode has and provide information about them
 */
export type InputMeta = 0 | InputArgs

/**
 * @public
 * Data type for input argguments
 */
export type InputArgs = {
    /**
     * Data type for opcode's inputs parameters, the length determines 
     * the number of inputs for constant (non-computed) inputs.
     */
    parameters: {
        /**
         * Name of the input parameter.
         */
        name: string;
        /**
         * Description of the input parameter.
         */
        desc?: string;
        /**
         * Specifies if an argument is dynamic in length, default is false, 
         * so only needs to be defined if an argument is spread.
         */
        spread?: boolean;

    }[]
    /**
     * Specifies bits of the operand allocated for number of inputs. 
     * Determines the number of inputs for a computed opcode inputs. 
     * Required only for computed (non-constant) inputs.
     */
    bits?: [number, number];
    /**
     * Specifies any arithmetical operation that will be applied to 
     * the value of the extracted operand bits. The "bits" keyword 
     * is reserved for accessing the exctraced value, 
     * example: "(bits + 1) * 2". Required only for computed (non-constant) inputs.
     */
    computation?: string;
}

/** 
 * @public
 * Data type of opcode's outputs that determines the number of 
 * outputs an opcode has and provide information about them
 */
export type OutputMeta = number | ComputedOutput

/**
 * @public
 * Data type for computed output
 */
export type ComputedOutput = {
    /**
     * Specifies bits of the operand allocated for number of outputs. 
     * Determines the number of outputs for a computed opcode outputs. 
     * Required only for computed (non-constant) outputs.
     */
    bits: [number, number];
    /**
     * Specifies any arithmetical operation that will be applied to the 
     * value of the extracted operand bits. The "bits" keyword is reserved 
     * for accessing the exctraced value, example: "(bits + 1) * 2". 
     * Required only for computed (non-constant) outputs.
     */
    computation?: string;
}

/**
 * @public 
 * Data type of operand arguments, used only for non-constant operands
 */
export type OperandMeta = 0 | OperandArgs

/**
 * @public
 * Data type for computed operand that consists of some arguments
 */
export type OperandArgs = {
    /**
     * Specifies the bits to allocate to this operand argument.
     */
    bits: [number, number];
    /**
     * Name of the operand argument. Argument with the name of "inputs" 
     * is reserved so that it wont be be typed inside \<\> and its value 
     * needed to construct the operand will be the number of items inside 
     * the opcode's parens (computation will apply to this value if provided).
     */
    name: "inputs" | string;
    /**
     * Description of the operand argument.
     */
    desc?: string;
    /**
     * Specifies any arithmetical operation that needs to be applied to the 
     * value of this operand argument. It will apply to the value before it 
     * be validated by the provided range. The "arg" keyword is reserved for 
     * accessing the value of this operand argument, example: "(arg + 1) * 2".
     */
    computation?: string;
    /**
     * Determines the valid range of the operand argument after computation applied. 
     * For example an operand argument can be any value between range of 1 - 10: [[1, 10]] 
     * or an operand argument can only be certain exact values: [[2], [3], [9]], 
     * meaning it can only be 2 or 3 or 9.
     */
    validRange?: ([number] | [number, number])[];
}[];