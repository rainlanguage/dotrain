/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumberish } from "ethers"
import { opIO } from "../types"

/**
 * @public
 * Expression Notations
 */
export enum Notations {
    prefix,
    postfix,
    infix,
}

/**
 * @public
 * Type of Parser's Error node
 */
export type Error = {
    error: string;
    position: number[];
    tag?: Tag;
};

/**
 * @public
 * Type of Parser's Value node
 */
export type Value = {
    value: BigNumberish;
    position: number[];
    error?: string;
    tag?: Tag;
};

/**
 * @public
 * Type of Parser's Opcode node
 */
export type Op = {
    opcode: {
        name: string;
        position: number[];
    };
    operand: number;
    output: number;
    position: number[];
    parens: number[];
    parameters: Node[];
    data?: any;
    error?: string;
    infixOp?: boolean;
    tag?: Tag;
};

/**
 * @public
 */
export type Tag = {
    name: string;
    position: number[]
}

/**
 * @public
 * Type of Parser's Node
 */
export type Node = Error | Value | Op | Tag;

/**
 * @public
 * Type of Parser's State
 */
export type State = {
    parse: {
        tree: Node[];
        tags: Tag[][];
        moCache: (Op | Value)[][];
    };
    track: {
        notation: number[];
        parens: {
            open: number[];
            close: number[];
        };
        operandArgs: {
            cache: number[][];
            errorCache: string[];
            lenCache: number[];
        };
    };
    depthLevel: number;
    ambiguity: boolean;
};

/**
* @public
* Type of a parse tree object
*/
export type ParseTree = Record<
    number,
    { tree: Node[]; position: number[] }
>;

/**
 * @public
 * OpMeta-like type
 */
export type iOpMetaLike = {
    name: string,
    pushes: (opcode: number, operand: number) => number,
    pops: (opcode: number, operand: number) => number,
    description?: string,
    aliases?: string[],
    data?: any
}

/**
 * @public
 * Special opemta-like object for providing GTE in parser
 */
export const gteParserOpcode: iOpMetaLike = {
    name: 'GREATER_THAN_EQUAL',
    description: 'Takes last 2 values from stack and puts true/1 into the stack if the first value is greater than equal the second value and false/0 if not.',
    pushes: opIO.one,
    pops: opIO.two,
    aliases: ['GTE', 'GREATERTHANEQUAL', 'BIGGERTHANEQUAL', 'BIGGER_THAN_EQUAL', ">=", "≥"],
    data: {
        description: "Returns true if value X is greater than value Y.",
        category: "logic",
        example: "greater_than_equal(X, Y)",
        parameters: [
            {
                spread: false,
                name: "value",
                description: "The first value."
            },
            {
                spread: false,
                name: "value",
                description: "The second value."
            }
        ]
    }
}

/**
 * @public
 * Special opmeta-like object for providing GTE in parser
 */
export const lteParserOpcode: iOpMetaLike = {
    name: 'LESS_THAN_EQUAL',
    description: 'Takes last 2 values from stack and puts true/1 into the stack if the first value is less than equal the second value and false/0 if not.',
    pushes: opIO.one,
    pops: opIO.two,
    aliases: ["LTE", "LESSTHANEQUAL", "LITTLE_THAN_EQUAL", "LITTLETHANEQUAL", "<=", "≤"],
    data: {
        description: "Returns true if value X is less than value Y.",
        category: "logic",
        example: "less_than_equal(X, Y)",
        parameters: [
            {
                spread: false,
                name: "value",
                description: "The first value."
            },
            {
                spread: false,
                name: "value",
                description: "The second value."
            }
        ]
    }
}

/**
 * @public
 * Special opmeta-like object for providing inequality check in parser
 */
export const ineqParserOpcode: iOpMetaLike = {
    name: 'INEQUAL_TO',
    description: 'Takes last 2 values from stack and puts true/1 into the stack if the first value is not equal to the second value and false/0 if not.',
    pushes: opIO.one,
    pops: opIO.two,
    aliases: ['INEQ', 'INEQUALTO', 'NOTEQUAL', 'NOT_EQUAL', "NOTEQ", "NOT_EQUAL_TO", "NOTEQUALTO","!=", "!=="],
    data: {
        description: "Returns true if value X is not equal to value Y.",
        category: "logic",
        example: "inequal_to(X, Y)",
        parameters: [
            {
                spread: false,
                name: "value",
                description: "The first value."
            },
            {
                spread: false,
                name: "value",
                description: "The second value."
            }
        ]
    }
}