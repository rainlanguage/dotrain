import { isMap } from "util/types";
import stringMath from "string-math";
import { EncodedMetaType, MetaSequence } from "./dotrain/metaStore";
import { BigNumber, BigNumberish, utils, ethers, BytesLike } from "ethers";
import { MAGIC_NUMBERS, cborDecode, isMagicNumber } from "@rainprotocol/meta";
import { 
    Range, 
    Position, 
    TextDocument, 
    PositionOffset, 
    ExpressionConfig, 
    TextDocumentContentChangeEvent, 
    WORD_PATTERN,
    Namespace,
    NamespaceNode
} from "./rainLanguageTypes";


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
 * Method to be used as Tagged Templates to activate embedded rainlang in 
 * javascript/typescript in vscode that highlights the rainlang syntax. 
 * Requires rainlang vscode extension to be installed.
 */
export function rainlang(
    stringChunks: TemplateStringsArray,
    ...vars: any[]
): string {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
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
        "0x" +
        BigNumber.from(report).toHexString().substring(2).padStart(64, "0")
    );
};

/**
 * @public Utility function to produce 32 bits size hexString
 *
 * @param value - the value to convert into a 32bit size hexString
 * @returns a 8 char hexString (without 0x prefix)
 */
export const paddedUInt32 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt("0xffffffff")) {
        throw new Error(`${value} exceeds max uint32`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(8, "0");
};

/**
 * @public Utility function to produce 64 bits size hexString
 *
 * @param value - the value to convert into a 64bit size hexString
 * @returns a 16 character hexString (without 0x prefix)
 */
export const paddedUInt64 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt("0xffffffffffffffff")) {
        throw new Error(`${value} exceeds max uint64`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(16, "0");
};

/**
 * @public Utility function to produce 128 bits size hexString
 *
 * @param value - the value to convert into a 128bit size hexString
 * @returns a 32 character hexString (without 0x prefix)
 */
export const paddedUInt128 = (value: BigNumberish): string => {
    if (BigNumber.from(value).gt("0xffffffffffffffffffffffffffffffff")) {
        throw new Error(`${value} exceeds max uint128`);
    }
    return BigNumber.from(value).toHexString().substring(2).padStart(32, "0");
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
        BigNumber.from(address).gt("0xffffffffffffffffffffffffffffffffffffffff")
    ) {
        throw new Error(`${address} exceeds max uint160`);
    }
    return (
        "0x" +
        BigNumber.from(address).toHexString().substring(2).padStart(40, "0")
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
        (typeof value === "number" && value % 1 === 0) ||
        (typeof value === "string" && !!value.match(/^-?[0-9]+$/)) ||
        isHexString(value) ||
        typeof value === "bigint" ||
        isBytes(value))
    );
}

/**
 * @public
 * Extract some of the properties from a Map as a new Map with same keys.
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
    if (typeof properties === "string") {
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
 * Conver a Map to a equivalent Record (a key/value pair object). Map keys must be of type 
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
 * Conver a Record (a key/value pair object) to a equivalent Map. Map keys will 
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
 * @param object - object to freeze
 * @returns frozen object
 */
