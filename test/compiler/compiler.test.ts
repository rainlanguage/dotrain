import * as chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { deployerAddress, rainlang } from "../utils";
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

    // it("should fail if no opmeta is specified", async () => {
    //     const expression = rainlang`
    //     /* main source */
    //     _: add(1 2);`;

    //     const result = await rlc(expression)
    //         .catch((err) => {x
    //             assert(err === "expected op meta");
    //         });

    //     assert(result == undefined, "was expecting to fail when no opmeta is specified");
    // });

    it("should fail if and invalid opmeta is specified", async () => {
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

    it("should accept valid rainlang fragment `/* this is a comment */`", async () => {
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

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(rlc(rainlang`_:add(10 20);`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert(response.constants.length == 2);
                assert.deepEqual(response.constants, ['10', '20']);
                assert(response.sources.length == 1);
            });
    });

    it("should throw error for invalid rainlang fragment `:add(10 20);`", async () => {
        return assert.isRejected(rlc(rainlang`:add(10 20);`, opMeta));
    });

    it("should throw error for invalid rainlang fragment `:`", async () => {
        return assert.isRejected(rlc(rainlang`:`, opMeta));
    });

    it("should throw error for invalid rainlang fragment `,`", async () => {
        return assert.isRejected(rlc(rainlang`,`, opMeta));
    });

    it("should throw error for invalid rainlang fragment `;`", async () => {
        return assert.isRejected(rlc(rainlang`;`, opMeta));
    });

    it("should throw error for invalid rainlang fragment `,;`", async () => {
        return assert.isRejected(rlc(rainlang`,;`, opMeta));
    });

    it("should throw error for invalid rainlang fragment `_;`", async () => {
        return assert.isRejected(rlc(rainlang`_;`, opMeta));
    });
});