import * as assert from "assert";
import { toRange } from "./utils";
import { MetaStore, RainLanguageServices, rainlang } from "../dist/cjs";
import { Hover, Position, TextDocumentItem } from "vscode-languageserver-types";

const ws = " ".repeat(67);
async function testHover(
    text: string,
    position: Position,
    services: RainLanguageServices,
): Promise<Hover | null> {
    return services.doHover(
        TextDocumentItem.create("file:///hover.test.rain", "rainlang", 1, text),
        position,
    );
}

describe("LSP Hover Language Service Tests", async function () {
    const store = new MetaStore();

    const services = new RainLanguageServices(store);
    const expression = rainlang`${ws} ${ws}
#exp1
total-sent-k: 0xc5a65bb3dc9abdd9c751e2fb0fb0ccc8929e1f040a273ce685f88ac4385396c8,
batch-start-info-k: 0xac62de4eba19d5b81f845e169c63b25688d494f595bb85367ef190897e811aa9,

out-token-amount: context<3 4>(),
out-token-decimals: context<3 1>(),
new-total-sent new-batch-index _: int-add<2 3>(scale-18-dynamic<1 1>(out-token-decimals out-token-amount)),

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
new-batch-remaining: int-sub(
mul(
    add(new-batch-index 1)
    amount-per-batch)
new-total-amount-sent);
`;

    it('should provide hover: "alias for" a value', async () => {
        assert.deepEqual(await testHover(expression, Position.create(2, 3), services), {
            range: toRange(2, 0, 2, 12),
            contents: {
                kind: "plaintext",
                value: "Stack Alias",
            },
        });
    });

    it('should provide hover: "value"', async () => {
        assert.deepEqual(await testHover(expression, Position.create(3, 52), services), {
            range: toRange(3, 20, 3, 86),
            contents: {
                kind: "plaintext",
                value: "value",
            },
        });
    });

    it('should provide hover: "Stack Alias" a opcode', async () => {
        assert.deepEqual(await testHover(expression, Position.create(5, 5), services), {
            range: toRange(5, 0, 5, 16),
            contents: {
                kind: "plaintext",
                value: "Stack Alias",
            },
        });
    });

    it("should provide hover: alias", async () => {
        assert.deepEqual(await testHover(expression, Position.create(14, 10), services), {
            range: toRange(14, 0, 14, 18),
            contents: {
                kind: "plaintext",
                value: "Stack Alias",
            },
        });
    });

    it("should provide hover: operand argument info", async () => {
        assert.deepEqual(await testHover(expression, Position.create(5, 26), services), {
            range: toRange(5, 26, 5, 27),
            contents: {
                kind: "plaintext",
                value: "operand arg",
            },
        });
    });
});
