import { deployerAddress } from "../utils";
import {
    rainlang,
    TextDocument,
    getOpMetaFromSg,
    getLanguageService,
    Position,
    LanguageServiceParams,
    MarkupContent,
    MarkedString
} from "../../src";
import assert from "assert";


function testHover(
    text: string, position: Position, opmeta: Uint8Array | string,
    serviceParams?: LanguageServiceParams
): MarkupContent | MarkedString | MarkedString[] | undefined {
    const langServices = getLanguageService(serviceParams);
    // console.log((langServices.doHover(
    //     TextDocument.create("file", "rainlang", 1, text), position, opmeta
    // ))?.contents);
    return (langServices.doHover(
        TextDocument.create("file", "rainlang", 1, text), position, opmeta
    ))?.contents;
}

describe("Rainlang Hover Service tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("simple rainlang script", async () => {

        const expression = rainlang`
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

        assert.deepEqual(
            testHover(
                expression,
                Position.create(1, 1),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "alias for: 0xc5a65bb3dc9abdd9c751e2fb0fb0ccc8929e1f040a273ce685f88ac4385396c8",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(2, 52),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "Value",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(4, 5),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "alias for: context<3 4>()",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(6, 37),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "Takes some items from the stack and runs a source with sub-stack and puts the results back to the stack",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(8, 20),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "Read a key/value pair from contract storage by providing the key and stack the value",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(13, 10),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "alias for: batch-start-info-k",
            }
        );

        assert.deepEqual(
            testHover(
                expression,
                Position.create(20, 6),
                opMeta,
            ),
            undefined
        );
        assert.deepEqual(
            testHover(
                expression,
                Position.create(29, 21),
                opMeta,
            ),
            {
                kind: "plaintext",
                value: "Subtracts N values. Values can be either decimal or integer, but not a mix of both.",
            }
        );
    });

});