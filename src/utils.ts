import Ajv from "ajv";
import { Buffer } from "buffer/";
import stringMath from "string-math";
import { deflate, inflate } from "pako";
import { decodeAllSync } from "cbor-web";
import { format } from "prettier/standalone";
import babelParser from "prettier/parser-babel";
import { ExpressionConfig } from "./compiler/expressionConfigTypes";
import { BigNumber, BigNumberish, utils, ethers, BytesLike } from 'ethers';

/**
 * @public ethers constants
 */
export const CONSTANTS = ethers.constants;
export { BytesLike, BigNumber, BigNumberish };
export const {
    /**
     * @public ethers concat
     */
    concat,
    /**
     * @public ethers hexlify
     */
    hexlify,
    /**
     * @public ethers zeroPad
     */
    zeroPad,
    /**
     * @public ethers hexZeroPad
     */
    hexZeroPad,
    /**
     * @public ethers arrayify
     */
    arrayify,
    /**
     * @public ethers parseUnits
     */
    parseUnits,
    /**
     * @public ethers isBytes
     */
    isBytes,
    /**
     * @public ethers isBytesLike
     */
    isBytesLike,
    /**
     * @public ethers isHexString
     */
    isHexString
} = utils;


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
    return zeroPad(hexlify(value), bytesLength);
};

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
    return concat([bytify(code, 2), bytify(erand, 2)]);
};

/**
 * @public
 * Constructs operand for standard STATE opecode
 * 
 * @param type - Type of the opcode, either 'stack' or 'constant'
 * @param offset - the position of the item in respect to its type
 */
export function memoryOperand(offset: number, type: number): number {
    return (offset << 1) + type;
}

/**
 * @public
 * Utility function that transforms a BigNumberish from the output of the ITierV2 contract report
 *
 * @param report - report as bignumberish from the ITierV2 contract
 * @returns hexadecimal string of the report already padded (64 char hexString)
 */
export const paddedUInt256 = (report: BigNumberish): string => {
    if (BigNumber.from(report).gt(CONSTANTS.MaxUint256)) {
        throw new Error(`${report} exceeds max uint256`);
    }
    return (
        '0x' +
        BigNumber.from(report).toHexString().substring(2).padStart(64, '0')
    );
};

/**
 * @public Utility function to produce 32 bits size hexString
 *
 * @param value - the value to convert into a 32bit size hexString
 * @returns a 8 char hexString (without 0x prefix)
 */
export const paddedUInt32 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffff')) {
        throw new Error(`${value} exceeds max uint32`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(8, '0');
};

/**
 * @public Utility function to produce 64 bits size hexString
 *
 * @param value - the value to convert into a 64bit size hexString
 * @returns a 16 character hexString (without 0x prefix)
 */
export const paddedUInt64 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffffffffffff')) {
        throw new Error(`${value} exceeds max uint64`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(16, '0');
};

/**
 * @public Utility function to produce 128 bits size hexString
 *
 * @param value - the value to convert into a 128bit size hexString
 * @returns a 32 character hexString (without 0x prefix)
 */
export const paddedUInt128 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt('0xffffffffffffffffffffffffffffffff')) {
        throw new Error(`${value} exceeds max uint128`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(32, '0');
};

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
        throw new Error(`${address} exceeds max uint160`);
    }
    return (
        '0x' +
        BigNumber.from(address).toHexString().substring(2).padStart(40, '0')
    );
};

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
    );
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
        const _arr = Array.from(map.entries());
        for (const item of _arr) {
            let _newArr = {};
            for (const key of Object.keys(item[1])) {
                if (properties.includes(key)) {
                    _newArr = {
                        ..._newArr,
                        [key]: item[1][key],
                    };
                }
            }
            item[1] = _newArr;
        }
        return new Map(_arr);
    } else return map;
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
                    record[key] = record[key][value];
                }
            }
        }
        return record as Record<T, any>;
    } else if (properties.length > 0) {
        for (const key in record) {
            for (const value in record[key]) {
                if (!properties.includes(value)) {
                    delete record[key][value];
                }
            }
        }
        return record as Record<T, any>;
    } else return record;
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
    const _ret: Record<any, any> = {};
    const Properties = properties ? properties : [];

    if (Properties.length === 1) {
        for (const [key, value] of map) {
            _ret[key] = value[Properties[0]];
        }

        return _ret as Record<K, any>;
    } else {
        for (const [key, value] of extractFromMap(map, Properties)) {
            _ret[key] = value;
        }

        return _ret as Record<K, any>;
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
    const Properties = properties ? properties : [];

    return new Map(
        Object.entries(extractFromRecord(record, Properties))
    ) as Map<K, any>;
}

