import assert from "assert";
import METAS from "../fixtures/meta.json";
import { Meta } from "@rainprotocol/meta";
import { contractMetaHash, deployerHash } from "../utils";
import {
    Position,
    rainlang,
    TextDocument,
    RainDocument, 
    getCompletion,
    CompletionItem,
    CompletionItemKind, 
    LanguageServiceParams, 
} from "../../src";


async function testCompletion(
    text: string, 
    position: Position, 
    expectedCompletions: CompletionItem[] | null,
    serviceParams?: LanguageServiceParams
) {
    const actualCompletions = await getCompletion(
        TextDocument.create("completion.test.rain", "rainlang", 1, text), 
        position,
        serviceParams
    );
    if (expectedCompletions === null) assert.ok(actualCompletions === null);
    else {
        assert.ok(actualCompletions?.length == expectedCompletions?.length);
        expectedCompletions.forEach((item, i) => {
            assert.equal(actualCompletions[i].label, item.label);
            assert.equal(actualCompletions[i].kind, item.kind);
        });
    }
}

describe("LSP Code Completion Language Service Tests", async function () {
    const store = new Meta.Store();
    let AllOpcodeCompletions: CompletionItem[];

    before(async () => {
        const kv = Object.entries(METAS);
        for (let i = 0; i < kv.length; i++) {
            await store.update(kv[i][0], kv[i][1]);
        }

        const AuthoringMeta = Meta.Authoring.abiDecode(
            Object.values(store.getAuthoringMetaCache())[0]
        );

        AllOpcodeCompletions = AuthoringMeta.flatMap(v => ({
            label: v.word,
            kind: CompletionItemKind.Function,
        }));
        ["infinity", "max-uint256" ,"max-uint-256"].forEach(v => AllOpcodeCompletions.unshift({
            label: v,
            kind: CompletionItemKind.Constant
        }));
    });

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "expression",
            kind: CompletionItemKind.Class
        });
        await testCompletion(
            rainlang`@${deployerHash} #expression _: `, 
            Position.create(0, 89),
            _allCompletions,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions based on trailing characters", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "exp",
            kind: CompletionItemKind.Class
        });
        await testCompletion(
            rainlang`@${deployerHash} #exp _: int-ad`,  
            Position.create(0, 82),
            _allCompletions,
            { metaStore: store }
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(
            rainlang`@${deployerHash} #exp _: add`,  
            Position.create(0, 10),
            null,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions if leading character is non-word", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "exp",
            kind: CompletionItemKind.Class
        });
        await testCompletion(
            rainlang`@${deployerHash} #exp _: add(1 2)`,  
            Position.create(0, 79),
            _allCompletions,
            { metaStore: store }
        );
    });

    it("should include lhs alias in suggestions", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        await testCompletion(
            rainlang`@${deployerHash} #exp name: n`,  
            Position.create(0, 80),
            [
                {
                    label: "name",
                    kind: CompletionItemKind.Variable
                },
                {
                    label: "exp",
                    kind: CompletionItemKind.Class
                },
                ..._allCompletions
            ],
            { metaStore: store }
        );
    });

    it("should include contract context in suggestions", async () => {
        const contractMetas = [
            "vault-output-balance-decrease",
            "vault-output-balance-before",
            "vault-output-id",
            "vault-output-token-decimals",
            "vault-output-token-address",
            "vault-outputs",
            "vault-input-balance-increase",
            "vault-input-balance-before",
            "vault-input-id",
            "vault-input-token-decimals",
            "vault-input-token-address",
            "vault-inputs",
            "order-io-ratio",
            "order-output-max",
            "calculations",
            "counterparty-address",
            "order-owner-address",
            "order-hash",
            "calling-context",
            "orderbook-contract-address",
            "orderbook-caller-address",
            "base"
        ];
        const _allCompletions = [...AllOpcodeCompletions];
        contractMetas.reverse().forEach(v => _allCompletions.unshift({
            label: v,
            kind: CompletionItemKind.Function
        }));
        await testCompletion(
            rainlang`@${deployerHash} @${contractMetaHash} 
            #exp 
            _: counterpa`,  
            Position.create(2, 24),
            [
                {
                    label: "exp",
                    kind: CompletionItemKind.Class
                },
                ..._allCompletions
            ],
            { metaStore: store }
        );
    });
    it("should include root namespaces items in suggestions", async () => {
        const _expression = rainlang`@${deployerHash}
#row
1

#main
_: .`;
        const _dotrain = await RainDocument.create(_expression, store);
        const _ns = _dotrain.namespace;
        await testCompletion(
            _expression,  
            Position.create(5, 4),
            Object.entries(_ns).map(v => {
                return {
                    label: v[0],
                    kind: !("Element" in v[1]) 
                        ? CompletionItemKind.Field 
                        : "content" in v[1].Element 
                            ? CompletionItemKind.Class 
                            : CompletionItemKind.Function
                };
            }).filter(v => v.label !== "Words"),
            { metaStore: store }
        );
    });

    it("should include correct namespaces items in suggestions", async () => {
        const _expression = rainlang`@${deployerHash}
#row
1

#main
_: .r`;
        const _dotrain = await RainDocument.create(_expression, store);
        const _ns = _dotrain.namespace;
        await testCompletion(
            _expression,  
            Position.create(5, 5),
            Object.entries(_ns).map(v => {
                return {
                    label: v[0],
                    kind: !("Element" in v[1]) 
                        ? CompletionItemKind.Field 
                        : "content" in v[1].Element 
                            ? CompletionItemKind.Class 
                            : CompletionItemKind.Function
                };
            }).filter(v => v.label !== "Words"),
            { metaStore: store }
        );
    });
});