export function deepFreeze(object: any) {
    if (typeof object === "object") {
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
 * @param computationVar - The variable in computation to solve for, default is "bits"
 * @returns Extracted value
 */
export function extractByBits(
    value: number, 
    bits: [number, number], 
    computation?: string,
    computationVar?: string
): number {
    const _var = computationVar ? computationVar : "bits";
    const _binary = value.toString(2).padStart(16, "0");
    const _extractedVal = Number("0b" + _binary.slice(
        _binary.length - bits[1] - 1,
        _binary.length - bits[0]
    ));
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
 * @public Checks if a position is within a range
 * @param range - The range to check
 * @param position - The position to check
 * @returns True if the position is in range and false if not
 */
export function isInRange(range: Range, position: Position): boolean {
    if (position.line < range.start.line || position.line > range.end.line) return false;
    else {
        if (position.line === range.start.line) {
            if (position.character < range.start.character) return false;
            else {
                if (range.start.line === range.end.line) {
                    if (position.character > range.end.character) return false;
                    else return true;
                }
                else return true;
            }
        }
        else if (position.line === range.end.line) {
            if (position.character > range.end.character) return false;
            else return true;
        }
        else return true;
    }
}

/**
 * @public Checks if a range is empty
 * @param range - The range to check
 * @returns True if the range is empty and false if not
 */
export function isEmptyRange(range: Range): boolean {
    if (range.start.line === range.end.line) {
        if (range.start.character === range.end.character) return true;
        else return false;
    }
    else return false;
}

/**
 * @public Checks if 2 ranges match exactly together
 * @param range1 - The first range
 * @param range2 - The second range
 * @returns True if the ranges match and false if they don't
 */
export function matchRange(range1: Range, range2: Range): boolean {
    if (
        range1.start.line === range2.start.line &&
		range1.end.line === range2.end.line &&
		range1.start.character === range2.start.character &&
		range1.end.character === range2.end.character
    ) return true;
    else return false;
}

/**
 * @public Type for result of matches found in a string
 */
export type ParsedChunk = [string, [number, number]];

/**
 * @public The namespace provides function to type checking
 */
export namespace ParsedChunk {
    export function is(value: any): value is ParsedChunk {
        return Array.isArray(value)
            && value.length === 2
            && typeof value[0] === "string"
            && Array.isArray(value[1])
            && value[1].length === 2
            && value[1].every(v => typeof v === "number" && Number.isInteger(v));
    }
}

/**
 * @public Parses an string by extracting matching strings
 * @param str - The string to parse
 * @param pattern - The pattern to search and extract
 * @param offset - (optional) The offset to factor in for returning matched positions
 */
export function inclusiveParse(
    str: string, 
    pattern: RegExp,
    offset = 0
): ParsedChunk[] {
    let flags = pattern.flags;
    if (!flags.includes("g")) flags += "g";
    if (!flags.includes("d")) flags += "d";
    return Array.from(
        str.matchAll(new RegExp(pattern.source, flags))
    ).map((v: any) => 
        [v[0], [offset + v.indices[0][0], offset + v.indices[0][1] - 1]]
    ) as ParsedChunk[];
}

/**
 * @public Parses an string by extracting the strings outside of matches
 * @param str - The string to parse
 * @param pattern - The pattern to search and extract
 * @param offset - (optional) The offset to factor in for returning matched positions
 * @param includeEmptyEnds - (optional) Includes start/end empty matches in the results if true
 * @returns An array of strings outside of matchings and their position inclusive at both ends
 */
export function exclusiveParse(
    str: string, 
    pattern: RegExp,
    offset = 0,
    includeEmptyEnds = false
): ParsedChunk[] {
    const matches = inclusiveParse(str, pattern);
    const strings = str.split(pattern);
    const result: ParsedChunk[] = [];
    if (strings[0] || includeEmptyEnds) result.push([
        strings[0],
        [ 0 + offset, (matches.length ? matches[0][1][0] : str.length) + offset - 1 ]
    ]);
    matches.forEach((v, i, a) => {
        if (a.length - 1 === i) {
            if (strings[i + 1] || includeEmptyEnds) result.push([
                strings[i + 1],
                [ v[1][1] + 1 + offset, (a[i + 1] ? a[i + 1][1][0] : str.length) + offset - 1 ]
            ]);
        }
        else result.push([
            strings[i + 1],
            [ v[1][1] + 1 + offset, (a[i + 1] ? a[i + 1][1][0] : str.length) + offset - 1 ]
        ]);
    });
    return result;
}

/**
 * @public Generates random integer between 0(inclusive) and max(exclusive)
 * 
 * @param max - The maximum range to generate random number
 * @returns The random number
 */
export function getRandomInt(max: number) {
    if (max <= 1) throw "max value must be greater than 1";
    return Math.floor(Math.random() * max);
}

/**
 * @public Method to get a line from a TextDocument
 * 
 * @param textDocument - The TextDocument instance
 * @param line - The line to get its content
 * @returns The text string of the line
 */
export function getLineText(textDocument: TextDocument, line: number): string {
    if (line < 0) line = 0;
    if (line >= textDocument.lineCount) return textDocument.getText(
        Range.create(textDocument.lineCount - 1, 0, textDocument.lineCount, 0)
    );
    else return textDocument.getText(Range.create(line, 0, line + 1, 0));
}

/**
 * @public Fills a poistion in a text with whitespaces by keeping line structure intact
 * 
 * @param text - The text
 * @param position - The position offsets to include
 * @returns The edited text string
 */
export function fillIn(
    text: string, 
    position: PositionOffset
): string {
    const _textDocument = TextDocument.create("virtual", "rainlang", 0, text);
    const _changes: TextDocumentContentChangeEvent[] = [];
    const _sPos = _textDocument.positionAt(position[0]);
    const _ePos = _textDocument.positionAt(position[1] + 1);
    if (_sPos.line === _ePos.line) _changes.push({
        range: Range.create(_sPos, _ePos),
        text: " ".repeat(_ePos.character - _sPos.character)
    });
    else {
        for (let i = 0; i <= _ePos.line - _sPos.line; i++) {
            if (i === 0) {
                const _text = _textDocument.getText(
                    Range.create(_sPos, {line: _sPos.line + 1, character: 0})
                );
                _changes.push({
                    range: Range.create(_sPos, {line: _sPos.line + 1, character: 0}),
                    text: _text.endsWith("\r\n") 
                        ? " ".repeat(_text.length - 2) + _text.slice(-2)
                        : " ".repeat(_text.length - 1) + _text.slice(-1)
                });
            }
            else if (i === _ePos.line - _sPos.line) {
                const _text = _textDocument.getText(
                    Range.create({line: _ePos.line, character: 0}, _ePos)
                );
                _changes.push({
                    range: Range.create({line: _ePos.line, character: 0}, _ePos),
                    text: " ".repeat(_text.length)
                });
            }
            else {
                const _text = getLineText(_textDocument, _sPos.line + i);
                _changes.push({
                    range: Range.create(_sPos.line + i, 0, _sPos.line + i + 1, 0),
                    text: _text.endsWith("\r\n") 
                        ? " ".repeat(_text.length - 2) + _text.slice(-2) 
                        : " ".repeat(_text.length - 1) + _text.slice(-1)
                });
            }
        }
    }
    TextDocument.update(_textDocument, _changes, _textDocument.version);
    return _textDocument.getText();
}

/**
 * @public Fills a text with whitespaces excluding a position by keeping line structure intact
 * 
 * @param text - The text
 * @param position - the position to exclude
 * @returns The edited text string
 */
export function fillOut(
    text: string, 
    position: PositionOffset
): string {
    const _start = fillIn(text.slice(0, position[0]), [0, position[0] - 1]);
    const _endText = text.slice(position[1] + 1);
    const _end = fillIn(
        _endText, 
        [0, _endText.length - 1]
    );
    return _start + text.slice(position[0], position[1] + 1) + _end;
}

/**
 * @public 
 * Trims a text (removing start/end whitespaces) with reporting the number of deletions
 * @param str - The text to trim
 */
export function trim(str: string): {text: string, startDelCount: number, endDelCount: number} {
    return {
        text: str.trim(),
        startDelCount: str.length - str.trimStart().length,
        endDelCount: str.length - str.trimEnd().length
    };
}

/**
 * @public Checks if metaBytes are a sequence or content or none
 * @param metaBytes - The meta bytes to check the type for
 */
export function getEncodedMetaType(metaBytes: string): EncodedMetaType {
    const _rainMetaHeader = MAGIC_NUMBERS.RAIN_META_DOCUMENT.toString(16).toLowerCase();
    const _metaBytes = metaBytes.startsWith("0x") 
        ? metaBytes.slice(2).toLowerCase() 
        : metaBytes.toLowerCase();
    if (!isBytesLike("0x" + _metaBytes)) throw "expected BytesLike parameter";
    if (_metaBytes.startsWith(_rainMetaHeader)) {
        try {
            const _encoded = cborDecode(_metaBytes.replace(_rainMetaHeader, ""));
            if (
                Array.isArray(_encoded)
                && _encoded.length > 0
                && _encoded.every(v => isMap(v)
                    && isBytesLike(v.get(0))
                    && isMagicNumber(v.get(1))
                    && v.get(2) === "application/json"
                )
            ) return "sequence";
            else throw "invalid rain meta";
        }
        catch { throw "invalid rain meta"; }
    }
    else {
        try {
            const _encoded = cborDecode(_metaBytes);
            if (
                Array.isArray(_encoded)
                && _encoded.length === 1
                && _encoded.every(v => isMap(v)
                    && isBytesLike(v.get(0))
                    && isMagicNumber(v.get(1))
                    && v.get(2) === "application/json"
                )
            ) return "single";
            else throw "invalid rain meta";
        }
        catch { throw "invalid rain meta"; }
    }
}

/**
 * @public Method to check if a meta sequence is consumable for a dotrain
 * @param sequence - The sequence to check
 */
export function isConsumableMetaSequence(sequence: MetaSequence): boolean {
    if (
        !sequence.length ||
        (
            sequence.filter(v => v.magicNumber === MAGIC_NUMBERS.CONTRACT_META_V1).length > 1
            || sequence.filter(v => v.magicNumber === MAGIC_NUMBERS.OPS_META_V1).length > 1
            || sequence.filter(v => v.magicNumber === MAGIC_NUMBERS.DOTRAIN).length > 1
        )
    ) return false;
    else return true;
}

/**
 * @public Method to check there is a duplicate id in 2 arrays of string
 * @param arr1 - Firts string array
 * @param arr2 - Second string array
 */
export function hasDuplicate(arr1: string[], arr2: string[]): boolean {
    for (let i = 0; i < arr1.length; i++) {
        if (arr2.includes(arr1[i])) return true;
    }
    return false;
}

/**
 * @public Convert Rainlang numeric values to covenient numeric value
 * @param value - The value to convert
 */
export function toConvNumber(value: string): string {
    let _val;
    if (isBigNumberish(value)) _val = value;
    else if (value.startsWith("0b")) _val = Number(value).toString();
    else {
        const _nums = value.match(/\d+/g)!;
        _val = _nums[0] + "0".repeat(Number(_nums[1]));
    }
    return _val;
}

/**
 * @public Search in a Namespace for a given name
 * @param name - The name
 * @param namespace - The Namespace
 * @returns An object that contains the found item and the parent namespace
 */
export function namespaceSearch(
    name: string, 
    namespace: Namespace
): {
    child: Namespace | NamespaceNode;
    parent: Namespace;
} {
    const _names = exclusiveParse(name, /\./gd, undefined, true);
    if (name.startsWith(".")) _names.shift();
    if (_names.length > 32) throw "namespace too deep";
    if (!_names[_names.length - 1][0]) throw "expected to end with a node";
    if (_names.filter(v => !WORD_PATTERN.test(v[0])).length) throw "invalid word pattern";
    const _result: any = {
        child: namespace,
        parent: null
    };
    for (let i = 0; i < _names.length; i++) {
        _result.parent = _result.child;
        if (_result.child[_names[i][0]]) {
            _result.child = _result.child[_names[i][0]];
        }
        else throw "undefined identifier";
    }
    return _result;
}
