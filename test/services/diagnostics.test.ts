import * as assert from "assert";
import { toRange, callerMeta, deployer, deployerHash } from "../utils";
import { MetaStore, ErrorCode, RainLanguageServices, rainlang } from "../../dist/cjs";
import { Diagnostic, TextDocumentItem, DiagnosticSeverity } from "vscode-languageserver-types";

async function testDiagnostics(
    text: string,
    services: RainLanguageServices,
    expectedDiagnostics: Diagnostic[],
) {
    const actualDiagnostics: Diagnostic[] = services.doValidate(
        TextDocumentItem.create("file:///diagnostics.test.rain", "rainlang", 1, text),
        false,
    );

    if (actualDiagnostics.length == 0)
        throw new Error(`No Diagnostics available for the expression : \n${text}`);
    expectedDiagnostics.forEach((expectedDiagnostic, i) => {
        const actualDiagnostic = actualDiagnostics[i];
        assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
        assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
        assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
        assert.equal(actualDiagnostic.source, expectedDiagnostic.source);
        assert.equal(actualDiagnostic.code, expectedDiagnostic.code);
    });
}

describe("LSP Diagnostics Language Service Tests", async function () {
    const store = new MetaStore();

    before(async () => {
        store.updateWith(callerMeta.hash, callerMeta.bytes);
        store.setDeployer(deployer);
    });

    const services = new RainLanguageServices(store);

    it('should error: found illegal character: "\\u00a2"', async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn _: add(¢ 2);`, services, [
            {
                message: "illegal character: \u00a2",
                range: toRange(0, 80, 0, 80),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.IllegalChar,
                source: "rainlang",
            },
        ]);
    });

    it("should error: unexpected end of comment", async () => {
        await testDiagnostics("/* invalid comment  _: add(10 2);", services, [
            {
                message: "unexpected end of comment",
                range: toRange(0, 0, 0, 33),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.UnexpectedEndOfComment,
                source: "rainlang",
            },
        ]);
    });

    it("should error: unexpected comment", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn _ _: add(10 20) /* invalid comment */ mul(1 2);`,
            services,
            [
                {
                    message: "unexpected comment",
                    range: toRange(0, 89, 0, 110),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.UnexpectedComment,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: invalid LHS alias: 123add123", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn 123add123: add(10 20);`, services, [
            {
                message: "invalid LHS alias: 123add123",
                range: toRange(0, 73, 0, 82),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.InvalidWordPattern,
                source: "rainlang",
            },
        ]);
    });

    it("should error: parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn x: ();`, services, [
            {
                message:
                    "parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis",
                range: toRange(0, 76, 0, 76),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.ExpectedOpcode,
                source: "rainlang",
            },
        ]);
    });

    it('should error: unexpected ")"', async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn x: );`, services, [
            {
                message: 'unexpected ")"',
                range: toRange(0, 76, 0, 77),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.UnexpectedClosingParen,
                source: "rainlang",
            },
        ]);
    });

    it("should error: expected to be separated by space", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn x: int-sub(int-add(10 20)int-add(1 2));`,
            services,
            [
                {
                    message: "expected to be separated by space",
                    range: toRange(0, 97, 0, 98),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.ExpectedSpace,
                    source: "rainlang",
                },
            ],
        );
    });

    // it("should error: no RHS item exists to match this LHS item: z", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: int-add(10 20), z: ;`,
    //         services,
    //         [{
    //             message: "no RHS item exists to match this LHS item: z",
    //             range: toRange(0, 92, 0, 93),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.MismatchRHS,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: no LHS item exists to match this RHS item", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn : int-add(10 20);`,
    //         services,
    //         [{
    //             message: "no LHS item exists to match this RHS item",
    //             range: toRange(0, 79, 0, 89),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.MismatchLHS,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    it("should error: undefined word", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn _: this-is-an-invalid-rain-expression;`,
            services,
            [
                {
                    message: "undefined word: this-is-an-invalid-rain-expression",
                    range: toRange(0, 76, 0, 110),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.UndefinedWord,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: invalid argument pattern", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn x: int-add<error-argument>();`,
            services,
            [
                // {
                //     message: "expected 1 more operand argument for read-memory",
                //     range: toRange(0, 83, 0, 99),
                //     severity: DiagnosticSeverity.Error,
                //     code: ErrorCode.MismatchOperandArgs,
                //     source: "rainlang"
                // },
                {
                    message: "invalid argument pattern: error-argument",
                    range: toRange(0, 84, 0, 98),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidOperandArg,
                    source: "rainlang",
                },
            ],
        );
    });

    // it("should error: opcode mul doesn't have argumented operand", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: int-mul<10>(10 20);`,
    //         services,
    //         [{
    //             message: "opcode mul doesn't have argumented operand",
    //             range: toRange(0, 83, 0, 87),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.MismatchOperandArgs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: unexpected operand argument for opcode", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: read-memory<1 2 3>(1);`,
    //         services,
    //         [{
    //             message: "unexpected operand argument for read-memory",
    //             range: toRange(0, 92, 0, 93),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.MismatchOperandArgs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: expected more operand args for opcode", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: read-memory<>();`,
    //         services,
    //         [{
    //             message: "expected 2 operand arguments for read-memory",
    //             range: toRange(0, 87, 0, 89),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.MismatchOperandArgs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: out-of-range inputs", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: read-memory<0 1>(1);`,
    //         services,
    //         [{
    //             message: "out-of-range inputs",
    //             range: toRange(0, 92, 0, 95),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.OutOfRangeInputs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: out-of-range inputs", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: read-memory<0 1>(1);`,
    //         services,
    //         [{
    //             message: "out-of-range inputs",
    //             range: toRange(0, 92, 0, 95),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.OutOfRangeInputs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: out-of-range inputs", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn x: erc-20-balance-of(10 20 30);`,
    //         services,
    //         [{
    //             message: "out-of-range inputs",
    //             range: toRange(0, 93, 0, 103),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.OutOfRangeInputs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: out-of-range operand argument", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn _ _ _ _: do-while<1233>(1 2 3 1 3 );`,
    //         services,
    //         [{
    //             message: "out-of-range operand argument",
    //             range: toRange(0, 91, 0, 95),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.OutOfRangeOperandArgs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: zero output opcodes cannot be nested", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn _: int-add(ensure(2) int-add(10 20));`,
    //         services,
    //         [{
    //             message: "zero output opcodes cannot be nested",
    //             range: toRange(0, 80, 0, 89),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.InvalidNestedNode,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    // it("should error: multi output opcodes cannot be nested", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn _: int-add(do-while<1>(1 2 3 1 3 ) int-add(10 20));`,
    //         services,
    //         [{
    //             message: "multi output opcodes cannot be nested",
    //             range: toRange(0, 80, 0, 103),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.InvalidNestedNode,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    it("should error: invalid word pattern and unknown opcode", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn _: read-mem_ory<1 1>();`, services, [
            {
                message: "invalid word pattern: read-mem_ory",
                range: toRange(0, 76, 0, 88),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.InvalidWordPattern,
                source: "rainlang",
            },
        ]);
    });

    // it("should error: expected operand arguments for opcode loop-n", async () => {
    //     await testDiagnostics(
    //         rainlang`@${deployerHash} #exn _: loop-n();`,
    //         services,
    //         [{
    //             message: "expected operand arguments for opcode loop-n",
    //             range: toRange(0, 76, 0, 82),
    //             severity: DiagnosticSeverity.Error,
    //             code: ErrorCode.ExpectedOperandArgs,
    //             source: "rainlang"
    //         }]
    //     );
    // });

    it('should error: expected "("', async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn _ _: int-add<1 2 2>;`, services, [
            {
                message: 'expected "("',
                range: toRange(0, 78, 0, 85),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.ExpectedOpeningParen,
                source: "rainlang",
            },
        ]);
    });

    it('should error: expected ")"', async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn _ _: int-add<1 2 2>(;`, services, [
            {
                message: 'expected ")"',
                range: toRange(0, 78, 0, 93),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.ExpectedClosingParen,
                source: "rainlang",
            },
        ]);
    });

    it("should error: invalid LHS alias: addval_as", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn addval_as: int-add(1 20), x: addval_as;`,
            services,
            [
                {
                    message: "invalid LHS alias: addval_as",
                    range: toRange(0, 73, 0, 82),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidWordPattern,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: cannot reference self", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn x: int-add(1 x);`, services, [
            {
                message: "cannot reference self",
                range: toRange(0, 86, 0, 87),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.InvalidSelfReference,
                source: "rainlang",
            },
        ]);
    });

    it("should error: value greater than 32 bytes in size", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn _: int-add(1 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);`,
            services,
            [
                {
                    message: "value out of range",
                    range: toRange(0, 86, 0, 153),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.OutOfRangeValue,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: undefined word: max-uint266", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn x: max-uint266;`, services, [
            {
                message: "undefined word: max-uint266",
                range: toRange(0, 76, 0, 87),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.UndefinedWord,
                source: "rainlang",
            },
        ]);
    });

    it('should error: "_notdefined" is not a valid rainlang word', async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn _: int-add(10 20); #exp1 x: _notdefined;`,
            services,
            [
                {
                    message: "_notdefined is not a valid rainlang word",
                    range: toRange(0, 101, 0, 112),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidWordPattern,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: expected > and (", async () => {
        await testDiagnostics(rainlang`@${deployerHash} #exn _: int-add<1 2();`, services, [
            {
                message: 'expected ">"',
                range: toRange(0, 83, 0, 89),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.ExpectedClosingAngleBracket,
                source: "rainlang",
            },
            {
                message: 'expected "("',
                range: toRange(0, 76, 0, 83),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.ExpectedOpeningParen,
                source: "rainlang",
            },
        ]);
    });

    it("should error: invalid LHS alias: invalid_alias", async () => {
        await testDiagnostics(
            rainlang`@${deployerHash} #exn invalid_alias: int-add(1 20);`,
            services,
            [
                {
                    message: "invalid LHS alias: invalid_alias",
                    range: toRange(0, 73, 0, 86),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidWordPattern,
                    source: "rainlang",
                },
            ],
        );
    });

    // it("multiple diagnostics", async () => {
    //     const expression0 = rainlang`@${deployerHash}
    //         #exn
    //         allowed-counterparty: 23,
    //         : ensure(eq(allowed-counterparty context<1 2>())),

    //         batch-start-info-k: context<1 65535>(),
    //         batch-start-info: get(batch-start-info-k),
    //         batch-start-time: decode-256<32 63>(batch-start-info),
    //         _: ensure(gt(now() int-add(batch-start-time 86400))),

    //         batch-index batch-remaining: call<2 2>(0),

    //         io-multiplier: prb-powu(102e106 batch-index),
    //         amount: max(batch-remaining 0),

    //         io-ratio: prb-mul(io_multiplier 3);`;

    //     await testDiagnostics(
    //         expression0,
    //         services,
    //         [
    //             {
    //                 range: toRange(5, 42, 5, 47),
    //                 message: "out-of-range operand argument",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.OutOfRangeOperandArgs,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(8, 12, 8, 13),
    //                 message: "no RHS item exists to match this LHS item: _",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.MismatchRHS,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(12, 36, 12, 43),
    //                 message: "value greater than 32 bytes in size",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.OutOfRangeValue,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(15, 30, 15, 43),
    //                 message: "\"io_multiplier\" is not a valid rainlang word",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.InvalidWordPattern,
    //                 source: "rainlang"
    //             }
    //         ]
    //     );

    //     const expression1 = rainlang`@${deployerHash}
    //         #exp1
    //         c0: 1,
    //         c1: 2,
    //         condition: 1,
    //         _ _: do-while<1 2 3>(c0 c1 condition);

    //         #exp2
    //         s0 s1: ,
    //         o0 o1: 1 2,
    //         condition: 3 3 4;

    //         #exp3
    //         s0: ,
    //         _: less-than(s0 3 3);

    //         #exp4
    //         s0 s1: ,
    //         _: int-add(s0 4 infinity),
    //         _: int-add(s3 s1 5);
    //     `;

    //     await testDiagnostics(
    //         expression1,
    //         services,
    //         [
    //             {
    //                 range: toRange(5, 28, 5, 29),
    //                 message: "unexpected operand argument for do-while",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.MismatchOperandArgs,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(5, 30, 5, 31),
    //                 message: "unexpected operand argument for do-while",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.MismatchOperandArgs,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(10, 25, 10, 26),
    //                 message: "no LHS item exists to match this RHS item",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.MismatchLHS,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(10, 27, 10, 28),
    //                 message: "no LHS item exists to match this RHS item",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.MismatchLHS,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(14, 24, 14, 32),
    //                 message: "out-of-range inputs",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.OutOfRangeInputs,
    //                 source: "rainlang"
    //             },
    //             {
    //                 range: toRange(19, 19, 19, 21),
    //                 message: "undefined word: s3",
    //                 severity: DiagnosticSeverity.Error,
    //                 code: ErrorCode.UndefinedWord,
    //                 source: "rainlang"
    //             }
    //         ]
    //     );
    // });
});
