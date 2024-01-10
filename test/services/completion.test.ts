import * as assert from "assert";
import { callerMeta, deployer, deployerHash } from "../utils";
import {
    rainlang,
    MetaStore,
    RainDocument,
    IAuthoringMeta,
    RainLanguageServices,
} from "../../dist/cjs";
import {
    Position,
    CompletionItem,
    TextDocumentItem,
    CompletionItemKind,
} from "vscode-languageserver-types";

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

    before(async () => {
        store.updateWith(callerMeta.hash, callerMeta.bytes);
        const expDeployer = store.setDeployer(deployer);

        const AuthoringMeta = expDeployer.authoringMeta as IAuthoringMeta;
        AuthoringMeta.forEach((v) =>
            AllOpcodeCompletions.unshift({
                label: v.word,
                kind: CompletionItemKind.Function,
            }),
        );
        AllOpcodeCompletions.unshift(
            ...[
                "max-uint32",
                "max-uint-32",
                "max-uint64",
                "max-uint-64",
                "max-uint128",
                "max-uint-128",
                "max-uint256",
                "max-uint-256",
                "infinity",
            ].map((v) => ({
                label: v,
                kind: CompletionItemKind.Constant,
            })),
        );
    });

    const services = new RainLanguageServices(store);

    it("should provide all opcode suggestions for rhs when there is no lhs aliases", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "expression",
            kind: CompletionItemKind.Class,
        });
        await testCompletion(
            rainlang`@${deployerHash} #expression _: `,
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
            rainlang`@${deployerHash} #exp _: int-ad`,
            Position.create(0, 82),
            _allCompletions,
            services,
        );
    });

    it("should provide no suggestions if cursor is in middle of a word", async () => {
        await testCompletion(
            rainlang`@${deployerHash} #exp _: add`,
            Position.create(0, 10),
            null,
            services,
        );
    });

    it("should provide correct suggestions if leading character is non-word", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        _allCompletions.unshift({
            label: "exp",
            kind: CompletionItemKind.Class,
        });
        await testCompletion(
            rainlang`@${deployerHash} #exp _: add(1 2)`,
            Position.create(0, 79),
            _allCompletions,
            services,
        );
    });

    it("should include lhs alias in suggestions", async () => {
        const _allCompletions = [...AllOpcodeCompletions];
        await testCompletion(
            rainlang`@${deployerHash} #exp name: n`,
            Position.create(0, 80),
            [
                // {
                //     label: "name",
                //     kind: CompletionItemKind.Variable,
                // },
                {
                    label: "exp",
                    kind: CompletionItemKind.Class,
                },
                ..._allCompletions,
            ],
            services,
        );
    });

    // it("should include contract context in suggestions", async () => {
    //     const contractMetas = [
    //         "vault-output-balance-decrease",
    //         "vault-output-balance-before",
    //         "vault-output-id",
    //         "vault-output-token-decimals",
    //         "vault-output-token-address",
    //         "vault-outputs",
    //         "vault-input-balance-increase",
    //         "vault-input-balance-before",
    //         "vault-input-id",
    //         "vault-input-token-decimals",
    //         "vault-input-token-address",
    //         "vault-inputs",
    //         "order-io-ratio",
    //         "order-output-max",
    //         "calculations",
    //         "counterparty-address",
    //         "order-owner-address",
    //         "order-hash",
    //         "calling-context",
    //         "orderbook-contract-address",
    //         "orderbook-caller-address",
    //         "base",
    //     ];
    //     const _allCompletions = [...AllOpcodeCompletions];
    //     contractMetas.reverse().forEach((v) =>
    //         _allCompletions.unshift({
    //             label: v,
    //             kind: CompletionItemKind.Function,
    //         }),
    //     );
    //     await testCompletion(
    //         rainlang`@${deployerHash} @${callerMeta.hash}
    //         #exp
    //         _: counterpa`,
    //         Position.create(2, 24),
    //         [
    //             {
    //                 label: "exp",
    //                 kind: CompletionItemKind.Class,
    //             },
    //             ..._allCompletions,
    //         ],
    //         services,
    //     );
    // });
    it("should include root namespaces items in suggestions", async () => {
        const _expression = rainlang`@${deployerHash}
#row
1

#main
_: .`;
        const _dotrain = RainDocument.create(_expression, "file:///completion.test.rain", store);
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
        const _expression = rainlang`@${deployerHash}
#row
1

#main
_: .r`;
        const _dotrain = RainDocument.create(_expression, "file:///completion.test.rain", store);
        const _ns = _dotrain.namespace;
        const items: CompletionItem[] = [];
        _ns.forEach((v, k) => {
            items.push({
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
