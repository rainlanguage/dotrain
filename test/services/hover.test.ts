import assert from "assert";
import { opMetaHash, toRange } from "../utils";
import {
    Hover, 
    Position,
    rainlang,
    MetaStore, 
    TextDocument,
    LanguageServiceParams, 
    getRainLanguageServices 
} from "../../src";


async function testHover(
    text: string, 
    position: Position, 
    serviceParams?: LanguageServiceParams
): Promise<Hover | null> {
    const langServices = getRainLanguageServices(serviceParams);
    return await (langServices.doHover(
        TextDocument.create("file", "rainlang", 1, text), 
        position
    ));
}

describe("Rainlang Hover Service Tests", async function () {
    let expression: string;
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash);
        expression = rainlang`@${opMetaHash} 
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
                Position.create(1, 1),
                { metaStore: store },
            ),
            {
                range: toRange(1, 0, 1, 12),
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
                Position.create(2, 52),
                { metaStore: store },
            ),
            {
                range: toRange(2, 20, 2, 86),
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
                Position.create(4, 5),
                { metaStore: store },
            ),
            {
                range: toRange(4, 0, 4, 16),
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
                Position.create(6, 37),
                { metaStore: store },
            ),
            {
                range: toRange(6, 34, 6, 103),
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
                Position.create(8, 20),
                { metaStore: store },
            ),
            {
                range: toRange(8, 18, 8, 41),
                contents: {
                    kind: "plaintext",
                    value: "Read a key/value pair from contract storage by providing the key and stack the value"
                }
            }
        );
    });

    it("should provide hover: \"alias for\" an alias", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(13, 10),
                { metaStore: store },
            ),
            {
                range: toRange(13, 0, 13, 18),
                contents: {
                    kind: "plaintext",
                    value: "alias for: batch-start-info-k"
                }
            }
        );
    });

    it("should not provide hover", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(20, 6),
                { metaStore: store },
            ),
            undefined
        );
    });

    it("should provide hover: description of an opcode", async () => {    
        assert.deepEqual(
            await testHover(
                expression,
                Position.create(29, 21),
                { metaStore: store },
            ),
            {
                range: toRange(25, 21, 29, 22),
                contents: {
                    kind: "plaintext",
                    value: "Subtracts N values. Values can be either decimal or integer, but not a mix of both."
                }
            }
        );
    });

});