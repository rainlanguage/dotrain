import assert from "assert";
import { deployerAddress } from "../utils";
import {
    OpMeta,
    Position,
    rainlang,
    OpMetaSchema,
    TextDocument,
    metaFromBytes, 
    CompletionItem,
    getOpMetaFromSg, 
    CompletionItemKind, 
    getLanguageService,
    LanguageServiceParams 
} from "../../src";


async function testCompletion(
    text: string, 
    opmeta: Uint8Array | string,
    position: Position, 
    expectedCompletions: CompletionItem[] | null,
    serviceParams?: LanguageServiceParams
) {
    const actualCompletions = getLanguageService(serviceParams).doComplete(
        TextDocument.create("file", "rainlang", 1, text), 
        position, 
        opmeta
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
    let opMeta: string;
    let AllOpcodeCompletions: CompletionItem[];

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
        const OpcodeMetas = metaFromBytes(opMeta, OpMetaSchema) as OpMeta[];
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
            rainlang``, 
            opMeta, 
            Position.create(0, 0),
            null
        );
    });

    it("should provide no suggestions for lhs", async () => {
        await testCompletion(
            rainlang`_ name`, 
            opMeta, 
            Position.create(0, 6),
            null
        );
    });

    it("should provide no suggestions for lhs", async () => {
        await testCompletion(
            rainlang`_: ad`, 
            opMeta, 
            Position.create(0, 1),
            null
        );
    });

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        await testCompletion(
            rainlang`_: `, 
            opMeta, 
            Position.create(0, 3),
            AllOpcodeCompletions
        );
    });

    it("should provide correct suggestions based on previous word", async () => {
        await testCompletion(
            rainlang`_: ad`, 
            opMeta, 
            Position.create(0, 5),
            AllOpcodeCompletions.filter(v => v.label.includes("ad"))
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(
            rainlang`_: add`, 
            opMeta, 
            Position.create(0, 5),
            null
        );
    });

    it("should provide correct suggestions if ahead character is non-word", async () => {
        await testCompletion(
            rainlang`_: add(1 2)`, 
            opMeta, 
            Position.create(0, 6),
            AllOpcodeCompletions.filter(v => v.label.includes("add"))
        );
    });

    it("should include lhs alias in suggestions", async () => {
        await testCompletion(
            rainlang`name: `, 
            opMeta, 
            Position.create(0, 6),
            [
                {
                    label: "name",
                    kind: CompletionItemKind.Variable
                },
                ...AllOpcodeCompletions
            ]
        );
    });
});