/**
 * @public
 * Checks 2 ExpressionConfig objects to see if they are equal or not
 *
 * @param config1 - first ExpressionConfig
 * @param config2 - second ExpressionConfig
 * @returns boolean
 */
export const areEqualStateConfigs = (
    config1: ExpressionConfig,
    config2: ExpressionConfig
): boolean => {
    if (config1.constants.length !== config2.constants.length) return false;
    if (config1.sources.length !== config2.sources.length) return false;

    for (let i = 0; i < config1.constants.length; i++) {
        if (
            !BigNumber.from(config1.constants[i]).eq(
                BigNumber.from(config2.constants[i])
            )
        ) return false;
    }

    for (let i = 0; i < config1.sources.length; i++) {
        if (
            hexlify(config1.sources[i], { allowMissingPrefix: true }) !== 
            hexlify(config2.sources[i], { allowMissingPrefix: true })
        ) return false;
    }

    return true;
};

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
        const propNames = Object.getOwnPropertyNames(object);
    
        // Freeze properties before freezing self
        for (const name of propNames) {
            const value = object[name];
            if (value && typeof value === "object") {
                deepFreeze(value);
            }
        }
        return Object.freeze(object);
    }
}

/**
 * @public
 * Deep copy an item in a way that all of its properties get new reference
 * 
 * @param variable - The variable to copy
 * @returns a new deep copy of the variable
 */
