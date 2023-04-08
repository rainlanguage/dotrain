// import * as chai from "chai";
import { rainlang } from "../../src/utils";
// import chaiAsPromised from 'chai-as-promised';
import { deployerAddress, toRange } from "../utils";
import { Diagnostic, DiagnosticSeverity, getLanguageService, getOpMetaFromSg, getRainDiagnostics } from "../../src";
import { TextDocument } from "vscode-languageserver-textdocument";
import assert from "assert";


// chai.use(chaiAsPromised);
// const assert: Chai.AssertStatic = chai.assert;
// const expect: Chai.ExpectStatic = chai.expect;

async function testDiagnostics(
    text: string, opmeta: Uint8Array | string, expectedDiagnostics: Diagnostic[]
) {
    const langServices = getLanguageService();
    const actualDiagnostics: Diagnostic[] = await langServices.doValidation(TextDocument.create("file", "rainlang", 1, text), opmeta);
    expectedDiagnostics.forEach((expectedDiagnostic, i) => {
        const actualDiagnostic = actualDiagnostics[i];
        assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
        assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
        assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
        assert.equal(actualDiagnostic.source, expectedDiagnostic.source);
    });
}
describe("Rainlang Diagnostics Service tests", async function () {
    let opMeta: string;

    before(async () => {
        opMeta = await getOpMetaFromSg(deployerAddress, "mumbai");
    });

    it("simple diagnostics", async () => {
        console.log(JSON.stringify(await getRainDiagnostics(TextDocument.create("file", "rainlang", 1, rainlang`x: read-memory<error-argument>();`), opMeta), null, 4));

        await testDiagnostics(rainlang`_: add(1 2)`, opMeta, [
            { message: 'source item expressions must end with semi', range: toRange(0, 0, 0, 11), severity: DiagnosticSeverity.Error, code: 258, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`_: add(¢ 2)`, opMeta, [
            { message: 'found non-printable-ASCII character with unicode: "U+00a2"', range: toRange(0, 7, 0, 8), severity: DiagnosticSeverity.Error, code: 3, source: 'rain' },
        ]);

        await testDiagnostics("/* invalid comment  _: add(10 2);", opMeta, [
            { message: 'unexpected end of comment', range: toRange(0, 0, 0, 33), severity: DiagnosticSeverity.Error, code: 513, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`_: add(10 20) /* invalid comment */;`, opMeta, [
            { message: 'invalid RHS, comments are not allowed', range: toRange(0, 2, 0, 35), severity: DiagnosticSeverity.Error, code: 515, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`123add123: add(10 20);`, opMeta, [
            { message: 'invalid LHS alias: 123add123', range: toRange(0, 0, 0, 9), severity: DiagnosticSeverity.Error, code: 257, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`x: ();`, opMeta, [
            { message: 'parenthesis represent inputs of an opcode, but no opcode was found for this parenthesis', range: toRange(0, 3, 0, 5), severity: DiagnosticSeverity.Error, code: 769, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`x: );`, opMeta, [
            { message: 'unexpected ")"', range: toRange(0, 3, 0, 4), severity: DiagnosticSeverity.Error, code: 514, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`x: sub(add(10 20)add(1 2));`, opMeta, [
            { message: 'expected to be seperated by space', range: toRange(0, 16, 0, 18), severity: DiagnosticSeverity.Error, code: 770, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`x: add(10 20), z: ;`, opMeta, [
            { message: 'no RHS item exists to match this LHS item: z', range: toRange(0, 15, 0, 16), severity: DiagnosticSeverity.Error, code: 1025, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`: add(10 20);`, opMeta, [
            { message: 'no LHS item exists to match this RHS item', range: toRange(0, 2, 0, 12), severity: DiagnosticSeverity.Error, code: 1026, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`this-is-an-invalid-rain-expression;`, opMeta, [
            { message: 'invalid rain expression', range: toRange(0, 0, 0, 34), severity: DiagnosticSeverity.Error, code: 258, source: 'rain' },
        ]);

        await testDiagnostics(rainlang`x: read-memory<error-argument>();`, opMeta, [
            { message: 'invalid argument pattern', range: toRange(0, 15, 0, 29), severity: DiagnosticSeverity.Error, code: 257, source: 'rain' },
        ]);
    });
});
