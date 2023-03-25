import { assert } from "chai";

/**
 * Deployer Address to fetch the opmeta from subgraph
 */
export const deployerAddress = "0x01D5611c2D6FB7Bb1bFa9df2f524196743f59F2a";

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
