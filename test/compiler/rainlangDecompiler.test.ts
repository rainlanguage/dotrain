import { rainlang } from "../../src/utils";
import { assertError, deployerAddress } from "../utils";
import { rlc } from "../../src/compiler/rainCompiler";
import { rld } from "../../src/compiler/rainDecompiler";
import { ExpressionConfig, getOpMetaFromSg } from "../../src";
import { invalidOpMetas } from "../fixtures/opmeta";
import { hexlify } from "ethers/lib/utils";
import assert from "assert";

async function testRainlangDecompiler(
    expression: string, expectedExpression: string, opMeta: string | Uint8Array
) {
    const expressionConfig = await rlc(expression, opMeta);
    const decompiledText = (await rld(expressionConfig, opMeta, false)).getTextDocument()
        .getText();
    // Passing decompiled text to compiler again to check for errors
    try {
        await rlc(decompiledText, opMeta);
    }
    catch (e) {
        throw new Error(`Failed to compile the decompiled text:\n\ndecompiledText = ${decompiledText}\n\nError: ${JSON.stringify(e, null, 2)}`);
    }
    assert.equal(decompiledText, expectedExpression, `\nExpected: ${expectedExpression}\nActual: ${decompiledText}`);
}

describe.only("Rainlang Decompiler (rld) tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("should fail if an invalid bytes opmeta is specified", async () => {

        const expression = rainlang`_: add(0x0a 0x14);`;
        const expressionConfig = await rlc(expression, opMeta);
        await assertError(
            async () =>
                await rld(expressionConfig, invalidOpMetas.invalid_bytes, false),
            "invalid op meta",
            "Invalid Error"
        );
    });

    it("should decompile a valid expressionConfig", async () => {
        const expression = rainlang`_: add(0x0a 0x14);`;
        await testRainlangDecompiler(expression, expression, opMeta);
    });

    it("should decompile an expression referencing top stack items", async () => {
        const expression0 = rainlang`a: 10, b: 20, c: b;`;
        const expectedExpression0 = rainlang`_ _ _: 0x0a 0x14 read-memory<1 0>();`;
        await testRainlangDecompiler(expression0, expectedExpression0, opMeta);

        const expression1 = rainlang`
            sentinel: infinity,
            sentinel20: infinity,
            you: context<0 0>(),
            mintamount: 10,
            burnamount: 20,
            transfererc1155slist: sentinel,
            transfererc721slist: sentinel,
            transfererc20slist: sentinel,
            transfernativeslist: sentinel,
            burnslist: sentinel20,
            burn-account burn-amount: you burnamount,
            mintslist: sentinel20,
            mint-account mint-amount: you mintamount;
        `;
        const expectedExpression1 = rainlang`_ _ _ _ _ _ _ _ _ _ _ _ _ _ _: max-uint256 max-uint256 context<0 0>() 0x0a 0x14 read-memory<0 0>() read-memory<0 0>() read-memory<0 0>() read-memory<0 0>() read-memory<1 0>() read-memory<2 0>() read-memory<4 0>() read-memory<1 0>() read-memory<2 0>() read-memory<3 0>();`;
        await testRainlangDecompiler(expression1, expectedExpression1, opMeta);

    });

    it("should decompile an expression with call opcode having multiple outputs", async () => {
        const expression0 = rainlang`
            /* main source */
            _ _ _:  call<1 3>(2 2);
        `;
        const expectedExpression0 = rainlang` _ _ _: call<1 3>(0x02 0x02);`;
        await testRainlangDecompiler(expression0, expectedExpression0, opMeta);
    });

    it("should decompile an expression with existing stack items", async () => {
        const expression = rainlang`a:, b: 20, c: add(a b);`;
        const expectedText = rainlang`_ _: 0x14 add(read-memory<0 0>() read-memory<1 0>());`;
        await testRainlangDecompiler(expression, expectedText, opMeta);
    });

    it("should fail if an opcode is not found in opmeta", async () => {
        // Contains an invalid opcode with enum 1337
        const expressionConfig: ExpressionConfig = {
            sources: [hexlify([0, 13, 0, 3, 0, 77, 0, 144, 5, 57, 0, 0])],
            constants: [10, 20]
        };
        await assertError(
            async () =>
                await rld(expressionConfig, opMeta, false),
            "opcode with enum \\\"1337\\\" does not exist on OpMeta",
            "Invalid Error"
        );
    });

});
