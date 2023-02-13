/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Ajv from "ajv";
import fs from "fs";
import type { BytesLike } from 'ethers';
import { isBytes, isHexString } from 'ethers/lib/utils';
import { BigNumber, BigNumberish, ethers, utils } from 'ethers';
import { StateConfig } from './types';
import stringMath from "string-math";
import { resolve } from "path";
import { format } from "prettier";
import { deflateSync, inflateSync } from "zlib";


export const {
    /**
     * @public ethers concat
     * @see ethers.concat
     */
    concat,
    /**
     * @public ethers hexlify
     * @see ethers.hexlify
     */
    hexlify,
    /**
     * @public ethers zeroPad
     * @see ethers.zeroPad
     */
    zeroPad,
    /**
     * @public ethers hexZeroPad
     * @see ethers.hexZeroPad
     */
    hexZeroPad,
    /**
     * @public ethers arrayify
     * @see ethers.arrayify
     */
    arrayify,
    /**
     * @public ethers parseUnits
     * @see ethers.parseUnits
     */
    parseUnits,
} = utils

/**
 * @public
 */
export enum MemoryType {
    Stack,
    Constant,
}

/**
 * @public
 * Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte,
 * unless a desired `bytesLength` is specified.
 *
 * @param value - value to convert to raw bytes format
 * @param bytesLength - (defaults to 1) number of bytes to left pad if `value` doesn't completely
 * fill the desired amount of memory. Will throw `InvalidArgument` error if value already exceeds
 * bytes length.
 * @returns raw bytes representation as Uint8Array
 */
export const bytify = (
    value: number | BytesLike | utils.Hexable,
    bytesLength = 1
): BytesLike => {
    return zeroPad(hexlify(value), bytesLength)
}

/**
 * @public
 * Converts an opcode and operand to bytes, and returns their concatenation.
 *
 * @param code - the opcode
 * @param erand - the operand, currently limited to 1 byte (defaults to 0)
 */
export const op = (
    code: number,
    erand: number | BytesLike | utils.Hexable = 0
): Uint8Array => {
    return concat([bytify(code, 2), bytify(erand, 2)])
}

/**
 * @public
 * Constructs operand for standard STATE opecode
 * 
 * @param type - Type of the opcode, either 'stack' or 'constant'
 * @param offset - the position of the item in respect to its type
 */
export function memoryOperand(type: number, offset: number): number {
    return (offset << 1) + type
}

/**
 * @public
 * Utility function that transforms a BigNumberish from the output of the ITierV2 contract report
 *
 * @param report - report as bignumberish from the ITierV2 contract
 * @returns hexadecimal string of the report already padded (64 char hexString)
 */
export const paddedUInt256 = (report: BigNumberish): string => {
    if (BigNumber.from(report).gt(ethers.constants.MaxUint256)) {
        throw new Error(`${report} exceeds max uint256`)
    }
    return (
        '0x' +
        BigNumber.from(report).toHexString().substring(2).padStart(64, '0')
    )
}

/**
 * @public Utility function to produce 32 bits size hexString
 *
 * @param value - the value to convert into a 32bit size hexString
 * @returns a 8 char hexString (without 0x prefix)
 */
export const paddedUInt32 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffff')) {
        throw new Error(`${value} exceeds max uint32`)
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(8, '0')
}

/**
 * @public Utility function to produce 64 bits size hexString
 *
 * @param value - the value to convert into a 64bit size hexString
 * @returns a 16 character hexString (without 0x prefix)
 */
export const paddedUInt64 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffffffffffff')) {
        throw new Error(`${value} exceeds max uint64`)
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(16, '0')
}

/**
 * @public Utility function to produce 128 bits size hexString
 *
 * @param value - the value to convert into a 128bit size hexString
 * @returns a 32 character hexString (without 0x prefix)
 */
export const paddedUInt128 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffffffffffffffffffffffffffff')) {
        throw new Error(`${value} exceeds max uint128`)
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(32, '0')
}

/**
 * @public
 * Utility function that transforms a BigNumberish to an ether address (40 char length hexString)
 *
 * @param address - value as bignumberish
 * @returns hexadecimal string as an ether address (40 char length hexString)
 */
