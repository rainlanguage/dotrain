import * as chai from "chai";
import { rainlang } from "../../src/utils";
import chaiAsPromised from 'chai-as-promised';
import { assertError, deployerAddress } from "../utils";
import { rlc } from "../../src/compiler/rainCompiler";
import { ExpressionConfig, getOpMetaFromSg } from "../../src";


chai.use(chaiAsPromised);
const assert: Chai.AssertStatic = chai.assert;
const expect: Chai.ExpectStatic = chai.expect;

describe("Rainlang Compiler (rlc) tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("should fail if an invalid opmeta is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, opMeta + "thisIsAnInValidOpMeta"),
            "invalid op meta",
            "Invalid Error"
        );
    });

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(rlc(rainlang`_:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `:;`", async () => {
        return expect(rlc(rainlang`:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_ _:;`", async () => {
        return expect(rlc(rainlang`_ _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(rlc(rainlang`_:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_:, _:;`", async () => {
        return expect(rlc(
            rainlang`_:,
                    _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_:, _:, _:, _:, _:, _:;`", async () => {
        return expect(rlc(
            rainlang`_:, _:, _:, _:, _:, _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `/* this is a comment */ _:;`", async () => {
        return expect(rlc(rainlang`
        /* this is a comment */
        _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_:; _:;`", async () => {
        return expect(rlc(rainlang`
        _:;
        _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 2);
            });
    });

    it("should accept valid rainlang fragment `_:add(10 20);`", async () => {
        return expect(rlc(rainlang`_:add(10 20);`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 2);
                assert.deepEqual(response.constants, ['10', '20']);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_: add(10 20), _: block-timestamp();`", async () => {
        return expect(rlc(rainlang`_: add(10 20), _: block-timestamp();`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 2);
                assert.deepEqual(response.constants, ['10', '20']);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment `_ _: add(10 20) block-timestamp();`", async () => {
        return expect(rlc(rainlang`_ _: add(10 20) block-timestamp();`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 2);
                assert.deepEqual(response.constants, ['10', '20']);
                assert(response.sources.length == 1);
            });
    });

    it("should accept valid rainlang fragment for multiline comment", async () => {
        return expect(rlc(rainlang`
        /**
        * Stack the current block number.
        * Is also the last value on the stack.
        */
       _: block-timestamp();
       `, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 0);
                assert(response.sources.length == 1);
            });
    });

    it("should throw error for invalid rainlang fragment `:add(10 20);`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`:add(10 20);`, opMeta),
            "no LHS item exists to match this RHS item",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `:`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`:`, opMeta),
            "source item expressions must end with semi",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `,`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`,`, opMeta),
            "source item expressions must end with semi",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `;`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`;`, opMeta),
            "invalid rain expression",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `,;`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`,;`, opMeta),
            "invalid rain expression",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_;`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_;`, opMeta),
            "invalid rain expression",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_: add(10 20), _:;`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(10 20), _:;`, opMeta),
            "no RHS item exists to match this LHS item: _",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `// This is an invalid comment. _: add(10, 20), _:;`", async () => {

        await assertError(
            async () =>
                await rlc(rainlang`
                // This is an invalid comment.
                _: add(10 20), _:;
                `, opMeta),
            "invalid LHS alias: //",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_: add(10 20) block-timestamp();`", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(10 20) block-timestamp();`, opMeta),
            "no LHS item exists to match this RHS item",
            "Invalid Error"
        );
    });
});