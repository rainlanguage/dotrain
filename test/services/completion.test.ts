import assert from "assert";
import { contractMetaHash, opMetaHash } from "../utils";
import { OpMeta, OpMetaSchema, metaFromBytes } from "@rainprotocol/meta";
import {
    Position,
    rainlang,
    MetaStore, 
    RainDocument, 
    TextDocument,
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
    if (expectedCompletions === null) {
        assert.ok(actualCompletions === null);
    }
    else {
        assert.ok(actualCompletions?.length == expectedCompletions?.length);
        expectedCompletions.forEach((item, i) => {
            assert.equal(actualCompletions[i].label, item.label);
            assert.equal(actualCompletions[i].kind, item.kind);
        });
    }
}

describe("Rainlang Code Completion Service Tests", async function () {
    const store = new MetaStore();
    let AllOpcodeCompletions: CompletionItem[];

    before(async () => {
        await store.updateStore(opMetaHash);
        await store.updateStore(contractMetaHash);
        const OpcodeMetas = metaFromBytes(
            store.getOpMeta(opMetaHash)!, 
            OpMetaSchema
        ) as OpMeta[];
        AllOpcodeCompletions = OpcodeMetas.map(v => {
            return {
                label: v.name,
                kind: CompletionItemKind.Function,
            };
        });
        OpcodeMetas.forEach(v => v.aliases?.forEach(e => {
            AllOpcodeCompletions.push({
                label: e,
                kind: CompletionItemKind.Function,
            });
        }));
    });

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        const _rd = await RainDocument.create(
            TextDocument.create("file", "rainlang", 0, rainlang`@${opMetaHash} #exp _: `), 
            store
        );
        Object.keys(_rd.constants).forEach(v => {
            _allCompletions.unshift({
                label: v,
                kind: CompletionItemKind.Constant,
            });
        });
        await testCompletion(
            rainlang`@${opMetaHash} _: `, 
            Position.create(0, 76),
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
        const _rd = await RainDocument.create(
            TextDocument.create("file", "rainlang", 0, rainlang`@${opMetaHash} name: n`), 
            store
        );
        Object.keys(_rd.constants).forEach(v => {
            _allCompletions.unshift({
                label: v,
                kind: CompletionItemKind.Constant,
            });
        });
        await testCompletion(
            rainlang`@${opMetaHash} #exp name: n`,  
            Position.create(0, 80),
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
                label: "counterparty",
                kind: CompletionItemKind.Function
            }],
            { metaStore: store }
        );
    });
});