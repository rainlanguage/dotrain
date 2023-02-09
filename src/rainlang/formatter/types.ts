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
     * Tags/Names/Aliases for each individual item on the final stack such as Price and Quantity of a sale script (should be passed in order)
     */
    tags?: string[];
    /**
     * True if the result needs to be tagged and optimized for the RuleBuilder script generator
     */
    enableTagging?: boolean;
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
}