import { assert } from "chai";
import { Position, Range } from "vscode-languageserver-types";


/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x092Fce581457894FDa5cdAF6208fe3E823543fb7";

/**
 * Op Meta hash to get the meta bytes from
 */
export const opMetaHash = "0xe4c000f3728f30e612b34e401529ce5266061cc1233dc54a6a89524929571d8f";

/**
 * Contract Meta hash to get the contract meta bytes from
 */
export const contractMetaHash = "0x56ffc3fc82109c33f1e1544157a70144fc15e7c6e9ae9c65a636fd165b1bc51c";

/**
 * The main deployer hash
 */
export const deployerHash = "0x78fd1edb0bdb928db6015990fecafbb964b44692e2d435693062dd4efc6254dd";

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