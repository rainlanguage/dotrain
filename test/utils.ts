import * as assert from "assert";
import { Position, Range } from "vscode-languageserver-types";

export const testDotrain = `#value 0x123

#other-value 0b101

#my-address 0x1234567890123456789012345678901234567890

#elided ! this is elided, rebind before using`;

export const testDotrainUri = "file:///test.rain";

/**
 * Assert errors thrown by functions
 */
export const assertError = async (f: any, s: string, e: string) => {
    let didError = false;
    try {
        await f();
    } catch (e: any) {
        assert.ok(
            JSON.stringify(e).includes(s),
            `error string ${JSON.stringify(e)} does not include ${s}`,
        );
        didError = true;
    }
    assert.ok(didError, e);
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
