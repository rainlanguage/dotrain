import * as assert from "assert";
import { toRange } from "./utils";
import { MetaStore, ErrorCode, RainLanguageServices, rainlang } from "../dist/cjs";
import { Diagnostic, TextDocumentItem, DiagnosticSeverity } from "vscode-languageserver-types";

const deployerHash = "                                                                   ";
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

    const services = new RainLanguageServices(store);

    it('should error: found illegal character: "\\u00a2"', async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn _: add(¢ 2);`, services, [
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
            rainlang`${deployerHash} #exn _ _: add(10 20) /* invalid comment */ mul(1 2);`,
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

    it("should error: parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis", async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn x: ();`, services, [
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
        await testDiagnostics(rainlang`${deployerHash} #exn x: );`, services, [
            {
                message: 'unexpected ")"',
                range: toRange(0, 76, 0, 77),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.UnexpectedClosingParen,
                source: "rainlang",
            },
        ]);
    });

    it("should error: undefined word", async () => {
        await testDiagnostics(
            rainlang`${deployerHash} #exn _: this-is-an-invalid-rain-expression;`,
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
            rainlang`${deployerHash} #exn x: int-add<error-argument>();`,
            services,
            [
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

    it("should error: invalid word pattern and unknown opcode", async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn _: read-mem_ory<1 1>();`, services, [
            {
                message: "invalid word pattern: read-mem_ory",
                range: toRange(0, 76, 0, 88),
                severity: DiagnosticSeverity.Error,
                code: ErrorCode.InvalidWordPattern,
                source: "rainlang",
            },
        ]);
    });

    it('should error: expected "("', async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn _ _: int-add<1 2 2>;`, services, [
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
        await testDiagnostics(rainlang`${deployerHash} #exn _ _: int-add<1 2 2>(;`, services, [
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
            rainlang`${deployerHash} #exn addval_as: int-add(1 20), x: addval_as;`,
            services,
            [
                {
                    message: "invalid word pattern: addval_as",
                    range: toRange(0, 73, 0, 82),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidWordPattern,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: value greater than 32 bytes in size", async () => {
        await testDiagnostics(
            rainlang`${deployerHash} #exn _: int-add(1 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);`,
            services,
            [
                {
                    message: "value out of range",
                    range: toRange(0, 86, 0, 154),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.OutOfRangeValue,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: undefined word: max-uint266", async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn x: max-uint266;`, services, [
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
            rainlang`${deployerHash} #exn _: int-add(10 20); #exp1 x: _notdefined;`,
            services,
            [
                {
                    message: "invalid word pattern: _notdefined",
                    range: toRange(0, 101, 0, 112),
                    severity: DiagnosticSeverity.Error,
                    code: ErrorCode.InvalidWordPattern,
                    source: "rainlang",
                },
            ],
        );
    });

    it("should error: expected > and (", async () => {
        await testDiagnostics(rainlang`${deployerHash} #exn _: int-add<1 2();`, services, [
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
});