export const paddedUInt160 = (address: BigNumberish): string => {
    if (
        BigNumber.from(address).gt('0xffffffffffffffffffffffffffffffffffffffff')
    ) {
        throw new Error(`${address} exceeds max uint160`)
    }
    return (
        '0x' +
        BigNumber.from(address).toHexString().substring(2).padStart(40, '0')
    )
}

/**
 * @public
 * function to check if the a value is of type BigNumberish, from EthersJS library
 *
 * @param value - the value to check
 * @returns boolean
 */
export function isBigNumberish(value: any): boolean {
    return (
        value != null &&
        (BigNumber.isBigNumber(value) ||
        (typeof value === 'number' && value % 1 === 0) ||
        (typeof value === 'string' && !!value.match(/^-?[0-9]+$/)) ||
        isHexString(value) ||
        typeof value === 'bigint' ||
        isBytes(value))
    )
}

/**
 * @public
 * Extract some of the properites from a Map as a new Map with same keys.
 *
 * @param map - the map to extract from
 * @param properties - name of the properties in second item of the map elements
 * @returns a new Map with extracted properties
 */
export function extractFromMap(
    map: Map<any, any>,
    properties: string[]
): Map<any, any> {
    if (properties.length > 0) {
        const _arr = Array.from(map.entries())
        for (const item of _arr) {
            let _newArr = {}
            for (const key of Object.keys(item[1])) {
                if (properties.includes(key)) {
                    _newArr = {
                        ..._newArr,
                        [key]: item[1][key],
                    }
                }
            }
            item[1] = _newArr
        }
        return new Map(_arr)
    } else return map
}

/**
 * @public
 * Extract some of the properties from a Record as new Record with same keys.
 *
 * @param record - the record to extract from.
 * @param properties - name of the properties in value item of the key/va;ue pair of a Record object
 * @returns a new Record with extracted key/value pairs
 */
export function extractFromRecord<T extends string | number | symbol>(
    record: Record<T, any>,
    properties: string | string[]
): Record<T, any> {
    if (typeof properties === 'string') {
        for (const key in record) {
            for (const value in record[key]) {
                if (properties.includes(value)) {
                    record[key] = record[key][value]
                }
            }
        }
        return record as Record<T, any>
    } else if (properties.length > 0) {
        for (const key in record) {
            for (const value in record[key]) {
                if (!properties.includes(value)) {
                    delete record[key][value]
                }
            }
        }
        return record as Record<T, any>
    } else return record
}

/**
 * @public
 * Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type 
 * acceptable by Record constructor, which are string, number or symbol.
 *
 * @param map - The Map to conver to Record
 * @param properties - (optional) properties to pick from the second item of the Map's elements.
 * @returns a new Record from Map
 */
export function mapToRecord<K extends string | number | symbol>(
    map: Map<K, any>,
    properties?: string[]
): Record<K, any> {
    const _ret: Record<any, any> = {}
    const Properties = properties ? properties : []

    if (Properties.length === 1) {
        for (const [key, value] of map) {
            _ret[key] = value[Properties[0]]
        }

        return _ret as Record<K, any>
    } else {
        for (const [key, value] of extractFromMap(map, Properties)) {
            _ret[key] = value
        }

        return _ret as Record<K, any>
    }
}

/**
 * @public
 * Conver a Record (a key/value pair object) to a equivelant Map. Map keys will 
 * be of type acceptable by Record constructor, which are string, number or symbol.
 *
 * @param record - The Record to convert to a Map
 * @param properties - (optional) properties to pick from the values of key/value 
 * pair items of the Record object.
 * @returns Map Object from Record
 */
export function recordToMap<K extends string | number | symbol>(
    record: Record<K, any>,
    properties?: string | string[]
): Map<K, any> {
    const Properties = properties ? properties : []

    return new Map(
        Object.entries(extractFromRecord(record, Properties))
    ) as Map<K, any>
}

/**
 * @public
 * Checks 2 StateConfig objects to see if they are equal or not
 *
 * @param config1 - first StateConfig
 * @param config2 - second StateConfig
 * @returns boolean
 */
