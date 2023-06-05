import { assertError, opMetaHash } from "../utils";
import { invalidOpMetas } from "../fixtures/opmeta";
import { MetaStore, rainlang, rainlangc } from "../../src";


describe("Rainlang Op Meta Tests", async function () {
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash);
    });

    it("should fail if no opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await rainlangc(rainlang`#exp _: add(1 2)`, ["exp"], store),
            "cannot find op meta import",
            "Invalid Error"
        );
    });

    it("should fail if an invalid opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await rainlangc(rainlang`@${opMetaHash + "ab"} #exp _: add(1 2)`, ["exp"], store),
            "invalid meta hash, must be 32 bytes",
            "Invalid Error"
        );
    });

    it("should fail if an opmeta with no settlement is specified", async () => {
        await assertError(
            async () =>
                await rainlangc(rainlang`@${opMetaHash.slice(0, -1) + "a"} #exp _: add(1 2)`, ["exp"], store),
            "cannot find any valid settlement for op meta from specified hash",
            "Invalid Error"
        );
    });

    it("should fail if no settlement is found for multiple meta hashes", async () => {
        await assertError(
            async () =>
                await rainlangc(rainlang`@${opMetaHash.slice(0, -1) + "a"} @${opMetaHash.slice(0, -1) + "a"} #exp _: add(1 2)`, ["exp"], store),
            "cannot find any valid settlement for op meta from specified hashes",
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
                await rainlangc(rainlang`@${invalidOpMetas.invalid_header.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.invalid_operand_args.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.invalid_by_schema.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.duplicate_alias.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.invalid_bits.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.missing_bits.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.missing_computation.metaHash} #exp _: add(1 2)`, ["exp"], store),
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
                await rainlangc(rainlang`@${invalidOpMetas.unexpected_computation.metaHash} #exp _: add(1 2)`, ["exp"], store),
            "invalid meta for do-while, reason: unexpected \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });
});