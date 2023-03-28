import * as chai from "chai";
import { rainlang } from "../../src/utils";
import chaiAsPromised from 'chai-as-promised';
import { assertError, deployerAddress } from "../utils";
import { rlc } from "../../src/compiler/rainCompiler";
import { ExpressionConfig, getOpMetaFromSg } from "../../src";
import { invalidOpMetas } from "../fixtures/opmeta";


chai.use(chaiAsPromised);
const assert: Chai.AssertStatic = chai.assert;
const expect: Chai.ExpectStatic = chai.expect;

describe("Rainlang Compiler (rlc) tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("should fail if an empty opmeta is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.empty),
            "expected op meta",
            "Invalid Error"
        );
    });

    it("should fail if an invalid bytes opmeta is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_bytes),
            "Op Meta Error: op meta must be in valid bytes form",
            "Invalid Error"
        );
    });

    it("should fail if an invalid header opmeta is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_header),
            "incorrect header check",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid operand args", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_operand_args),
            "Op Meta Error: invalid meta for call, reason: bad operand args order",
            "Invalid Error"
        );
    });

    it("should fail if an invalid opmeta is specified", async () => {
        const expression = rainlang`
        /* main source */
        _: add(1 2);`;

        const result = await rlc(expression, opMeta + "thisIsAnInValidOpMeta")
            .catch((err) => {
                assert(err.problems[0].msg === "invalid op meta");
            });
        assert(result == undefined, "was expecting to fail when no opmeta is specified");
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

    it("should not accept negative numbers", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(-10 20);`, opMeta),
            'is not a valid rainlang word',
            "Invalid Error"
        );

        await assertError(
            async () =>
                await rlc(rainlang`_: sub(123941 -123941);`, opMeta),
            'is not a valid rainlang word',
            "Invalid Error"
        );
    });

    it("should only accept ASCII characters", async () => {
        await assertError(
            async () => await rlc(rainlang`_: add(10² 20);`, opMeta),
            'found non-printable-ASCII character',
            "Invalid Error"
        );
    });

    it("should error if invalid operand brackets is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1();`, opMeta),
            '775',
            "Invalid Error"
        );
    });

    it("should error if invalid parenthesis is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1>;`, opMeta),
            '773',
            "Invalid Error"
        );
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1>(;`, opMeta),
            '772',
            "Invalid Error"
        );
    });

    it("should error if invalid word pattern is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: <10 1>();`, opMeta),
            '257',
            "Invalid Error"
        );
    });

    it("should error if invalid opcode is passed in the rainlang fragment", async () => {
        await assertError(
            async () => await rlc(rainlang`_: readmemory<10 1>();`, opMeta),
            '1536',
            "Invalid Error"
        );
    });

    it("should error if operand arguments are missing in the rainlang fragment", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory();`, opMeta),
            '771',
            "Invalid Error"
        );

        await assertError(
            async () => await rlc(rainlang`_: read-memory<>();`, opMeta),
            '1027',
            "Invalid Error"
        );

        await assertError(
            async () => await rlc(rainlang`_: read-memory<1>();`, opMeta),
            '1027',
            "Invalid Error"
        );
    });

    it("should error if out-of-range operand arguments is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<1 2>();`, opMeta),
            '1282',
            "Invalid Error"
        );
    });

    it("should error if out-of-range operand arguments is provided", async () => {
        // await rlc(rainlang`_:read-memory<1 2>();`, opMeta).catch((err) => { throw err; });
        await assertError(
            async () => await rlc(rainlang`_: read-memory<1 2>();`, opMeta),
            '1282',
            "Invalid Error"
        );

    });

    it("should error if a word is undefined", async () => {
        await assertError(
            async () => await rlc(rainlang`ans: add(ans 1);`, opMeta),
            'undefined word: ans',
            "Invalid Error"
        );

    });

});