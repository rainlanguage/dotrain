import { BigNumberish } from "ethers"


/**
 * @public Type of position start and end indexes, inclusive at both ends
 */
export type Position = [number, number];

/**
 * @public
 * Type of Parser's Diagnostic (error)
 */
export type Diagnostic = {
    msg: string;
    position: Position;
};

/**
 * @public
 * Type of Parser's Value node
 */
export type Value = {
    value: BigNumberish;
    position: Position;
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
        position: Position;
    };
    operand: number;
    output: number;
    position: Position;
    parens: Position;
    parameters: Node[];
    operandArgs?: {
        position: Position;
        args: {
            value: number;
            name: string;
            position: Position;
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
    position: Position;
    tag?: Tag;
}

/**
 * @public
 */
export type Comment = {
    comment: string;
    position: Position;
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
        aliases: Tag[][];
        subExpAliases: Tag[];
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
    number,
    { tree: Node[]; position: Position; }
>;
