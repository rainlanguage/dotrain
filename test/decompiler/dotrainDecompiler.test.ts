import { METAS } from "../fixtures/opmeta";
import assert, { AssertionError } from "assert";
import { assertError, opMetaHash } from "../utils";
import { ExpressionConfig, rainlang, hexlify, dotraind, dotrainc, MetaStore } from "../../src";


async function testDotrainDecompiler(
    expression: string, 
    expectedExpression: string, 
    metaHash: string, 
    metaStore: MetaStore, 
    expKeys: string[]
) {
    const expressionConfig = await dotrainc(expression, expKeys, metaStore);
    const decompiledText = (await dotraind(
        expressionConfig, 
        metaHash,
        metaStore
    )).textDocument.getText();
    // Passing decompiled text to compiler again to check for errors
    try {
        const generatedExpKeys: string[] = [];
        for (let i = 0; i < expKeys.length; i++) {
            generatedExpKeys.push("expression-" + (i + 1).toString());
        }
        const recompiledExpression = await dotrainc(
            decompiledText,
            generatedExpKeys, 
            metaStore
        );
        assert.deepEqual(recompiledExpression.sources, expressionConfig.sources);
    }
    catch (e) {
        if (e instanceof AssertionError)
            throw new Error(JSON.stringify(e, null, 2));
        else
            throw new Error(
                `Failed to compile the decompiled text:\n\ndecompiledText = ${
                    decompiledText
                }\n\nError: ${
                    JSON.stringify(e, null, 2)
                }`
            );
    }
    assert.equal(
        decompiledText, 
        expectedExpression, 
        `\nExpected: ${expectedExpression}\nActual: ${decompiledText}`
    );
}

