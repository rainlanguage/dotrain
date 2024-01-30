import * as chai from "chai";
import * as assert from "assert";
import * as chaiAsPromised from "chai-as-promised";
import { assertError } from "./utils";
import { MetaStore, RainDocument, rainlang } from "../dist/cjs";

chai.use(chaiAsPromised);
const expect: Chai.ExpectStatic = chai.expect;

const ws = "                                                                   ";
describe("RainDocument Compiler Tests", async function () {
    const metaStore = new MetaStore();

    it("should accept valid rainlang fragment `:;`", async () => {
        return expect(
            RainDocument.composeText(rainlang`${ws} #expression :;`, ["expression"], metaStore),
        ).to.be.fulfilled.then((response: string) => {
            assert.equal(response, ":;");
        });
    });

    it("should accept valid rainlang fragment `/* this is a comment */ :;`", async () => {
        return expect(
            RainDocument.composeText(
                rainlang`${ws}
        /* this is a comment */
        #expression
        :;`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(response, ":;");
        });
    });

    it("should accept valid rainlang fragment `#exp1 :; #exp2 :;`", async () => {
        return expect(
            RainDocument.composeText(
                rainlang`${ws}
        #exp1
        :;
        #exp2
        :;`,
                ["exp1", "exp2"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(response, ":;\n\n:;");
        });
    });

    it("should accept valid rainlang fragment `#expression _:int-add(10 20);`", async () => {
        return expect(
            RainDocument.composeText(
                rainlang`${ws} #expression _:int-add(10 20);`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(response, "_:int-add(10 20);");
        });
    });

    it("should accept valid rainlang fragment `_: int-add(10 20), _: block-timestamp();`", async () => {
        return expect(
            RainDocument.composeText(
                rainlang`${ws} #expression _: int-add(10 20), _: block-timestamp();`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(response, "_: int-add(10 20), _: block-timestamp();");
        });
    });

    it("should accept valid rainlang fragment `#expression _ _: int-add(10 20) block-timestamp();`", async () => {
        return expect(
            RainDocument.composeText(
                rainlang`${ws} #expression _ _: int-add(10 20) block-timestamp();`,
                ["expression"],
                metaStore,
            ),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(response, "_ _: int-add(10 20) block-timestamp();");
        });
    });

    it("should successfully compile an expression having multiple outputs", async () => {
        const expression = rainlang`${ws}
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
            RainDocument.composeText(expression, ["exp1", "exp2", "exp3", "exp4"], metaStore),
        ).to.eventually.be.fulfilled.then((response: string) => {
            assert.equal(
                response,
                `c0: 1,
            c1: 2,
            condition: 1;

s0 s1: 1 2,
            o0 o1: 1 2,
            condition: 3;

s0: 1,
            _: less-than(s0 3);

s0 s1: 1 2,
            _: int-add(s0 4),
            _: int-add(s1 5);`,
            );
        });
    });

    it("should throw error for invalid rainlang fragment `,`", async () => {
        await assertError(
            async () =>
                await RainDocument.composeText(
                    rainlang`${ws} #expression ,`,
                    ["expression"],
                    metaStore,
                ),
            "invalid empty expression",
            "Invalid Error",
        );
    });

    it("should only accept ASCII characters", async () => {
        await assertError(
            async () =>
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: int-add(10𐐀 20);`,
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
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: read-memory<10 1();`,
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
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: read-memory<10 1>;`,
                    ["expression"],
                    metaStore,
                ),
            'expected \\"(\\"',
            "Invalid Error",
        );
        await assertError(
            async () =>
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: read-memory<10 1>(;`,
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
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: <10 1>();`,
                    ["expression"],
                    metaStore,
                ),
            "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
            "Invalid Error",
        );
    });

    it("should error if a word is undefined", async () => {
        await assertError(
            async () =>
                await RainDocument.composeText(
                    rainlang`${ws} #expression _: int-add(ans 1);`,
                    ["expression"],
                    metaStore,
                ),
            "undefined word: ans",
            "Invalid Error",
        );
    });
});
