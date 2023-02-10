/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * A native type for ethers Hexable
 */
export type Hexable = utils.Hexable;

/**
 * @public
 * An enum for selectLte logic
 */
export enum selectLteLogic {
    every,
    any,
}

/**
 * @public
 * An enum for selectLte mode
 */
export enum selectLteMode {
    min,
    max,
    first,
}

/**
 * @public
 */
export enum MemoryType {
    Stack,
    Constant,
}

/**
 * @public
 */
export enum Debug {
    StatePacked,
    Stack,
}

/**
 * @public
 * All the contract tier levels availables in all ITier contracts.
 */
export enum Tier {
    /**
     * Contract tier level 0. This represent that the uset never has been
     * interacted with the Tier contract.
     */
    ZERO,
    /**
     * Contract tier level 1.
     */
    ONE,
    /**
     * Contract tier level 2.
     */
    TWO,
    /**
     * Contract tier level 3.
     */
    THREE,
    /**
     * Contract tier level 4.
     */
    FOUR,
    /**
     * Contract tier level 5.
     */
    FIVE,
    /**
     * Contract tier level 6.
     */
    SIX,
    /**
     * Contract tier level 7.
     */
    SEVEN,
    /**
     * Contract tier level 8.
     */
    EIGHT,
}

/**
 * @public
 */
export const eighteenZeros = '1000000000000000000';

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
 * Builds the operand for RainInterpreter's `CALL` opcode by packing 3 numbers into a single byte.
 *
 * @param inputSize - number of inputs being passed to the source
 * @param outputSize - number of outputs returned by the source
 * @param sourceIndex - index of function source
 */
export function callOperand(
    inputSize: number,
    outputSize: number,
    sourceIndex: number
): number {
    const operand = (sourceIndex << 8) + (outputSize << 4) + inputSize;
    return operand;
}
  
/**
 * @public
 * Builds the operand for RainInterpreter's `LOOP_N` opcode by packing 4 numbers into a single byte.
 *
 * @param n - loop the source for n times
 * @param inputSize - number of inputs being passed to the source
 * @param outputSize - number of outputs returned by the source
 * @param sourceIndex - index of function source
 */
export function loopNOperand(
    n: number,
    inputSize: number,
    outputSize: number,
    sourceIndex: number
): number {
    const operand = (n << 12) + callOperand(inputSize, outputSize, sourceIndex);
    return operand;
}
  
/**
 * @public
 * Builds the operand for RainInterpreter's `DO_WHILE` opcode by packing 3 numbers into a single byte.
 *
 * @param inputSize - number of inputs being passed to the source
 * @param sourceIndex - index of function source
 */
export function doWhileOperand(
    inputSize: number,
    sourceIndex: number
): number {
    const operand = (sourceIndex << 8) + inputSize;
    return operand;
}

/**
 * @public
 * function to pack start/end tier range into a byte size number for the UPDATE_BLOCKS_FOR_TIER_RANGE opcode
 *
 * @param startTier - the start tier of the updating which ranges between 0 to 8 (exclusive)
 * @param endTier - the end tier of the updating which ranges between 0 to 8 (inclusive)
 * @returns a byte size number
 */
export function tierRange(startTier: number, endTier: number): number {
    //   op_.val & 0x0f, //     00001111
    //   op_.val & 0xf0, //     11110000

    if (startTier < 0 || startTier > 8) {
        throw new Error(`Invalid startTier ${startTier}`)
    } else if (endTier < 0 || endTier > 8) {
        throw new Error(`Invalid endTier ${endTier}`)
    }
    let range = endTier
    range <<= 4
    range += startTier
    return range
}

/**
 * @public
 * Constructs the operand for RainVM's `zipmap` opcode by packing 3 numbers into a single byte.
 * All parameters use zero-based counting i.e. an `fnSize` of 0 means to allocate one element (32 bytes)
 * on the stack to define your functions, while an `fnSize` of 3 means to allocate all four elements
 * (4 * 32 bytes) on the stack.
 *
 * @param sourceIndex - index of function source in `immutableSourceConfig.sources`
 * @param loopSize - number of times to subdivide vals, reduces uint size but allows for more vals (range 0-7)
 * @param valSize - number of vals in outer stack (range 0-7)
 */
export function callSize(
    sourceIndex: number,
    loopSize: number,
    valSize: number
): number {
    // CallSize(
    //   op_.val & 0x07,      // 00000111
    //   op_.val >> 3 & 0x03, // 00011000
    //   op_.val >> 5 & 0x07  // 11100000
    // )

    if (sourceIndex < 0 || sourceIndex > 7) {
        throw new Error('Invalid fnIndex')
    }
    else if (loopSize < 0 || loopSize > 3) {
        throw new Error('Invalid loopSize')
    }
    else if (valSize < 0 || valSize > 7) {
        throw new Error('Invalid valSize')
    }
    let callSize = valSize
    callSize <<= 2
    callSize += loopSize
    callSize <<= 3
    callSize += sourceIndex

    return callSize
}

/**
 * @public
 * function to set up the operand for a SELECT_LTE opcode
 *
 * @param logic - 0 = every, 1 = any, acts like a logical and/or for the check against BLOCK_NUMBER
 * @param mode - 0 = min, 1 = max, 2 = first, the way to select the reports that pass the check against BLOCK_NUMBER
 * @param inputSize - the number of reports to stack for SELECT_LTE opcode
 * @returns a byte size number
 */
