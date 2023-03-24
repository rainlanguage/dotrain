import * as chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import { ExpressionConfig, getOpMetaFromSg } from "../../src";
import { rlc } from "../../src/compiler/rainCompiler";
import { deployerAddress, rainlang } from "../utils";

chai.use(chaiAsPromised);
const assert: Chai.AssertStatic = chai.assert;
// const expect: Chai.ExpectStatic = chai.expect;

describe("Rain Compiler tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress);
    });

    it("should fail if no opmeta is specified", async () => {
        const expression = rainlang`
        /* main source */
        _: add(1 2);`;

        const result = await rlc(expression)
            .catch((err) => {
                assert(err === "expected op meta");
            });

        assert(result == undefined, "was expecting to fail when no opmeta is specified");
    });

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

    it("should accept valid rainlang fragments", async () => {

        await rlc(rainlang`_:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });

        await rlc(rainlang`:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });

        await rlc(rainlang`_ _:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });

        await rlc(rainlang`_:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });

        await rlc(rainlang`
                    _:,
                    _:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });


        await rlc(rainlang`
            /* this is a comment */
            _:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 1);
            })
            .catch((err) => {
                throw err;
            });

        await rlc(rainlang`
            _:;
            _:;`, opMeta)
            .then((expressionConfig: ExpressionConfig) => {
                assert(expressionConfig.constants.length == 0);
                assert(expressionConfig.sources.length == 2);
            })
            .catch((err) => {
                throw err;
            });
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`:add(10 20);`, opMeta));
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`:`, opMeta));
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`,`, opMeta));
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`;`, opMeta));
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`,;`, opMeta));
    });

    it("should throw error for invalid rainlang fragments", async () => {
        return assert.isRejected(rlc(rainlang`_;`, opMeta));
    });
});