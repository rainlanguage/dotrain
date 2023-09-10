import assert from "assert";
import { METAS } from "../fixtures/opmeta";
import { contractMetaHash, opMetaHash, toRange } from "../utils";
import {
    Hover, 
    getHover, 
    Position,
    rainlang,
    MetaStore, 
    TextDocument,
    LanguageServiceParams 
} from "../../src";


async function testHover(
    text: string, 
    position: Position, 
    serviceParams?: LanguageServiceParams
): Promise<Hover | null> {
    return await (getHover(
        TextDocument.create("hover.test.rain", "rainlang", 1, text), 
        position,
        serviceParams
    ));
}

describe("LSP Hover Language Service Tests", async function () {
    let expression: string;
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash, METAS.validOpMeta.metaBytes);
        await store.updateStore(contractMetaHash, METAS.validContractMeta.metaBytes);
        expression = rainlang`@${opMetaHash} @${contractMetaHash}
#exp1
total-sent-k: 0xc5a65bb3dc9abdd9c751e2fb0fb0ccc8929e1f040a273ce685f88ac4385396c8,
batch-start-info-k: 0xac62de4eba19d5b81f845e169c63b25688d494f595bb85367ef190897e811aa9,

out-token-amount: context<3 4>(),
out-token-decimals: context<3 1>(),
new-total-sent new-batch-index _: call<2 3>(scale-18-dynamic<1 1>(out-token-decimals out-token-amount)),

batch-start-info: get(batch-start-info-k),
batch-start-index: decode-256<0 31>(batch-start-info),
batch-start-time: decode-256<32 63>(batch-start-info),

:set(
batch-start-info-k
if(
    gt(new-batch-index batch-start-index)
    encode-256<32 63>(now() encode-256<0 31>(new-batch-index 0))
    batch-start-info)),
:set(total-sent-k new-total-sent);

#exp2
new-sent:,
total-sent-k: 0xc5a65bb3dc9abdd9c751e2fb0fb0ccc8929e1f040a273ce685f88ac4385396c8,
amount-per-batch: 1000e18,
new-total-amount-sent: add(get(total-sent-k) new-sent),
new-batch-index: div(new-total-amount-sent amount-per-batch),
new-batch-remaining: sub(
mul(
    add(new-batch-index 1)
    amount-per-batch)
new-total-amount-sent);
`;
    });

    it("should provide hover: \"alias for\" a value", async () => {
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(2, 1),
                { metaStore: store },
            ),
            {
                range: toRange(2, 0, 2, 12),
                contents: {
                    kind: "plaintext",
                    value: "alias for: 0xc5a65bb3dc9abdd9c751e2fb0fb0ccc8929e1f040a273ce685f88ac4385396c8",
                }
            }
        );
    });

    it("should provide hover: \"Value\"", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(3, 52),
                { metaStore: store },
            ),
            {
                range: toRange(3, 20, 3, 86),
                contents: {
                    kind: "plaintext",
                    value: "Value"
                }
            }
        );
    });

    it("should provide hover: \"alias for\" a opcode", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(5, 5),
                { metaStore: store },
            ),
            {
                range: toRange(5, 0, 5, 16),
                contents: {
                    kind: "plaintext",
                    value: "alias for: context<3 4>()"
                }
            }
        );
    });

    it("should provide hover: dexcription of an opcode", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(7, 37),
                { metaStore: store },
            ),
            {
                range: toRange(7, 34, 7, 103),
                contents: {
                    kind: "plaintext",
                    value: "Takes some items from the stack and runs a source with sub-stack and puts the results back to the stack"
                }
            }
        );
    });

    it("should provide hover: description of an opcode", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(9, 20),
                { metaStore: store },
            ),
            {
                range: toRange(9, 18, 9, 41),
                contents: {
                    kind: "plaintext",
                    value: "Read a key/value pair from contract storage by providing the key and stack the value"
                }
            }
        );
    });

    it("should provide hover: alias", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(14, 10),
                { metaStore: store },
            ),
            {
                range: toRange(14, 0, 14, 18),
                contents: {
                    kind: "plaintext",
                    value: "Stack Alias"
                }
            }
        );
    });

    it("should not provide hover", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(22, 6),
                { metaStore: store },
            ),
            undefined
        );
    });

    it("should provide hover: description of an opcode", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(31, 21),
                { metaStore: store },
            ),
            {
                range: toRange(27, 21, 31, 22),
                contents: {
                    kind: "plaintext",
                    value: "Subtracts N values. Values can be either decimal or integer, but not a mix of both."
                }
            }
        );
    });

    it("should provide hover: op meta info", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(0, 5),
                { metaStore: store },
            ),
            {
                range: toRange(0, 0, 0, 68),
                contents: {
                    kind: "plaintext",
                    value: "this import contains: -OpMeta"
                }
            }
        );
    });

    it("should provide hover: contract meta info", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(0, 88),
                { metaStore: store },
            ),
            {
                range: toRange(0, 68, 1, 0),
                contents: {
                    kind: "plaintext",
                    value: "this import contains: -ContractMeta"
                }
            }
        );
    });

    it("should provide hover: operand argument info", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(5, 26),
                { metaStore: store },
            ),
            {
                range: toRange(5, 26, 5, 27),
                contents: {
                    kind: "plaintext",
                    value: [
                        "column",
                        "Operand Argument"
                    ].join(", ")
                }
            }
        );
    });

    it("should provide hover: operand argument info", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(7, 39),
                { metaStore: store },
            ),
            {
                range: toRange(7, 39, 7, 40),
                contents: {
                    kind: "plaintext",
                    value: [
                        "source-index",
                        "index of the source to run"
                    ].join(", ")
                }
            }
        );
    });
});