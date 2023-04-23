import { invalidOpMetas } from "../fixtures/opmeta";
import { assertError, opMetaHash } from "../utils";
import { MetaStore, rainlang, rlc } from "../../src";


describe("Rainlang Compiler (rlc) tests", async function () {
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash);
    });

    it("should fail if no opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`_: add(1 2);`, store),
            "cannot find op meta hash, please specify an op meta hash",
            "Invalid Error"
        );
    });

    it("should fail if an invalid opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`@${opMetaHash + "ab"} _: add(1 2);`, store),
            "invalid meta hash, must be 32 bytes",
            "Invalid Error"
        );
    });

    it("should fail if an opmeta with no settlement is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`@${opMetaHash.slice(0, -1) + "a"} _: add(1 2);`, store),
            "no meta found for hash",
            "Invalid Error"
        );
    });

    it("should fail if multiple opmeta is specified", async () => {
        await assertError(
            async () =>
                await rlc(rainlang`@${opMetaHash + "ab"} @${opMetaHash + "ab"} _: add(1 2);`, store),
            "unexpected meta hash, cannot include more than 1 meta hash per document",
            "Invalid Error"
        );
    });

    it("should fail if an invalid header opmeta is specified", async () => {
        await store.updateStore(
            invalidOpMetas.invalid_header.metaHash, 
            invalidOpMetas.invalid_header.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.invalid_header.metaHash} _: add(1 2);`, store),
            "incorrect header check",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid operand args", async () => {
        await store.updateStore(
            invalidOpMetas.invalid_operand_args.metaHash,
            invalidOpMetas.invalid_operand_args.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.invalid_operand_args.metaHash} _: add(1 2);`, store),
            "invalid meta for call, reason: bad operand args order",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid schema", async () => {
        await store.updateStore(
            invalidOpMetas.invalid_by_schema.metaHash,
            invalidOpMetas.invalid_by_schema.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.invalid_by_schema.metaHash} _: add(1 2);`, store),
            "invalid meta for add, reason: failed schema validation",
            "Invalid Error"
        );
    });

    it("should fail if op meta has duplicate schema", async () => {
        await store.updateStore(
            invalidOpMetas.duplicate_alias.metaHash,
            invalidOpMetas.duplicate_alias.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.duplicate_alias.metaHash} _: add(1 2);`, store),
            "invalid meta, reason: duplicated names or aliases",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid bits", async () => {
        await store.updateStore(
            invalidOpMetas.invalid_bits.metaHash,
            invalidOpMetas.invalid_bits.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.invalid_bits.metaHash} _: add(1 2);`, store),
            "invalid meta for scale-18, reason: start bit greater than end bit for saturate",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing bits in input", async () => {
        await store.updateStore(
            invalidOpMetas.missing_bits.metaHash,
            invalidOpMetas.missing_bits.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.missing_bits.metaHash} _: add(1 2);`, store),
            "invalid meta for call, reason: must have specified \\\"bits\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing computation in input", async () => {
        await store.updateStore(
            invalidOpMetas.missing_computation.metaHash,
            invalidOpMetas.missing_computation.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.missing_computation.metaHash} _: add(1 2);`, store),
            "invalid meta for do-while, reason: must have specified \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has unexpected computation in input", async () => {
        await store.updateStore(
            invalidOpMetas.unexpected_computation.metaHash,
            invalidOpMetas.unexpected_computation.metaBytes
        );
        await assertError(
            async () =>
                await rlc(rainlang`@${invalidOpMetas.unexpected_computation.metaHash} _: add(1 2);`, store),
            "invalid meta for do-while, reason: unexpected \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });
});