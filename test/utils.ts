import { assert } from "chai";
import { Position, Range } from "vscode-languageserver-types";
/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x01D5611c2D6FB7Bb1bFa9df2f524196743f59F2a";
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
 * Creates Range for vscode Diagnostic
 * @param sLine Starting line number
 * @param sChar Starting character position
 * @param eLine Ending line number
 * @param eChar Ending character position
 */
export function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    return Range.create(Position.create(sLine, sChar), Position.create(eLine, eChar));
}