import * as chai from "chai";
import { rainlang } from "../../src/utils";
import chaiAsPromised from 'chai-as-promised';
import { deployerAddress } from "../utils";
import { rlc } from "../../src/compiler/rainCompiler";
import { rld } from "../../src/compiler/rainDecompiler";
import { getOpMetaFromSg } from "../../src";


chai.use(chaiAsPromised);
const assert: Chai.AssertStatic = chai.assert;

describe("Rainlang Decompiler (rld) tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("should decompile a valid expressionConfig", async () => {

        const expression = rainlang`_: add(0x0a 0x14);`;

        const expressionConfig = await rlc(expression, opMeta);

        const decompiledText = await (await rld(expressionConfig, opMeta, false)).getTextDocument()
            .getText();

        assert(decompiledText === expression, `Expected: ${expression}\nActual ${decompiledText}`);

    });

    it("should decompile a valid expressionConfig", async () => {

        const expression = rainlang`a: 10, b: 20, c: b;`;

        const expressionConfig = await rlc(expression, opMeta);

        const decompiledText = await (await rld(expressionConfig, opMeta, false)).getTextDocument()
            .getText();
        const expectedText = `_ _ _: 0x0a 0x14 read-memory<1 1>();`;
        assert(decompiledText === expectedText, `\nExpected: ${expectedText}\nActual: ${decompiledText}`);

    });


});