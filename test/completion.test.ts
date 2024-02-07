import * as assert from "assert";
import { rainlang, MetaStore, RainDocument, RainLanguageServices } from "../dist/cjs";
import {
    Position,
    CompletionItem,
    TextDocumentItem,
    CompletionItemKind,
} from "vscode-languageserver-types";

const ws = " ".repeat(64) + "---";
async function testCompletion(
    text: string,
    position: Position,
    expectedCompletions: CompletionItem[] | null,
    services: RainLanguageServices,
) {
    const actualCompletions = services.doComplete(
        TextDocumentItem.create("file:///completion.test.rain", "rainlang", 1, text),
        position,
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
    const AllOpcodeCompletions: CompletionItem[] = [];

    const services = new RainLanguageServices(store);

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "expression",
            kind: CompletionItemKind.Class,
        });
        await testCompletion(
            rainlang`${ws} #expression _: `,
            Position.create(0, 82),
            _allCompletions,
            services,
        );
    });

    it("should provide correct suggestions based on trailing characters", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "exp",
            kind: CompletionItemKind.Class,
        });
        await testCompletion(
            rainlang`${ws} #exp _: int-ad`,
            Position.create(0, 82),
            _allCompletions,
            services,
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(rainlang`${ws} #exp _: add`, Position.create(0, 77), null, services);
    });

    it("should provide correct suggestions if leading character is non-word", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "exp",
            kind: CompletionItemKind.Class,
        });
        await testCompletion(
            rainlang`${ws} #exp _: add(1 2)`,
            Position.create(0, 79),
            _allCompletions,
            services,
        );
    });

    it("should include lhs alias in suggestions", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        await testCompletion(
            rainlang`${ws} #exp name: n`,
            Position.create(0, 80),
            [
                {
                    label: "exp",
                    kind: CompletionItemKind.Class,
                },
                ..._allCompletions,
            ],
            services,
        );
    });

    it("should include root namespaces items in suggestions", async () => {
        const _expression = rainlang`${ws}
#row
1

#main
_: .`;
        const _dotrain = RainDocument.create(_expression, store);
        const _ns = _dotrain.namespace;
        const items: CompletionItem[] = [];
        _ns.forEach((v, k) => {
            items.unshift({
                label: k,
                kind: !("element" in v)
                    ? CompletionItemKind.Field
                    : "content" in v.element
                      ? CompletionItemKind.Class
                      : CompletionItemKind.Function,
            });
        });
        await testCompletion(
            _expression,
            Position.create(5, 4),
            items.filter((v) => v.label !== "Dispair"),
            services,
        );
    });

    it("should include correct namespaces items in suggestions", async () => {
        const _expression = rainlang`${ws}
#row
1

#main
_: .r`;
        const _dotrain = RainDocument.create(_expression, store);
        const _ns = _dotrain.namespace;
        const items: CompletionItem[] = [];
        _ns.forEach((v, k) => {
            items.unshift({
                label: k,
                kind: !("element" in v)
                    ? CompletionItemKind.Field
                    : "content" in v.element
                      ? CompletionItemKind.Class
                      : CompletionItemKind.Function,
            });
        });
        await testCompletion(
            _expression,
            Position.create(5, 5),
            items.filter((v) => v.label !== "Dispair"),
            services,
        );
    });
});
