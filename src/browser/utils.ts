import { format } from "prettier/standalone";
import babelParser from "prettier/parser-babel";
import { deflate, inflate } from "pako";
import type { BytesLike } from 'ethers';
import { Buffer } from "buffer/";
import { arrayify, hexlify, isBytesLike, validateMeta } from "../shared/utils";

export * from "../shared/utils";


/**
   * @public
   * Convert meta or array of metas or a schema to bytes and compress them for on-chain deployment
   *
   * @param meta - A meta object or array of meta objects or stringified format of them
   * @param schema - Json schema to validate as object (JSON.parsed) or stringified format
   * @returns Bytes as HexString
   */
export const bytesFromMeta = (
    meta: object | object[] | string,
    schema: object | string
): string => {
    let _meta;
    let _schema;
    if (typeof meta === "string") _meta = JSON.parse(meta);
    else _meta = meta;
    if (typeof schema === "string") _schema = JSON.parse(schema);
    else _schema = schema;
    if (!validateMeta(_meta, _schema))
        throw new Error("provided meta object is not valid");
    const formatted = format(
        JSON.stringify(_meta, null, 4), 
        { parser: "json",  plugins: [babelParser] }
    );
    const bytes = deflate(formatted);
    const hex = hexlify(bytes, { allowMissingPrefix: true });
    return hex;
};

/**
 * @public
 * Decompress and convert bytes to meta
 *
 * @param bytes - Bytes to decompress and convert to json
 * @param schema - Json schema to validate as object (JSON.parsed) or stringified format
 * @returns meta content as object
 */
export const metaFromBytes = (
    bytes: BytesLike,
    schema: object | string
) => {
    if (isBytesLike(bytes)) {
        let _schema;
        if (typeof schema === "string") _schema = JSON.parse(schema);
        else _schema = schema;
        const _bytesArr = arrayify(bytes, { allowMissingPrefix: true });
        const _meta = format(
            Buffer.from(inflate(_bytesArr)).toString(), 
            { parser: "json", plugins: [babelParser] }
        );
        if (!validateMeta(JSON.parse(_meta), _schema))
            throw new Error("invalid meta");
        return JSON.parse(_meta);
    }
    else throw new Error("invalid meta");
};