export const areEqualStateConfigs = (
    config1: StateConfig,
    config2: StateConfig
): boolean => {
    if (config1.constants.length !== config2.constants.length) return false
    if (config1.sources.length !== config2.sources.length) return false

    for (let i = 0; i < config1.constants.length; i++) {
        if (
            !BigNumber.from(config1.constants[i]).eq(
                BigNumber.from(config2.constants[i])
            )
        ) return false
    }

    for (let i = 0; i < config1.sources.length; i++) {
        if (
            hexlify(config1.sources[i], { allowMissingPrefix: true }) !== 
            hexlify(config2.sources[i], { allowMissingPrefix: true })
        ) return false
    }

    return true
}

/**
 * @public
 * Deeply freezes an object, all of the properties of propterties gets frozen
 * 
 * @param object - object to freez
 * @returns frozen object
 */
export function deepFreeze(object: any) {
    if (typeof object === 'object') {
        // Retrieve the property names defined on object
        const propNames = Object.getOwnPropertyNames(object)
    
        // Freeze properties before freezing self
        for (const name of propNames) {
            const value = object[name]
            if (value && typeof value === "object") {
                deepFreeze(value)
            }
        }
        return Object.freeze(object)
    }
}

/**
 * @public
 * Method to extract value from operand by specified bits indexes
 * 
 * @param value - Operand value
 * @param bits - Bits indexes to extract
 * @param computation - Any arethmetical operation to apply to extracted value
 * @param computationVar - The variavle in compuation to solve for, default is "bits"
 * @returns Extracted value
 */
export function extractByBits(
    value: number, 
    bits: [number, number], 
    computation?: string,
    computationVar?: string
): number {
    const _var = computationVar ? computationVar : "bits"
    const _binary = Array.from(value.toString(2))
        .reverse()
        .join("")
        .padEnd(16, "0")
    const _extractedVal = Number("0b" + Array.from(_binary.slice(bits[0], bits[1]))
        .reverse()
        .join("")
    )
    if (computation) {
        computation = computation.replace(new RegExp(_var, "g"), _extractedVal.toString())
        const _result = stringMath(computation, (_err, _res) => _res)
        return _result !== null ? _result : NaN;
    }
    else return _extractedVal
}

/**
 * @public
 * Method to construct the operand from operand args
 * 
 * @param args - Operand arguments
 * @returns operand value
 */
export function constructByBits(args: {
    /**
     * The value of argument
     */
    value: number,
    /**
     * The start/end bits indexes
     */
    bits: [number, number],
    /**
     * The arithmetical equation
     */
    computation?: string,
    /**
     * The valid range the value can have after computation applied if computation is specified
     */
    validRange?: number[][],
    /**
     * The variavle in compuation to solve for, default is "arg"
     */
    computationVar?: string
}[]): number | number[] {
    let result = 0
    const error = []
    for (let i = 0; i < args.length; i++) {
        let _val = args[i].value
        const _defaultRange = 2 ** ((args[i].bits[1] - args[i].bits[0]) + 1)
        const _offset = args[i].bits[0] - 0
        let _eq = args[i].computation
        if (_eq) {
            let _var = "arg"
            if (args[i].computationVar) _var = args[i].computationVar as string
            _eq = _eq.replace(new RegExp(_var, "g"), _val.toString())
            const _res = stringMath(_eq, (_err, _res) => _res)
            if (_res !== null) _val = _res
            else  {
                error.push(i)
                break
            }
        }
        if (_val < _defaultRange) {
            const _validRanges = args[i].validRange
            if (_validRanges) {
                for (let j = 0; j < _validRanges.length; j++) {
                    if (_validRanges[j].length === 1) {
                        if (_val === _validRanges[j][0]) {
                            result = 
                                result + 
                                Number("0b" + _val.toString(2) + "0".repeat(_offset))
                            break
                        }
                    }
                    else {
                        if (_validRanges[j][0] <= _val && _val <= _validRanges[j][1]) {
                            result = 
                                result + 
                                Number("0b" + _val.toString(2) + "0".repeat(_offset))
                            break
                        }
                    }
                }
            }
            else {
                result = result + Number("0b" + _val.toString(2) + "0".repeat(_offset))
                break
            }
        }
        else error.push(i)
    }
    if (error.length) return error
    else return result
}

/**
 * @public
 * Validate a meta or array of metas against a schema
 *
 * @param meta - A meta object or array of meta objects or stringified format of them
 * @param schema - Json schema to validate as object (JSON.parsed) or stringified format
 * @returns boolean
 */
