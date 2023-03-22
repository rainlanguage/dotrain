import { BigNumberish } from "../utils";


/**
 * @public Type of position start and end indexes for RainDocument, inclusive at both ends
 */
export type RDPosition = [number, number];

/**
 * @public
 * Type of RainDocument's problem (error)
 */
export type RDProblem = {
    msg: string;
    position: RDPosition;
    code: number;
};

/**
 * @public
 * Type of RainDocument's Value node
 */
export type RDValueNode = {
    value: BigNumberish;
    position: RDPosition;
    lhs?: RDAliasNode;
};

/**
 * @public
 * Type of RainDocument's Opcode node
 */
export type RDOpNode = {
    opcode: {
        name: string;
        description: string;
        position: RDPosition;
    };
    operand: number;
    output: number;
    position: RDPosition;
    parens: RDPosition;
    parameters: RDNode[];
    operandArgs?: {
        position: RDPosition;
        args: {
            value: number;
            name: string;
            position: RDPosition;
            description?: string;
        }[];
    };
    lhs?: RDAliasNode[];
};

/**
 * @public
 * Type of RainDocument's lhs aliases
 */
export type RDAliasNode = {
    name: string;
    position: RDPosition;
    lhs?: RDAliasNode;
}

/**
 * @public
 * Type of RainDocument's comments
 */
export type RDComment = {
    comment: string;
    position: RDPosition;
}

/**
 * @public
 * Type of RainDocument's prase node
 */
export type RDNode = RDValueNode | RDOpNode | RDAliasNode;

/**
* @public
* Type of a RainDocument parse tree object
*/
export type RDParseTree = { tree: RDNode[]; position: RDPosition; }[];

/**
 * @public
 * Type of Parser's State
 */
export type RainParseState = {
    parse: {
        tree: RDNode[];
        expAliases: RDAliasNode[][]
        subExpAliases: RDAliasNode[];
    };
    track: {
        char: number;
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    operandArgsErr: boolean;
    runtimeError: Error | undefined;
    opmetaError: boolean;
    opMetaErrorMsg: string | undefined;
};

/**
 * @public
 * Type of RainDocument's parse result
 */
export type RainDocumentResult = {
    parseTree: RDParseTree;
    comments: RDComment[];
    problems: RDProblem[];
}