describe("RainDocument Decompiler (dotraind) Tests", async function () {
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash, METAS.validOpMeta.metaBytes);
    });

    it("should fail if an invalid bytes opmeta is specified", async () => {

        const expression = rainlang`@${opMetaHash} #expression _: add(0x0a 0x14);`;
        const expressionConfig = await dotrainc(expression, ["expression"], store);
        await assertError(
            async () =>
                await dotraind(expressionConfig, METAS.invalid_bytes, store),
            "invalid meta hash, must be in hex string",
            "Invalid Error"
        );
    });

    it("should decompile a valid expressionConfig", async () => {
        const expression = rainlang`@${opMetaHash}
#expression-1
_ : add(0x0a 0x14);`;
        await testDotrainDecompiler(expression, expression, opMetaHash, store, ["expression-1"]);
    });

    it("should decompile an expression referencing top stack items", async () => {
        const expression0 = rainlang`@${opMetaHash} #expression a: 10, b: 20, c: b;`;
        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ _ : 0x0a 0x14 read-memory<1 0>();`;
        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["expression"]);

        const expression1 = rainlang`@${opMetaHash} 
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

        const expectedExpression1 = rainlang`@${opMetaHash}
#expression-1
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ : max-uint256 max-uint256 context<0 0>() 0x0a 0x14 read-memory<0 0>() read-memory<0 0>() read-memory<0 0>() read-memory<0 0>() read-memory<1 0>() read-memory<2 0>() read-memory<4 0>() read-memory<1 0>() read-memory<2 0>() read-memory<3 0>();`;

        await testDotrainDecompiler(expression1, expectedExpression1, opMetaHash, store, ["expression"]);

    });

    it("should decompile an expression with do-while opcode having multiple outputs", async () => {
        const expression0 = rainlang`@${opMetaHash} 
            #exp1
            c0: 1,
            c1: 2,
            condition: 1, 
            _ _: do-while<1>(c0 c1 condition);
            
            #exp2
            s0 s1: ,
            o0 o1: 1 2,
            condition: 3; 
    
            #exp3
            s0: ,
            _: less-than(s0 3);
    
            #exp4
            s0 s1: ,
            _: add(s0 4),
            _: add(s1 5);
        `;

        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ _ _ _ : 0x01 0x02 0x01 do-while<1>(read-memory<0 0>() read-memory<1 0>() read-memory<2 0>());

#expression-2
_ _ _ : 0x01 0x02 0x03;

#expression-3
_ : less-than(read-memory<0 0>() 0x03);

#expression-4
_ _ : add(read-memory<0 0>() 0x04) add(read-memory<1 0>() 0x05);`;

        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["exp1", "exp2", "exp3", "exp4"]);
    });

    it("should decompile an expression with loop-n opcode having multiple outputs", async () => {
        const expression0 = rainlang`@${opMetaHash} 
        #exp1
        _ loopoutput _: loop-n<1 1 3>(
            2
            3
            4
        ),
        _ _ _ _ _ _ _ _: explode-32(loopoutput);
       
        #exp2
        s0 s1 s2: ,
        increment: add(s0 5),

        shrval: call<3 1>(increment s1 s2),
        
        lvldcr: saturating-sub(s2 1);
        
        #exp3
        s0 s1 s2: ,
        levelmul: mul(6 s2),
        levelexp: exp(2 levelmul),
        finalmul: mul(levelexp s0),

        op: add(finalmul s1);
        `;

        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ _ _ _ _ _ _ _ _ _ : loop-n<1 1 3>(0x02 0x03 0x04) explode-32(read-memory<1 0>());

#expression-2
_ _ _ : add(read-memory<0 0>() 0x05) call<3 1>(read-memory<3 0>() read-memory<1 0>() read-memory<2 0>()) saturating-sub(read-memory<2 0>() 0x01);

#expression-3
_ _ _ _ : mul(0x06 read-memory<2 0>()) exp(0x02 read-memory<3 0>()) mul(read-memory<4 0>() read-memory<0 0>()) add(read-memory<5 0>() read-memory<1 0>());`;

        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["exp1", "exp2", "exp3"]);
    });

    it("should decompile an expression with call opcode having multiple outputs", async () => {
        const expression0 = rainlang`@${opMetaHash} 
            /* main source */
            #expression
            _ _ _: call<1 3>(2 2);
        `;

        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ _ : call<1 3>(0x02 0x02);`;

        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["expression"]);
    });

    it("should decompile an expression with an opcode having multiple outputs", async () => {
        const expression0 = rainlang`@${opMetaHash}  
            #expression       
            _ _: erc-1155-balance-of-batch(
                0x01
                0x02
                0x03
                0x02
                0x03
            );
        `;

        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ : erc-1155-balance-of-batch(0x01 0x02 0x03 0x02 0x03);`;

        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["expression"]);
    });

    it("should decompile an expression with fold-context opcode having multiple outputs", async () => {
        const expression0 = rainlang`@${opMetaHash}  
            #expression       
           _ _: fold-context<2 3 1 0>(0 0);
        `;

        const expectedExpression0 = rainlang`@${opMetaHash}
#expression-1
_ _ : fold-context<2 3 1 0>(0x00 0x00);`;

        await testDotrainDecompiler(expression0, expectedExpression0, opMetaHash, store, ["expression"]);
    });

    it("should decompile an expression with existing stack items", async () => {
        const expression = rainlang`@${opMetaHash} #expression a:, b: 20, c: add(a b);`;

        const expectedText = rainlang`@${opMetaHash}
#expression-1
_ _ : 0x14 add(read-memory<0 0>() read-memory<1 0>());`;
        
        await testDotrainDecompiler(expression, expectedText, opMetaHash, store, ["expression"]);
    });

    it("should fail if an opcode is not found in opmeta", async () => {
        // Contains an invalid opcode with enum 1337
        const expressionConfig: ExpressionConfig = {
            sources: [hexlify([0, 13, 0, 3, 0, 77, 0, 144, 5, 57, 0, 0])],
            constants: [10, 20]
        };
        await assertError(
            async () =>
                await dotraind(expressionConfig, opMetaHash, store),
            "opcode with enum \\\"1337\\\" does not exist on OpMeta",
            "Invalid Error"
        );
    });

});