export const validateMeta = (
    meta: object | object[] | string,
    schema: object | string
): boolean => {
    const _expandBits = (bits: [number, number]) => {
        const _len = bits[1] - bits[0] + 1
        const _result = []
        for (let i = 0; i < _len; i++) {
            _result.push(bits[0] + i)
        }
        return _result
    }
    let _meta
    let _schema
    if (typeof meta === "string") _meta = JSON.parse(meta)
    else _meta = meta
    if (typeof schema === "string") _schema = JSON.parse(schema)
    else _schema = schema
    const ajv = new Ajv();
    const validate = ajv.compile(_schema);
    if (!Array.isArray(_meta)) _meta = [_meta]

    const _allAliases = []
    for (let i = 0; i < _meta.length; i++) {

        // validate by schema
        if (!validate(_meta[i])) return false;

        // in-depth validation for op meta
        if ("operand" in _meta[i] && "inputs" in _meta[i] && "outputs" in _meta[i]) {

            // cache all aliases for check across all ops
            _allAliases.push(_meta[i].name)
            if (_meta[i].aliases) _allAliases.push(..._meta[i].aliases)

            // check for operand args validity
            if (typeof _meta[i].operand !== "number") {
                let check = true
                for (let j = 0; j < _meta[i].operand.length; j++) {
                    // check computation validity
                    if ("computation" in _meta[i].operand[j]) {
                        let _comp = _meta[i].operand[j].computation
                        _comp = _comp.replace(/arg/g, "30")
                        try { stringMath(_comp) }
                        catch { return false }
                    }
                    // bits range validity
                    if (_meta[i].operand[j].bits[0] > _meta[i].operand[j].bits[1]) return false
                    // check bits overlap
                    const _range1 = _expandBits(_meta[i].operand[j].bits)
                    for (let k = j + 1; k < _meta[i].operand.length; k++) {
                        const _range2 = _expandBits(_meta[i].operand[k].bits)
                        _range1.forEach(v => {
                            if (_range2.includes(v)) check = false
                        })
                        if (!check) return false
                    }
                }
            }

            // check for inputs bits and computation validity
            if (typeof _meta[i].inputs !== "number") {
                // check bits range validity
                if ("bits" in _meta[i].inputs) {
                    if (_meta[i].inputs.bits[0] > _meta[i].inputs.bits[1]) return false
                }
                // check computation validity
                if ("computation" in _meta[i].inputs) {
                    let _comp = _meta[i].inputs.computation
                    _comp = _comp.replace(/bits/g, "30")
                    try { stringMath(_comp) }
                    catch { return false }
                }
            }

            // check for outputs bits and computation validity
            if (typeof _meta[i].outputs !== "number") {
                // check bits range validity
                if (_meta[i].outputs.bits[0] > _meta[i].outputs.bits[1]) return false
                // check computation validity
                if ("computation" in _meta[i].outputs) {
                    let _comp = _meta[i].outputs.computation
                    _comp = _comp.replace(/bits/g, "30")
                    try { stringMath(_comp) }
                    catch { return false }
                }
            }
        }
    }

    // check for overlap among all aliases
    if (_allAliases.length) {
        while (_allAliases.length) {
            const _item = _allAliases.splice(0, 1)[0]
            if (_allAliases.includes(_item)) return false;
        }
    }
    return true;
};
  
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
    let _meta
    let _schema
    if (typeof meta === "string") _meta = JSON.parse(meta)
    else _meta = meta
    if (typeof schema === "string") _schema = JSON.parse(schema)
    else _schema = schema
    if (_schema) {
        if (!validateMeta(_meta, _schema))
            throw new Error("provided meta object is not valid");
    }
    const formatted = format(JSON.stringify(_meta, null, 4), { parser: "json" });
    const bytes = Uint8Array.from(deflateSync(formatted));
    const hex = hexlify(bytes, { allowMissingPrefix: true })
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
    let _schema
    if (typeof schema === "string") _schema = JSON.parse(schema)
    else _schema = schema
    const _bytesArr = arrayify(bytes, { allowMissingPrefix: true })
    const _meta = format(inflateSync(_bytesArr).toString(), { parser: "json" });
    if (_schema) {
        if (!validateMeta(JSON.parse(_meta), _schema))
            throw new Error("invalid meta");
    }
    if (path.length) _write(_meta);
    return JSON.parse(_meta);
};