export function selectLteOperand(
    logic: number,
    mode: number,
    inputSize: number
): number {
    const operand = (logic << 13) + (mode << 8) + inputSize;
    return operand;
}

/**
 * @public
 * Builds the operand for RainInterpreter's `FOLD_CONTEXT` opcode by packing 4 numbers into 2 bytes.
 *
 * @param inputs - accumulator input count
 * @param width - width of the column 
 * @param foldColumn - column to start from
 * @param sourceIndex - index of function source
 * @returns a 2 bytes size number
 */
export function foldContextOperand(
    inputs: number,
    width: number,
    foldColumn: number,
    sourceIndex: number
): number {
    return (inputs << 12) + (width << 8) + (foldColumn << 4) + sourceIndex
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
 * @returns a new Map
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
 * @returns a new Record i.e. a new key/value pair object
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
 * Conver a Map to a equivelant Record (a key/value pair object). Map keys must be of type acceptable by Record constructor,
 * which are string, number or symbol.
 *
 * @param map - The Map to conver to Record
 * @param properties - (optional) properties to pick from the second item of the Map's elements.
 * @returns a new Record (a key/value pait object)
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
 * Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor,
 * which are string, number or symbol.
 *
 * @param record - The Record to convert to a Map
 * @param properties - (optional) properties to pick from the values of key/value pair items of the Record object.
 * @returns
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
        while (computation.includes(_var)) {
            computation = computation.replace(_var, _extractedVal.toString())
        }
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
    validRange?: ([number] | [number, number])[],
    /**
     * The variavle in compuation to solve for, default is "arg"
     */
    computationVar?: string
}[]): number | number[] {
    let result = 0
    const error = []
    // const _expandBits = (bits: [number, number]) => {
    //     const _len = bits[1] - bits[0] + 1
    //     const _result = []
    //     for (let i = 0; i < _len; i++) {
    //         _result.push(bits[0] + i)
    //     }
    //     return _result
    // }
    // for (let i = 0; i < args.length; i++) {
    //     const _range1 = _expandBits(args[i].bits)
    //     for (let j = i + 1; j < args.length; j++) {
    //         const _range2 = _expandBits(args[j].bits)
    //         _range1.forEach((v1) => {
    //             if (_range2.includes(v1)) return "error"
    //         })
    //     }
    // }
    for (let i = 0; i < args.length; i++) {
        let _val = args[i].value
        const _defaultRange = 2 ** ((args[i].bits[1] - args[i].bits[0]) + 1)
        const _offset = args[i].bits[0] - 0
        let _eq = args[i].computation
        if (_eq) {
            const _var = args[i].computationVar ? args[i].computationVar : "arg"
            while (_eq.includes(_var!)) {
                _eq = _eq.replace(_var!, _val.toString())
            }
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
                        if (_validRanges[j][0] <= _val && _val <= _validRanges[j][1]!) {
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
 * @param meta - A meta object or array of meta objects (JSON.parsed from meta json file)
 * @param schema - Json schema as object (JSON.parsed) to validate
 * @returns boolean
 */
export const validateMeta = (meta: any, schema: any): boolean => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    if (meta.length) {
        for (let i = 0; i < meta.length; i++) {
            if (!validate(meta[i])) return false;
        }
    } else {
        if (!validate(meta)) return false;
    }
    return true;
};
  
/**
   * @public
   * Convert meta or array of metas or a schema to bytes and compress them for on-chain deployment
   *
   * @param meta - A meta object or array of meta objects (JSON.parsed from meta json file)
   * @param schema - (optional) Json schema as object (JSON.parsed) to validate
   * @param path - (optional) The path to write the file to if generating an output json file is desired, example: path/to/name.json
   * @returns Bytes as HexString
   */
export const bytesFromMeta = (
    meta: any,
    schema?: any,
    path?: string
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
  
    const formatted = format(JSON.stringify(meta, null, 4), { parser: "json" });
    const bytes = Uint8Array.from(deflateSync(formatted));
    let hex = "0x";
    for (let i = 0; i < bytes.length; i++) {
        hex = hex + bytes[i].toString(16).padStart(2, "0");
    }
    if (schema) {
        if (!validateMeta(meta, schema))
            throw new Error("provided meta object is not valid");
    }
    if (path && path.length) _write(formatted);
    return hex;
};
  
/**
   * @public
   * Decompress and convert bytes to meta
   *
   * @param bytes - Bytes to decompress and convert to json
   * @param schema - (optional) Json schema as object (JSON.parsed) to validate
   * @param path - (optional) The path to write the file to if generating an output json file is desired, example: path/to/name.json
   * @returns meta content as object
   */
export const metaFromBytes = (
    bytes: string | Uint8Array,
    schema?: any,
    path?: string
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
  
    let _uint8Arr: Uint8Array;
    if (typeof bytes === "string") {
        if (bytes.startsWith("0x")) bytes = bytes.slice(2);
        const _bytesArr = [];
        for (let i = 0; i < bytes.length; i += 2) {
            _bytesArr.push(Number("0x" + bytes.slice(i, i + 2)));
        }
        _uint8Arr = Uint8Array.from(_bytesArr);
    } else {
        _uint8Arr = bytes;
    }
    const _meta = format(inflateSync(_uint8Arr).toString(), { parser: "json" });
  
    if (schema) {
        if (!validateMeta(JSON.parse(_meta), schema))
            throw new Error("invalid meta");
    }
    if (path && path.length) _write(_meta);
    return JSON.parse(_meta);
};
