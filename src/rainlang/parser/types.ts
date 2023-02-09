/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumberish } from "ethers"

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
    position: number[];
    error?: string;
    tag?: Tag;
}

/**
 * @public
 */
export type Comment = Error | {
    comment: string;
    position: number[];
    error?: string;
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
        multiOutputCache: (Op | Value)[][];
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
    string,
    { tree: Node[]; position: number[] }
>;
