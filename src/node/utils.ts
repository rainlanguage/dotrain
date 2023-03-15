import fs from "fs";
import cbor from "cbor";
import { resolve } from "path";
import { format } from "prettier";
import type { BytesLike } from 'ethers';
import { deflateSync, inflateSync } from "zlib";
import { arrayify, hexlify, isBytesLike, MAGIC_NUMBERS, validateMeta } from "../shared/utils";

export * from "../shared/utils";


/**
   * @public
   * Convert meta or array of metas or a schema to bytes and compress them for on-chain deployment
   *
   * @param meta - A meta object or array of meta objects or stringified format of them
   * @param schema - Json schema to validate as object (JSON.parsed) or stringified format
   * @param path - (optional) The path to write the file to if generating an output 
   * json file is desired, example: path/to/name.json
   * @returns Bytes as HexString
   */
export const bytesFromMeta = (
    meta: object | object[] | string,
    schema: object | string,
    path = ""
): string => {
    const _write = (_meta: any) => {
        if (path) {
            let _path = resolve(path);
            if (!_path.endsWith(".json")) _path = _path + "Meta.json";
            try {
                fs.writeFileSync(_path, _meta);
            } catch (error) {
                console.log(error);
            }
        }
    };
    let _meta;
    let _schema;
    if (typeof meta === "string") _meta = JSON.parse(meta);
    else _meta = meta;
    if (typeof schema === "string") _schema = JSON.parse(schema);
    else _schema = schema;
    if (!validateMeta(_meta, _schema))
        throw new Error("provided meta object is not valid");
    const formatted = format(JSON.stringify(_meta, null, 4), { parser: "json" });
    const bytes = Uint8Array.from(deflateSync(formatted));
    const hex = hexlify(bytes, { allowMissingPrefix: true });
    if (path.length) _write(formatted);
    return hex;
};

/**
* @public
* Decompress and convert bytes to meta
*
* @param bytes - Bytes to decompress and convert to json
* @param schema - Json schema to validate as object (JSON.parsed) or stringified format
* @param path - (optional) The path to write the file to if generating an output 
* json file is desired, example: path/to/name.json
* @returns meta content as object
*/
export const metaFromBytes = (
    bytes: BytesLike,
    schema: object | string,
    path = ""
) => {
    const _write = (_meta: any) => {
        if (path) {
            let _path = resolve(path);
            if (!_path.endsWith(".json")) _path = _path + "Meta.json";
            try {
                fs.writeFileSync(_path, _meta);
            } catch (error) {
                console.log(error);
            }
        }
    };
    if (isBytesLike(bytes)) {
        let _schema;
        if (typeof schema === "string") _schema = JSON.parse(schema);
        else _schema = schema;
        const _bytesArr = arrayify(bytes, { allowMissingPrefix: true });
        const _meta = format(inflateSync(_bytesArr).toString(), { parser: "json" });
        if (!validateMeta(JSON.parse(_meta), _schema))
            throw new Error("invalid meta");
        if (path.length) _write(_meta);
        return JSON.parse(_meta);
    }
    else throw new Error("invalid meta");
};

/**
* @public
* Use CBOR to decode from a given value.
*
* This will try to decode all from the given value, allowing to decoded CBOR
* sequences. Always will return an array with the decoded results.
*
* @param dataEncoded_ - The data to be decoded
* @returns An array with the decoded data.
*/
export const cborDecode = (dataEncoded_: string): Array<any> => {
    return cbor.decodeAllSync(dataEncoded_);
};

/**
* @public
* Use a given `dataEncoded_` as hex string and decoded it following the Rain
* enconding design.
*
* @param dataEncoded_ - The data to be decoded
* @returns An array with the values decoded.
*/
export const decodeRainMetaDocument = (dataEncoded_: string): Array<any> => {
    const metaDocumentHex =
  "0x" + MAGIC_NUMBERS.RAIN_META_DOCUMENT.toString(16).toLowerCase();

    dataEncoded_ = dataEncoded_.toLowerCase().startsWith("0x")
        ? dataEncoded_
        : "0x" + dataEncoded_;

    if (!dataEncoded_.startsWith(metaDocumentHex)) {
        throw new Error(
            "Invalid data. Does not start with meta document magic number."
        );
    }
    return cborDecode(dataEncoded_.replace(metaDocumentHex, ""));
};
