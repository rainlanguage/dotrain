import assert from "assert";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { invalidOpMetas } from "../fixtures/opmeta";
import { assertError, deployerAddress } from "../utils";
import { ExpressionConfig, getOpMetaFromSg, rainlang, rlc } from "../../src";


chai.use(chaiAsPromised);
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

    it("should fail if op meta has invalid schema", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_by_schema),
            "Op Meta Error: invalid meta for add, reason: failed schema validation",
            "Invalid Error"
        );
    });

    it("should fail if op meta has duplicate schema", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.duplicate_alias),
            "Op Meta Error: invalid meta, reason: duplicated names or aliases",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid bits", async () => {
        // await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_operand_args).catch((err) => { throw err; });
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_bits),
            "Op Meta Error: invalid meta for scale-18, reason: start bit greater than end bit for saturate",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing bits in input", async () => {
        // await rlc(rainlang`_: add(1 2);`, invalidOpMetas.invalid_operand_args).catch((err) => { throw err; });
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.missing_bits),
            "Op Meta Error: invalid meta for call, reason: must have specified \\\"bits\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing computation in input", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.missing_computation),
            "Op Meta Error: invalid meta for do-while, reason: must have specified \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has unexpected computation in input", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, invalidOpMetas.unexpected_computation),
            "Op Meta Error: invalid meta for do-while, reason: unexpected \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if an invalid opmeta is specified", async () => {
        const expression = rainlang`
        /* main source */
        _: add(1 2);`;

        const result = await rlc(expression, opMeta + "thisIsAnInValidOpMeta")
            .catch((err) => {
                assert.equal(err.problems[0].msg, "invalid op meta");
            });
        assert.equal(result, undefined, "was expecting to fail when no opmeta is specified");
    });

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(rlc(rainlang`_:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `:;`", async () => {
        return expect(rlc(rainlang`:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_ _:;`", async () => {
        return expect(rlc(rainlang`_ _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(rlc(rainlang`_:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_:, _:;`", async () => {
        return expect(rlc(
            rainlang`_:,
                    _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_:, _:, _:, _:, _:, _:;`", async () => {
        return expect(rlc(
            rainlang`_:, _:, _:, _:, _:, _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `/* this is a comment */ _:;`", async () => {
        return expect(rlc(rainlang`
        /* this is a comment */
        _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_:; _:;`", async () => {
        return expect(rlc(rainlang`
        _:;
        _:;`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 2);
            });
    });

    it("should accept valid rainlang fragment `_:add(10 20);`", async () => {
        return expect(rlc(rainlang`_:add(10 20);`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_: add(10 20), _: block-timestamp();`", async () => {
        return expect(rlc(rainlang`_: add(10 20), _: block-timestamp();`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment `_ _: add(10 20) block-timestamp();`", async () => {
        return expect(rlc(rainlang`_ _: add(10 20) block-timestamp();`, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should accept valid rainlang fragment for multiline comment", async () => {
        return expect(rlc(rainlang`       
       _: block-timestamp();
       `, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should compile an expression referencing top stack items", async () => {
        const expression = rainlang`
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
        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 3);
                assert.deepEqual(
                    response.constants, 
                    ["0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "10", "20"]
                );
                assert.equal(response.sources.length, 1);
            });
    });

    it("should successfully compile an expression with do-while opcode having multiple outputs", async () => {
        const expression = rainlang`
            c0: 1,
            c1: 2,
            condition: 1, 
            _ _: do-while<1>(c0 c1 condition);
            
            s0 s1: ,
            o0 o1: 1 2,
            condition: 3; 
    
            s0: ,
            _: less-than(s0 3);
    
            s0 s1: ,
            _: add(s0 4),
            _: add(s1 5);
        `;
        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 5);
                assert.deepEqual(response.constants, ["1", "2", "3", "4", "5"]);
                assert.equal(response.sources.length, 4);
            });
    });

    it("should successfully compile an expression with loop-n opcode having multiple outputs", async () => {
        const expression = rainlang`
            _ loopoutput _: loop-n<1 1 3>(
                2
                3
                4
            ),
            _ _ _ _ _ _ _ _: explode-32(loopoutput);
        
            s0 s1 s2: ,
            increment: add(s0 5),

            shrval: call<3 1>(increment s1 s2),
            
            lvldcr: saturating-sub(s2 1);
            
            s0 s1 s2: ,
            levelmul: mul(6 s2),
            levelexp: exp(2 levelmul),
            finalmul: mul(levelexp s0),

            op: add(finalmul s1);
        `;

        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 6);
                assert.deepEqual(response.constants, ["2", "3", "4", "5", "1", "6"]);
                assert.equal(response.sources.length, 3);
            });
    });

    it("should successfully compile an expression with call opcode having multiple outputs", async () => {
        const expression = rainlang`
            _ _ _:  call<1 3>(2 2);
        `;

        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 1);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should successfully compile an expression with call opcode having multiple outputs", async () => {
        const expression = rainlang`
            _ _: fold-context<2 3 1>(0 1);
        `;

        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.equal(response.sources.length, 1);
            });
    });

    it("should successfully compile a decompiled expression", async () => {
        const expression = rainlang`_ _ _ _ _: 0x01 0x02 0x01 do-while<1>(read-memory<0 0>() read-memory<1 0>() read-memory<2 0>());
        _ _ _: 0x01 0x02 0x03;
        _: less-than(read-memory<0 0>() 0x03);
        _ _: add(read-memory<0 0>() 0x04) add(read-memory<1 0>() 0x05);`;

        return expect(rlc(expression, opMeta)).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 5);
                assert.equal(response.sources.length, 4);
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
            "is not a valid rainlang word",
            "Invalid Error"
        );

        await assertError(
            async () =>
                await rlc(rainlang`_: sub(123941 -123941);`, opMeta),
            "is not a valid rainlang word",
            "Invalid Error"
        );
    });

    it("should only accept ASCII characters", async () => {
        await assertError(
            async () => await rlc(rainlang`_: add(10² 20);`, opMeta),
            "found non-printable-ASCII character",
            "Invalid Error"
        );
    });

    it("should error if invalid operand brackets is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1();`, opMeta),
            "774",
            "Invalid Error"
        );
    });

    it("should error if invalid parenthesis is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1>;`, opMeta),
            "773",
            "Invalid Error"
        );
        await assertError(
            async () => await rlc(rainlang`_: read-memory<10 1>(;`, opMeta),
            "772",
            "Invalid Error"
        );
    });

    it("should error if invalid word pattern is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: <10 1>();`, opMeta),
            "257",
            "Invalid Error"
        );
    });

    it("should error if invalid opcode is passed in the rainlang fragment", async () => {
        await assertError(
            async () => await rlc(rainlang`_: readmemory<10 1>();`, opMeta),
            "1536",
            "Invalid Error"
        );
    });

    it("should error if operand arguments are missing in the rainlang fragment", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory();`, opMeta),
            "771",
            "Invalid Error"
        );

        await assertError(
            async () => await rlc(rainlang`_: read-memory<>();`, opMeta),
            "1027",
            "Invalid Error"
        );

        await assertError(
            async () => await rlc(rainlang`_: read-memory<1>();`, opMeta),
            "1027",
            "Invalid Error"
        );
    });

    it("should error if out-of-range operand arguments is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<1 2>();`, opMeta),
            "1282",
            "Invalid Error"
        );
    });

    it("should error if out-of-range operand arguments is provided", async () => {
        await assertError(
            async () => await rlc(rainlang`_: read-memory<1 2>();`, opMeta),
            "1282",
            "Invalid Error"
        );

    });

    it("should error if a word is undefined", async () => {
        await assertError(
            async () => await rlc(rainlang`_: add(ans 1);`, opMeta),
            "undefined word: ans",
            "Invalid Error"
        );

    });

});