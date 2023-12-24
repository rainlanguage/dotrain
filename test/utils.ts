import * as fs from "fs";
import { assert } from "chai";
import { DeployerQueryResponse } from "../dist/cjs/index";
import { Position, Range } from "vscode-languageserver-types";

/**
 * Contract Meta hash to get the contract meta bytes from
 */
export const callerMeta = {
    hash: "0x56ffc3fc82109c33f1e1544157a70144fc15e7c6e9ae9c65a636fd165b1bc51c",
    bytes: arrayify(fs.readFileSync("./test/fixtures/caller.txt", { encoding: "utf-8" })),
};

/**
 * The main deployer hash
 */
export const deployer: DeployerQueryResponse = {
    metaHash: "0x7a89034fd7a33df88ca474ff2e413d8a2f425ed29f09866344ac6d6070a30d12",
    metaBytes: Uint8Array.from(
        fs.readFileSync("./test/fixtures/RainterpreterExpressionDeployerNPE2.rain.meta"),
    ),
    bytecode: arrayify(
        fs.readFileSync("./test/fixtures/deployer-bytecode.txt", { encoding: "utf-8" }),
    ),
    parser: arrayify(fs.readFileSync("./test/fixtures/parser.txt", { encoding: "utf-8" })),
    interpreter: arrayify(fs.readFileSync("./test/fixtures/int.txt", { encoding: "utf-8" })),
    store: arrayify(fs.readFileSync("./test/fixtures/store.txt", { encoding: "utf-8" })),
    txHash: "0x78fd1edb0bdb928db6015990fecafbb964b44692e2d435693062dd4efc6254dd", // mocked
    bytecodeMetaHash: "0xa60a26b92501195b72f34dad09dc163ff65d3a86109e76b8c80110904f574dbb",
};

/**
 * Assert errors thrown by functions
 */
export const assertError = async (f: any, s: string, e: string) => {
    let didError = false;
    try {
        await f();
    } catch (e: any) {
        assert(
            JSON.stringify(e).includes(s),
            `error string ${JSON.stringify(e)} does not include ${s}`,
        );
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

export function hexlify(value: Uint8Array): string {
    let result = "0x";
    for (let i = 0; i < value.length; i++) {
        result += value[i].toString(16).padStart(2, "0");
    }
    return result;
}

export function arrayify(value: string): Uint8Array {
    const array: number[] = [];
    const v = value.startsWith("0x") ? value.substring(2) : value;
    for (let i = 0; i < v.length; i += 2) {
        array.push(parseInt(v.substring(i, i + 2), 16));
    }
    return Uint8Array.from(array);
}
