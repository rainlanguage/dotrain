import assert from "assert";
import * as chai from "chai";
import { Meta } from "@rainprotocol/meta";
import METAS from "../fixtures/meta.json";
import chaiAsPromised from "chai-as-promised";
import { assertError, deployerHash } from "../utils";
import { ExpressionConfig, rainlang, Compile } from "../../src";


chai.use(chaiAsPromised);
const expect: Chai.ExpectStatic = chai.expect;

describe("Rainlang Compiler Tests", async function () {
    const metaStore = new Meta.Store();
    // const bytecode = METAS[deployerHash];

    before(async () => {
        const kv = Object.entries(METAS);
        for (let i = 0; i < kv.length; i++) {
            await metaStore.update(kv[i][0], kv[i][1]);
        }
    });

    it("should fail if an invalid dispair is specified", async () => {
        const expression = rainlang`
        /* main source */
        _: int-add(1 2);`;

        const result = await Compile.Rainlang(expression, "", 0, {metaStore})
            .catch((err) => {
                assert.equal((err as Error).message, "invalid bytecode");
            });
        assert.equal(result, undefined, "was expecting to fail when no dispair is specified");
    });

    it("should accept valid rainlang fragment `_:;`", async () => {
        return expect(Compile.Rainlang(rainlang`_:;`, deployerHash, 0, {metaStore}).catch(v => console.log(v))).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `:;`", async () => {
        return expect(Compile.Rainlang(rainlang`:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `_ _:;`", async () => {
        return expect(Compile.Rainlang(rainlang`_ _:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `_:, _:;`", async () => {
        return expect(Compile.Rainlang(
            rainlang`_:,
                    _:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `_:, _:, _:, _:, _:, _:;`", async () => {
        return expect(Compile.Rainlang(
            rainlang`_:, _:, _:, _:, _:, _:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `/* this is a comment */ _:;`", async () => {
        return expect(Compile.Rainlang(rainlang`
        /* this is a comment */
        _:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 16);
            });
    });

    it("should accept valid rainlang fragment `_:; _:;`", async () => {
        return expect(Compile.Rainlang(rainlang`
        _:;
        _:;`, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 28);
            });
    });

    it("should accept valid rainlang fragment `#exp _:int-add(10 20);`", async () => {
        return expect(Compile.Rainlang(
            rainlang`_:int-add(10 20);`, 
            deployerHash, 
            0,
            {metaStore}
        )).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.bytecode.length, 40);
            });
    });

    it("should accept valid rainlang fragment `_: int-add(10 20), _: block-timestamp();`", async () => {
        return expect(Compile.Rainlang(
            rainlang`_: int-add(10 20), _: block-timestamp();`, 
            deployerHash, 
            0,
            {metaStore}
        )).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.bytecode.length, 48);
            });
    });

    it("should accept valid rainlang fragment `#exp _ _: int-add(10 20) block-timestamp();`", async () => {
        return expect(Compile.Rainlang(
            rainlang`_ _: int-add(10 20) block-timestamp();`, 
            deployerHash,
            0, 
            {metaStore}
        )).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 2);
                assert.deepEqual(response.constants, ["10", "20"]);
                assert.equal(response.bytecode.length, 48);
            });
    });

    it("should accept valid rainlang fragment for multiline comment", async () => {
        return expect(Compile.Rainlang(
            rainlang`_: block-timestamp();`,
            deployerHash, 
            0,
            {metaStore}
        )).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 0);
                assert.equal(response.bytecode.length, 24);
            });
    });

    it("should compile an expression referencing top stack items", async () => {
        const expression = rainlang`
            sentinel: 123,
            sentinel20: 123,
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
        return expect(
            Compile.Rainlang(expression, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 3);
                assert.deepEqual(
                    response.constants, 
                    ["123", "10", "20"]
                );
                assert.equal(response.bytecode.length, 136);
            });
    });

    it("should successfully compile an expression having multiple outputs", async () => {
        const expression = rainlang`
            s0 s1: 1 2,
            _: int-add(s0 4),
            _: int-add(s1 5);
        `;
        return expect(
            Compile.Rainlang(expression, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 4);
                assert.deepEqual(response.constants, ["1", "2", "4", "5"]);
                assert.equal(response.bytecode.length, 80);
            });
    });

    it("should successfully compile a decompiled expression", async () => {
        const expression = rainlang`
        _ _ _ _: 0x01 0x02 0x01 int-add(constant<0>() constant<1>() constant<2>());

        _ _ _: 0x01 0x02 0x03;`;

        return expect(
            Compile.Rainlang(expression, deployerHash, 0, {metaStore})).to.eventually.be.fulfilled
            .then((response: ExpressionConfig) => {
                assert.equal(response.constants.length, 3);
                assert.equal(response.bytecode.length, 108);
            });
    });

    it("should throw error for invalid rainlang fragment `#exp :int-add(10 20);`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`:int-add(10 20);`, deployerHash, 0, {metaStore}),
            "StackOutputsMismatch",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `,`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`,`, deployerHash, 0, {metaStore}),
            "UnexpectedLHSChar",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment ` ;`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang` ;`, deployerHash, 0, {metaStore}),
            "UnexpectedLHSChar",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`_`, deployerHash, 0, {metaStore}),
            "MissingFinalSemi",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_: int-add(10 20), _:;`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`_: int-add(10 20), _:;`, deployerHash, 0, {metaStore}),
            "NotAcceptingInputs",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `// This is an invalid comment. _: int-add(10, 20), _:`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`
                // This is an invalid comment.
                _: int-add(10 20), _:
                `, deployerHash, 0, {metaStore}),
            "MalformedCommentStart",
            "Invalid Error"
        );
    });

    it("should throw error for invalid rainlang fragment `_: int-add(10 20) block-timestamp();`", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`_: int-add(10 20) block-timestamp();`, deployerHash, 0, {metaStore}),
            "ExcessRHSItems",
            "Invalid Error"
        );
    });

    it("should not accept negative numbers", async () => {
        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`_: int-add(-10 20)`, deployerHash, 0, {metaStore}),
            "UnexpectedRHSChar",
            "Invalid Error"
        );

        await assertError(
            async () =>
                await Compile.Rainlang(rainlang`_: int-sub(123941 -123941)`, deployerHash, 0, {metaStore}),
            "UnexpectedRHSChar",
            "Invalid Error"
        );
    });

    it("should only accept ASCII characters", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: int-add(10𐐀 20)`, deployerHash, 0, {metaStore}),
            "UnexpectedRHSChar",
            "Invalid Error"
        );
    });

    it("should error if invalid operand brackets is provided", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant<10 1()`, deployerHash, 0, {metaStore}),
            "UnclosedOperand",
            "Invalid Error"
        );
    });

    it("should error if invalid parenthesis is provided", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant<10 1>`, deployerHash, 0, {metaStore}),
            "UnclosedOperand",
            "Invalid Error"
        );
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant<10 1>(`, deployerHash, 0, {metaStore}),
            "UnclosedOperand",
            "Invalid Error"
        );
    });

    it("should error if invalid word pattern is provided", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: ab<10 1>()`, deployerHash, 0, {metaStore}),
            "UnknownWord",
            "Invalid Error"
        );
    });

    it("should error if invalid opcode is passed in the rainlang fragment", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: readmemory<10 1>()`, deployerHash, 0, {metaStore}),
            "UnknownWord",
            "Invalid Error"
        );
    });

    it("should error if operand arguments are missing in the rainlang fragment", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant();`, deployerHash, 0, {metaStore}),
            "OutOfBoundsConstantRead",
            "Invalid Error"
        );

        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant<>();`, deployerHash, 0, {metaStore}),
            "ExpectedOperand",
            "Invalid Error"
        );

        await assertError(
            async () => await Compile.Rainlang(rainlang`_: constant<1>();`, deployerHash, 0, {metaStore}),
            "OutOfBoundsConstantRead",
            "Invalid Error"
        );
    });

    it("should error if a word is undefined", async () => {
        await assertError(
            async () => await Compile.Rainlang(rainlang`_: int-add(ans 1);`, deployerHash, 0, {metaStore}),
            "UnknownWord",
            "Invalid Error"
        );

    });
});