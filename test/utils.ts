import { assert } from "chai";
import { Position, Range } from "vscode-languageserver-types";


/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x092Fce581457894FDa5cdAF6208fe3E823543fb7";

/**
 * Op Meta hash to get the meta bytes from
 */
export const opMetaHash = "0x999dbdc57ac1b4b920864b6f2adc9d856689c422b889ebe19eeac1c30e7f962c";

/**
 * Contract Meta hash to get the contract meta bytes from
 */
export const contractMetaHash = "0x10f97a047a9d287eb96c885188fbdcd3bf1a525a1b31270fc4f9f6a0bc9554a6";

/** 
 * Assert errors thrown by functions
*/
export const assertError = async (f: any, s: string, e: string) => {
    let didError = false;
    try {
        await f();
    } catch (e: any) {
        assert(JSON.stringify(e).includes(s), `error string ${JSON.stringify(e)} does not include ${s}`);
        didError = true;
    }
    assert(didError, e);
};

/**
 * Creates Range
 * @param sLine Starting line number
 * @param sChar Starting character position
 * @param eLine Ending line number
 * @param eChar Ending character position
 */
export function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    return Range.create(Position.create(sLine, sChar), Position.create(eLine, eChar));
}