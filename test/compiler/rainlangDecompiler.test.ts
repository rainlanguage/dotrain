import * as chai from "chai";
import { rainlang } from "../../src/utils";
import chaiAsPromised from 'chai-as-promised';
import { assertError, deployerAddress } from "../utils";
import { rlc } from "../../src/compiler/rainCompiler";
import { rld } from "../../src/compiler/rainDecompiler";
import { ExpressionConfig, getOpMetaFromSg } from "../../src";
import { invalidOpMetas } from "../fixtures/opmeta";
import { hexlify } from "ethers/lib/utils";
chai.use(chaiAsPromised);
const assert: Chai.AssertStatic = chai.assert;

describe("Rainlang Decompiler (rld) tests", async function () {
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
        const expressionConfig = await rlc(expression, opMeta);
        const decompiledText = (await rld(expressionConfig, opMeta, false)).getTextDocument()
            .getText();
        assert(decompiledText === expression, `Expected: ${expression}\nActual ${decompiledText}`);

    });

    it("should decompile an expression referencing top stack items", async () => {

        const expression = rainlang`a: 10, b: 20, c: b;`;
        const expressionConfig = await rlc(expression, opMeta);
        const decompiledText = (await rld(expressionConfig, opMeta, false)).getTextDocument()
            .getText();
        const expectedText = rainlang`_ _ _: 0x0a 0x14 read-memory<1 0>();`;
        assert(decompiledText === expectedText, `\nExpected: ${expectedText}\nActual: ${decompiledText}`);
    });

    it("should decompile an expression with existing stack items", async () => {

        const expression = rainlang`a:, b: 20, c: add(a b);`;
        const expressionConfig = await rlc(expression, opMeta);
        const decompiledText = (await rld(expressionConfig, opMeta, false)).getTextDocument()
            .getText();
        const expectedText = rainlang`_ _: 0x14 add(read-memory<0 0>() read-memory<1 0>());`;
        assert(decompiledText === expectedText, `\nExpected: ${expectedText}\nActual: ${decompiledText}`);
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
