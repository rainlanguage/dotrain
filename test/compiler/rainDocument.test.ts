import * as chai from "chai";
import * as assert from "assert";
import * as chaiAsPromised from "chai-as-promised";
import { assertError, deployer } from "../utils";
import { MetaStore, RainDocument, ExpressionConfig, rainlang } from "../../dist/cjs";

chai.use(chaiAsPromised);
const expect: Chai.ExpectStatic = chai.expect;

describe("RainDocument Compiler Tests", async function () {
    const metaStore = new MetaStore();

    before(async () => {
        metaStore.setDeployer(deployer);
    });

    it("should fail if no dispair is specified", async () => {
        const expression = rainlang`
        /* main source */
        #expression
        _: int-add(1 2);`;

        return expect(
            RainDocument.compileText(expression, ["expression"], metaStore),
        ).to.be.rejected.then((e) => {
            assert.equal(
                e.Problems[0].msg,
                "cannot find any set of words (undefined deployer)",
                "was expecting to fail when no dispair is specified",
            );
        });
    });

    it("should accept valid rainlang fragment `:;`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash} #expression :;`,
                ["expression"],
                metaStore,
            ),
        ).to.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 0);
            assert.equal(response.bytecode.length, 16);
        });
    });

    // it("should not accept rainlang fragment `_:;`", async () => {
    //     return expect(
    //         RainDocument.compileText(
    //             rainlang`@${deployer.bytecodeMetaHash} #expression _:;`,
    //             ["expression"],
    //             metaStore,
    //         ),
    //     ).to.be.rejected.then((e) => {
    //         expect(e.Problems[0].msg).to.include(
    //             "EntrypointNonZeroInput",
    //             "was expecting to fail when no dispair is specified",
    //         );
    //     });
    // });

    // it("should not accept rainlang fragment `_ _:;`", async () => {
    //     await assertError(
    //         async () =>
    //             await RainDocument.compileText(
    //                 rainlang`@${deployer.bytecodeMetaHash} #expression _ _:;`,
    //                 ["expression"],
    //                 metaStore,
    //             ),
    //         "EntrypointNonZeroInput",
    //         "Invalid Error",
    //     );
    // });

    // it("should not accept rainlang fragment `_:, _:;`", async () => {
    //     await assertError(
    //         async () =>
    //             await RainDocument.compileText(
    //                 rainlang`@${deployer.bytecodeMetaHash} #expression _:, _:;`,
    //                 ["expression"],
    //                 metaStore,
    //             ),
    //         "EntrypointNonZeroInput",
    //         "Invalid Error",
    //     );
    // });

    // it("should not accept rainlang fragment `_:, _:, _:, _:, _:, _:;`", async () => {
    //     await assertError(
    //         async () =>
    //             await RainDocument.compileText(
    //                 rainlang`@${deployer.bytecodeMetaHash} #expression _:, _:, _:, _:, _:, _:;`,
    //                 ["expression"],
    //                 metaStore,
    //             ),
    //         "EntrypointNonZeroInput",
    //         "Invalid Error",
    //     );
    // });

    it("should accept valid rainlang fragment `/* this is a comment */ :;`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash}
        /* this is a comment */
        #expression
        :;`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 0);
            assert.equal(response.bytecode.length, 16);
        });
    });

    it("should accept valid rainlang fragment `#exp1 :; #exp2 :;`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash}
        #exp1
        :;
        #exp2
        :;`,
                ["exp1", "exp2"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 0);
            assert.equal(response.bytecode.length, 28);
        });
    });

    it("should accept valid rainlang fragment `#expression _:int-add(10 20);`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash} #expression _:int-add(10 20);`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 2);
            assert.deepEqual(response.constants, ["0xa", "0x14"]);
            assert.equal(response.bytecode.length, 40);
        });
    });

    it("should accept valid rainlang fragment `_: int-add(10 20), _: block-timestamp();`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(10 20), _: block-timestamp();`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 2);
            assert.deepEqual(response.constants, ["0xa", "0x14"]);
            assert.equal(response.bytecode.length, 48);
        });
    });

    it("should accept valid rainlang fragment `#expression _ _: int-add(10 20) block-timestamp();`", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash} #expression _ _: int-add(10 20) block-timestamp();`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 2);
            assert.deepEqual(response.constants, ["0xa", "0x14"]);
            assert.equal(response.bytecode.length, 48);
        });
    });

    it("should accept valid rainlang fragment for multiline comment", async () => {
        return expect(
            RainDocument.compileText(
                rainlang`@${deployer.bytecodeMetaHash}
                #expression
                _: block-timestamp();
            `,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 0);
            assert.equal(response.bytecode.length, 24);
        });
    });

    it("should compile an expression referencing top stack items", async () => {
        const expression = rainlang`@${deployer.bytecodeMetaHash}
            #expression
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
        return expect(
            RainDocument.compileText(expression, ["expression"], metaStore),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 3);
            assert.deepEqual(response.constants, [
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                "0xa",
                "0x14",
            ]);
            assert.equal(response.bytecode.length, 136);
        });
    });

    it("should successfully compile an expression having multiple outputs", async () => {
        const expression = rainlang`@${deployer.bytecodeMetaHash}
            #exp1
            c0: 1,
            c1: 2,
            condition: 1;

            #exp2
            s0 s1: 1 2,
            o0 o1: 1 2,
            condition: 3;

            #exp3
            s0: 1,
            _: less-than(s0 3);

            #exp4
            s0 s1: 1 2,
            _: int-add(s0 4),
            _: int-add(s1 5);
        `;
        return expect(
            RainDocument.compileText(expression, ["exp1", "exp2", "exp3", "exp4"], metaStore),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 5);
            assert.deepEqual(response.constants, ["0x1", "0x2", "0x3", "0x4", "0x5"]);
            assert.equal(response.bytecode.length, 212);
        });
    });

    it("should successfully compile an expression having multiple outputs", async () => {
        const expression = rainlang`@${deployer.bytecodeMetaHash}
            #exp2
            s0 s1 s2: 1 2 3 ,
            increment: int-add(s0 5),

            lvldcr: int-sub(s2 1);

            #exp3
            s0 s1 s2: 1 2 3,
            levelmul: int-mul(6 s2),
            levelexp: int-exp(2 levelmul),
            finalmul: int-mul(levelexp s0),

            op: int-add(finalmul s1);
        `;

        return expect(
            RainDocument.compileText(expression, ["exp2", "exp3"], metaStore),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 5);
            assert.deepEqual(response.constants, ["0x1", "0x2", "0x3", "0x5", "0x6"]);
            assert.equal(response.bytecode.length, 220);
        });
    });

    it("should successfully compile a decompiled expression", async () => {
        const expression = rainlang`@${deployer.bytecodeMetaHash}
        #exp1
        _ _ _ _: 0x01 0x02 0x01 int-add(constant<0>() constant<1>() constant<2>());

        #exp2
        _ _ _: 0x01 0x02 0x03;`;

        return expect(
            RainDocument.compileText(expression, ["exp1", "exp2"], metaStore),
        ).to.eventually.be.fulfilled.then((response: ExpressionConfig) => {
            assert.equal(response.constants.length, 3);
            assert.equal(response.bytecode.length, 108);
        });
    });

    it("should throw error for invalid rainlang fragment `#expression :int-add(10 20);`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression :int-add(10 20);`,
                    ["expression"],
                    metaStore,
                ),
            "StackOutputsMismatch",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment `,`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression ,`,
                    ["expression"],
                    metaStore,
                ),
            "invalid empty expression",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment ` `", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression  `,
                    ["expression"],
                    metaStore,
                ),
            "empty bindings are not allowed",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment `_`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _`,
                    ["expression"],
                    metaStore,
                ),
            "invalid expression",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment `_: int-add(10 20), _:`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(10 20), _:;`,
                    ["expression"],
                    metaStore,
                ),
            "NotAcceptingInputs",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment `// This is an invalid comment. _: int-add(10, 20), _:`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash}
                #expression
                // This is an invalid comment.
                _: int-add(10 20), _:;
                `,
                    ["expression"],
                    metaStore,
                ),
            "invalid LHS alias: //",
            "Invalid Error",
        );
    });

    it("should throw error for invalid rainlang fragment `_: int-add(10 20) block-timestamp();`", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(10 20) block-timestamp();`,
                    ["expression"],
                    metaStore,
                ),
            "ExcessRHSItems",
            "Invalid Error",
        );
    });

    it("should not accept negative numbers", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(-10 20);`,
                    ["expression"],
                    metaStore,
                ),
            "is not a valid rainlang word",
            "Invalid Error",
        );

        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: sub(123941 -123941);`,
                    ["expression"],
                    metaStore,
                ),
            "is not a valid rainlang word",
            "Invalid Error",
        );
    });

    it("should only accept ASCII characters", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(10𐐀 20);`,
                    ["expression"],
                    metaStore,
                ),
            "illegal character: 𐐀",
            "Invalid Error",
        );
    });

    it("should error if invalid operand brackets is provided", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: read-memory<10 1();`,
                    ["expression"],
                    metaStore,
                ),
            'expected \\">\\"',
            "Invalid Error",
        );
    });

    it("should error if invalid parenthesis is provided", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: read-memory<10 1>;`,
                    ["expression"],
                    metaStore,
                ),
            'expected \\"(\\"',
            "Invalid Error",
        );
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: read-memory<10 1>(;`,
                    ["expression"],
                    metaStore,
                ),
            'expected \\")\\"',
            "Invalid Error",
        );
    });

    it("should error if invalid word pattern is provided", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: <10 1>();`,
                    ["expression"],
                    metaStore,
                ),
            "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
            "Invalid Error",
        );
    });

    it("should error if invalid opcode is passed in the rainlang fragment", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: readmemory<10 1>();`,
                    ["expression"],
                    metaStore,
                ),
            "unknown",
            "Invalid Error",
        );
    });

    it("should error if operand arguments are missing in the rainlang fragment", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: constant();`,
                    ["expression"],
                    metaStore,
                ),
            "OutOfBoundsConstantRead",
            "Invalid Error",
        );

        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: constant<>();`,
                    ["expression"],
                    metaStore,
                ),
            "ExpectedOperand",
            "Invalid Error",
        );
    });

    it("should error if out-of-range operand arguments is provided", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: constant<1 2>();`,
                    ["expression"],
                    metaStore,
                ),
            "UnclosedOperand",
            "Invalid Error",
        );
    });

    it("should error if a word is undefined", async () => {
        await assertError(
            async () =>
                await RainDocument.compileText(
                    rainlang`@${deployer.bytecodeMetaHash} #expression _: int-add(ans 1);`,
                    ["expression"],
                    metaStore,
                ),
            "undefined word: ans",
            "Invalid Error",
        );
    });
});
