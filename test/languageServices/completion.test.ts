import assert from "assert";
import { opMetaHash } from "../utils";
import { OpMeta, OpMetaSchema, metaFromBytes } from "@rainprotocol/meta";
import {
    Position,
    rainlang,
    MetaStore, 
    TextDocument,
    CompletionItem,
    CompletionItemKind, 
    getLanguageService,
    LanguageServiceParams 
} from "../../src";


async function testCompletion(
    text: string, 
    position: Position, 
    expectedCompletions: CompletionItem[] | null,
    serviceParams?: LanguageServiceParams
) {
    const actualCompletions = await getLanguageService(serviceParams).doComplete(
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

    it("should provide no suggestions for lhs", async () => {
        await testCompletion(
            rainlang`@${opMetaHash}`, 
            Position.create(0, 0),
            null,
            { metaStore: store }
        );
    });

    it("should provide no suggestions for lhs", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _ name`,  
            Position.create(0, 6),
            null,
            { metaStore: store }
        );
    });

    it("should provide no suggestions for lhs", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _: ad`,  
            Position.create(0, 1),
            null,
            { metaStore: store }
        );
    });

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _: `,  
            Position.create(0, 71),
            AllOpcodeCompletions,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions based on trailing characters", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _: ad`,  
            Position.create(0, 73),
            AllOpcodeCompletions.filter(v => v.label.includes("ad")),
            { metaStore: store }
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _: add`,  
            Position.create(0, 5),
            null,
            { metaStore: store }
        );
    });

    it("should provide correct suggestions if leading character is non-word", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} _: add(1 2)`,  
            Position.create(0, 74),
            AllOpcodeCompletions.filter(v => v.label.includes("add")),
            { metaStore: store }
        );
    });

    it("should include lhs alias in suggestions", async () => {
        await testCompletion(
            rainlang`@${opMetaHash} name: `,  
            Position.create(0, 74),
            [
                {
                    label: "name",
                    kind: CompletionItemKind.Variable
                },
                ...AllOpcodeCompletions
            ],
            { metaStore: store }
        );
    });
});