export function deepCopy<T>(variable: T): T {
    let _result: any;
    if (Array.isArray(variable)) {
        _result = [] as T;
        for (let i = 0; i < variable.length; i++) {
            _result.push(deepCopy(variable[i]));
        }
    }
    else if (typeof variable === "object") {
        _result = {};
        const _keys = Object.keys(variable as object);
        for (let i = 0; i < _keys.length; i++) {
            _result[_keys[i]] = deepCopy((variable as any)[_keys[i]]);
        }
    }
    else _result = variable;
    return _result as T;
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
    const _var = computationVar ? computationVar : "bits";
    const _binary = Array.from(value.toString(2))
        .reverse()
        .join("")
        .padEnd(16, "0");
    const _extractedVal = Number("0b" + Array.from(_binary.slice(bits[0], bits[1]))
        .reverse()
        .join("")
    );
    if (computation) {
        computation = computation.replace(new RegExp(_var, "g"), _extractedVal.toString());
        const _result = stringMath(computation, (_err, _res) => _res);
        return _result !== null ? _result : NaN;
    }
    else return _extractedVal;
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
    let result = 0;
    const error = [];
    for (let i = 0; i < args.length; i++) {
        let _val = args[i].value;
        const _defaultRange = 2 ** ((args[i].bits[1] - args[i].bits[0]) + 1);
        const _offset = args[i].bits[0] - 0;
        let _eq = args[i].computation;
        if (_eq) {
            let _var = "arg";
            if (args[i].computationVar) _var = args[i].computationVar as string;
            _eq = _eq.replace(new RegExp(_var, "g"), _val.toString());
            const _res = stringMath(_eq, (_err, _res) => _res);
            if (_res !== null) _val = _res;
            else error.push(i);
        }
        if (_val < _defaultRange) {
            const _validRanges = args[i].validRange;
            if (_validRanges) {
                let check1 = true;
                let check2 = true;
                for (let j = 0; j < _validRanges.length; j++) {
                    if (_validRanges[j].length === 1) {
                        if (check2 && _val === _validRanges[j][0]) {
                            check1 = false;
                            check2 = false;
                            result = 
                                result + 
                                Number("0b" + _val.toString(2) + "0".repeat(_offset));
                        }
                    }
                    else {
                        if (check2 && _validRanges[j][0] <= _val && _val <= _validRanges[j][1]) {
                            check1 = false;
                            check2 = false;
                            result = 
                                result + 
                                Number("0b" + _val.toString(2) + "0".repeat(_offset));
                        }
                    }
                }
                if (check1) error.push(i);
            }
            else result = result + Number("0b" + _val.toString(2) + "0".repeat(_offset));
        }
        else error.push(i);
    }
    if (error.length) return error;
    else return result;
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
        const _len = bits[1] - bits[0] + 1;
        const _result = [];
        for (let i = 0; i < _len; i++) {
            _result.push(bits[0] + i);
        }
        return _result;
    };
    let _meta;
    let _schema;
    if (typeof meta === "string") _meta = JSON.parse(meta);
    else _meta = meta;
    if (typeof schema === "string") _schema = JSON.parse(schema);
    else _schema = schema;
    const ajv = new Ajv();
    const validate = ajv.compile(_schema);
    if (!Array.isArray(_meta)) _meta = [_meta];

    const _allAliases = [];
    for (let i = 0; i < _meta.length; i++) {
        
        // validate by schema
        if (!validate(_meta[i])) throw new Error(
            `invalid meta for ${_meta[i].name}, reason: failed schema validation`
        );
  
        // in-depth validation for op meta
        if ("operand" in _meta[i] && "inputs" in _meta[i] && "outputs" in _meta[i]) {
            let hasOperandArg = false;
            let hasInputOperandArg = false;
            let hasInputOperandArgComp = false;
            let hasOutputOperandArg = false;
            let hasOutputOperandArgComp = false;
  
            // cache all aliases for check across all ops
            _allAliases.push(_meta[i].name);
            if (_meta[i].aliases) _allAliases.push(..._meta[i].aliases);
  
            // check for operand args validity
            if (typeof _meta[i].operand !== "number") {
                hasOperandArg = true;
                let check = true;
                for (let j = 0; j < _meta[i].operand.length; j++) {
                    if (_meta[i].operand[j].name === "inputs") {
                        if (hasInputOperandArg) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: double "inputs" named operand args`
                        );
                        hasInputOperandArg = true;
                        if ("computation" in _meta[i].operand[j]) hasInputOperandArgComp = true;
                    }
                    if (_meta[i].operand[j].name === "outputs") {
                        if (hasOutputOperandArg) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: double "outputs" named operand args`
                        );
                        hasOutputOperandArg = true;
                        if ("computation" in _meta[i].operand[j]) hasOutputOperandArgComp = true;
                    }
  
                    // check computation validity
                    if ("computation" in _meta[i].operand[j]) {
                        let _comp = _meta[i].operand[j].computation;
                        _comp = _comp.replace(/arg/g, "30");
                        try { stringMath(_comp); }
                        catch { throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: bad "computation" equation for ${_meta[i].operand[j].name}`
                        );}
                    }
                    // bits range validity
                    if (_meta[i].operand[j].bits[0] > _meta[i].operand[j].bits[1]) throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: start bit greater than end bit for ${_meta[i].operand[j].name}`
                    );
                    // check bits
                    const _range1 = _expandBits(_meta[i].operand[j].bits);
                    for (let k = j + 1; k < _meta[i].operand.length; k++) {
                        // check order of operand args by bits index from low bits to high
                        if (_meta[i].operand[j].bits[0] <= _meta[i].operand[k].bits[1]) {
                            throw new Error(
                                `invalid meta for ${_meta[i].name}, reason: bad operand args order, should be from high to low`
                            );
                        }
                        // check operand args bits overlap
                        const _range2 = _expandBits(_meta[i].operand[k].bits);
                        _range1.forEach(v => {
                            if (_range2.includes(v)) check = false;
                        });
                        if (!check) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: operand args bits overlap`
                        );
                    }
                }
            }
  
            // check for inputs bits and computation validity and validity against operand
            if (typeof _meta[i].inputs !== "number") {
                // check validity against operand
                if (hasInputOperandArg) {
                    if (!("bits" in _meta[i].inputs)) throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: must have specified "bits" field for inputs`
                    );
                    if (hasInputOperandArgComp) {
                        if (!("computation" in _meta[i].inputs)) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: must have specified "computation" field for inputs`
                        );
                    }
                    else {
                        if ("computation" in _meta[i].inputs) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: unexpected "computation" field for inputs`
                        );
                    }
                }
                else {
                    if (
                        "bits" in _meta[i].inputs ||
              "computation" in _meta[i].inputs
                    ) throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: unexpected "bits" or "computation" fields for inputs`
                    );
                }
                // check bits range validity
                if ("bits" in _meta[i].inputs) {
                    if (_meta[i].inputs.bits[0] > _meta[i].inputs.bits[1]) throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: start bit greater than end bit for inputs`
                    );
                }
                // check computation validity
                if ("computation" in _meta[i].inputs) {
                    let _comp = _meta[i].inputs.computation;
                    _comp = _comp.replace(/bits/g, "30");
                    try { stringMath(_comp); }
                    catch { throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: bad "computation" equation for inputs`
                    );}
                }
            }
            else {
                if (hasInputOperandArg) throw new Error(
                    `invalid meta for ${_meta[i].name}, reason: unexpected input type, must be derived from bits`
                );
            }
  
            // check for outputs bits and computation validity and validity against operand
            if (typeof _meta[i].outputs !== "number") {
                // check validity against operand
                if (!hasOperandArg) throw new Error(
                    `invalid meta for ${_meta[i].name}, reason: cannot have computed output`
                );
                if (hasOutputOperandArg) {
                    if (hasOutputOperandArgComp) {
                        if (!("computation" in _meta[i].outputs)) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: must have specified "computation" field for outputs`
                        );
                    }
                    else {
                        if ("computation" in _meta[i].outputs) throw new Error(
                            `invalid meta for ${_meta[i].name}, reason: unexpected "computation" field for outputs`
                        );
                    }
                }
                // check bits range validity
                if (_meta[i].outputs.bits[0] > _meta[i].outputs.bits[1]) throw new Error(
                    `invalid meta for ${_meta[i].name}, reason: start bit greater than end bit for outputs`
                );
                // check computation validity
                if ("computation" in _meta[i].outputs) {
                    let _comp = _meta[i].outputs.computation;
                    _comp = _comp.replace(/bits/g, "30");
                    try { stringMath(_comp); }
                    catch { throw new Error(
                        `invalid meta for ${_meta[i].name}, reason: bad "computation" equation for outputs`
                    );}
                }
            }
            else {
                if (hasOutputOperandArg) throw new Error(
                    `invalid meta for ${_meta[i].name}, reason: unexpected output type, must be derived from bits`
                );
            }
        }
    }
  
    // check for overlap among all aliases
    if (_allAliases.length) {
        while (_allAliases.length) {
            const _item = _allAliases.splice(0, 1)[0];
            if (_allAliases.includes(_item)) throw new Error(
                `invalid meta, reason: duplicated names or aliases "${_item}"`
            );
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

/**
 * @public
 * Magic numbers used to identify Rain documents. This use `BigInt` with their
 * literal numbers.
 *
 * See more abour Magic numbers:
 * https://github.com/rainprotocol/metadata-spec/blob/main/README.md
 */
export const MAGIC_NUMBERS = {
    /**
     * Prefixes every rain meta document
     */
    RAIN_META_DOCUMENT: BigInt("0xff0a89c674ee7874"),
    /**
     * Solidity ABIv2
     */
    SOLIDITY_ABIV2: BigInt("0xffe5ffb4a3ff2cde"),
    /**
     * Ops meta v1
     */
    OPS_META_V1: BigInt("0xffe5282f43e495b4"),
    /**
     * Contract meta v1
     */
    CONTRACT_META_V1: BigInt("0xffc21bbf86cc199b"),
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
    return decodeAllSync(dataEncoded_);
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
