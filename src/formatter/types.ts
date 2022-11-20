import { OpMeta } from "../types"

/**
 * @public
 *
 * Specific the configuration of the generation method
 */
export type Config = {
    /**
     * Enable the prettify for the result of the HumnaFriendlyRead, adds indentation to the final result
     */
    pretty?: boolean;
    /**
     * Providing the names for STORAGE opcodes
     */
    storageEnums?: string[];
    /**
     * Providing the names for CONTEXT opcodes
     */
    contextEnums?: string[];
    /**
     * Tags/Names/Aliases for each individual item on the final stack such as Price and Quantity of a sale script (should be passed in order)
     */
    tags?: string[];
    /**
     * True if the result needs to be tagged and optimized for the RuleBuilder script generator
     */
    enableTagging?: boolean;
    /**
     * An opmeta object to be used for creating the human friendly read
     */
    opmeta?: OpMeta[];
}

/**
 * @public
 * Specifies the configuration of the Prettify method.
 */
export type PrettifyConfig = {
    /**
     * Multiplier to the indent space
     */
    n?: number;
    // /**
    //  * Max length of each line
    //  */
    // length?: number;
}