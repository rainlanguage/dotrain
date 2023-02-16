import { BigNumberish } from "ethers"


/**
 * @public
 * Type of Parser's Diagnostic (error)
 */
export type Diagnostic = {
    msg: string;
    position: number[];
};

/**
 * @public
 * Type of Parser's Value node
 */
export type Value = {
    value: BigNumberish;
    position: number[];
    tag?: Tag;
};

/**
 * @public
 * Type of Parser's Opcode node
 */
export type Op = {
    opcode: {
        name: string;
        description: string;
        position: number[];
    };
    operand: number;
    output: number;
    position: number[];
    parens: number[];
    parameters: Node[];
    operandArgs?: {
        position: number[];
        args: {
            value: number;
            name: string;
            position: number[];
            description?: string;
        }[];
    };
    tags?: Tag[];
};

/**
 * @public
 */
export type Tag = {
    name: string;
    position: number[];
    tag?: Tag;
}

/**
 * @public
 */
export type Comment = {
    comment: string;
    position: number[];
}

/**
 * @public
 * Type of Parser's Node
 */
export type Node = Value | Op | Tag;

/**
 * @public
 * Type of Parser's State
 */
export type State = {
    parse: {
        tree: Node[];
        tags: Tag[][];
    };
    track: {
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
};

/**
* @public
* Type of a parse tree object
*/
export type ParseTree = Record<
    string,
    { tree: Node[]; position: number[]; }
>;
