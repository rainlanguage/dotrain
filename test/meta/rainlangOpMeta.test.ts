import { METAS } from "../fixtures/opmeta";
import { assertError, opMetaHash } from "../utils";
import { MetaStore, rainlang, dotrainc } from "../../src";


describe("Op Meta Tests", async function () {
    const store = new MetaStore();

    before(async () => {
        await store.updateStore(opMetaHash, METAS.validOpMeta.metaBytes);
    });

    it("should fail if no opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await dotrainc(rainlang`#expression _: add(1 2);`, ["expression"], store),
            "cannot find any set of words",
            "Invalid Error"
        );
    });

    it("should fail if an invalid opmeta hash is specified", async () => {
        await assertError(
            async () =>
                await dotrainc(rainlang`@${opMetaHash + "ab"} #expression _: add(1 2);`, ["expression"], store),
            "expected a valid name or hash",
            "Invalid Error"
        );
    });

    it("should fail if an opmeta with no settlement is specified", async () => {
        await assertError(
            async () =>
                await dotrainc(rainlang`@${opMetaHash.slice(0, -1) + "e"} #expression _: add(1 2);`, ["expression"], store),
            "cannot find any settlement for hash",
            "Invalid Error"
        );
    });

    it("should fail if no settlement is found for multiple meta hashes", async () => {
        await assertError(
            async () =>
                await dotrainc(rainlang`@${opMetaHash.slice(0, -1) + "e"} @${opMetaHash.slice(0, -1) + "a"} #expression _: add(1 2);`, ["expression"], store),
            "cannot find any settlement for hash",
            "Invalid Error"
        );
    });

    it("should fail if an invalid header opmeta is specified", async () => {
        await store.updateStore(
            METAS.invalid_header_opmeta.metaHash, 
            METAS.invalid_header_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.invalid_header_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "meta sequence contains corrupt OpMeta",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid operand args", async () => {
        await store.updateStore(
            METAS.invalid_operand_args_opmeta.metaHash,
            METAS.invalid_operand_args_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.invalid_operand_args_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta for call, reason: bad operand args order",
            "Invalid Error"
        );
    });

    // it("should fail if op meta has invalid schema", async () => {
    //     await store.updateStore(
    //         METAS.invalid_by_schema_opmeta.metaHash,
    //         METAS.invalid_by_schema_opmeta.metaBytes
    //     );
    //     await assertError(
    //         async () =>
    //             await dotrainc(rainlang`@${METAS.invalid_by_schema_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store).then(v => console.log(v)).catch(v =>console.log(v)),
    //         "invalid meta for add, reason: failed schema validation",
    //         "Invalid Error"
    //     );
    // });

    it("should fail if op meta has duplicate schema", async () => {
        await store.updateStore(
            METAS.duplicate_alias_opmeta.metaHash,
            METAS.duplicate_alias_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.duplicate_alias_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta, reason: duplicated names or aliases",
            "Invalid Error"
        );
    });

    it("should fail if op meta has invalid bits", async () => {
        await store.updateStore(
            METAS.invalid_bits_opmeta.metaHash,
            METAS.invalid_bits_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.invalid_bits_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta for scale-18, reason: start bit greater than end bit for saturate",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing bits in input", async () => {
        await store.updateStore(
            METAS.missing_bits_opmeta.metaHash,
            METAS.missing_bits_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.missing_bits_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta for call, reason: must have specified \\\"bits\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has missing computation in input", async () => {
        await store.updateStore(
            METAS.missing_computation_opmeta.metaHash,
            METAS.missing_computation_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.missing_computation_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta for do-while, reason: must have specified \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });

    it("should fail if op meta has unexpected computation in input", async () => {
        await store.updateStore(
            METAS.unexpected_computation_opmeta.metaHash,
            METAS.unexpected_computation_opmeta.metaBytes
        );
        await assertError(
            async () =>
                await dotrainc(rainlang`@${METAS.unexpected_computation_opmeta.metaHash} #expression _: add(1 2);`, ["expression"], store),
            "invalid meta for do-while, reason: unexpected \\\"computation\\\" field for inputs",
            "Invalid Error"
        );
    });
});