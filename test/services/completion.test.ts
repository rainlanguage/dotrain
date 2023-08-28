import assert from "assert";
import { METAS } from "../fixtures/opmeta";
import { contractMetaHash, opMetaHash } from "../utils";
import { metaFromBytes, MAGIC_NUMBERS, toOpMeta } from "@rainprotocol/meta";
import {
    Position,
    rainlang,
    MetaStore, 
    TextDocument,
    RainDocument, 
    CompletionItem,
    CompletionItemKind, 
    LanguageServiceParams, 
    getRainLanguageServices,
} from "../../src";


async function testCompletion(
    text: string, 
    position: Position, 
    expectedCompletions: CompletionItem[] | null,
    serviceParams?: LanguageServiceParams
) {
    const actualCompletions = await getRainLanguageServices(serviceParams).doComplete(
        TextDocument.create("file", "rainlang", 1, text), 
        position
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
    const store = new MetaStore();
    let AllOpcodeCompletions: CompletionItem[];

    before(async () => {
        await store.updateStore(opMetaHash, METAS.validOpMeta.metaBytes);
        await store.updateStore(contractMetaHash, METAS.validContractMeta.metaBytes);
        const OpcodeMetas = toOpMeta(metaFromBytes(
            store.getRecord(opMetaHash)!.sequence.find(
                v => v.magicNumber === MAGIC_NUMBERS.OPS_META_V1
            )!.content
        ));
        AllOpcodeCompletions = OpcodeMetas.flatMap(v => {
            return [
                {
                    label: v.name,
                    kind: CompletionItemKind.Function,
                },
                ...(
                    v.aliases ? v.aliases.map(e => {
                        return {
                            label: e,
                            kind: CompletionItemKind.Function
                        };
                    })
                    : []
                )
            ];
        });
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
            rainlang`@${opMetaHash} #expression _: `, 
            Position.create(0, 89),
            _allCompletions,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions based on trailing characters", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} #exp _: ad`,  
            Position.create(0, 78),
            AllOpcodeCompletions.filter(v => v.label.includes("ad")),
            { metaStore: store }
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} #exp _: add`,  
            Position.create(0, 10),
            null,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions if leading character is non-word", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} #exp _: add(1 2)`,  
            Position.create(0, 79),
            AllOpcodeCompletions.filter(v => v.label.includes("add")),
            { metaStore: store }
        );
    });

    it("should include lhs alias in suggestions", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        await testCompletion(
            rainlang`@${opMetaHash} #expr name: n`,  
            Position.create(0, 81),
            [
                {
                    label: "name",
                    kind: CompletionItemKind.Variable
                },
                ..._allCompletions.filter(v => v.label.includes("n"))
            ],
            { metaStore: store }
        );
    });

    it("should include contract context in suggestions", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} @${contractMetaHash} 
            #exp 
            _: counterpa`,  
            Position.create(2, 24),
            [{
                label: "counterparty-address",
                kind: CompletionItemKind.Function
            }],
            { metaStore: store }
        );
    });
    it("should include root namespaces items in suggestions", async () => {
        const _expression = rainlang`@${opMetaHash}
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
        const _expression = rainlang`@${opMetaHash}
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
            }).filter(v => v.label !== "Words").filter(v => v.label.includes("r")),
            { metaStore: store }
        );
    });
});
