import { EVM } from "@ethereumjs/evm";
import { MAGIC_NUMBERS } from "@rainprotocol/meta";
import { Address, Account } from "@ethereumjs/util";
import { BigNumber, BigNumberish, utils, constants, BytesLike } from "ethers";
import { 
    AST, 
    Range, 
    Position, 
    TextDocument, 
    TextDocumentContentChangeEvent 
} from "../languageTypes";

/**
 * @public ethers constants
 */
export const CONSTANTS = constants;
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
    isHexString,
    /**
     * @public ethers isAddress
     */
    isAddress,
    /**
     * @public ethers keccak256
     */
    keccak256
} = utils;

/**
 * @public vitalik address used for evm simulations
 */
export const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const;

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
    position: AST.Offsets
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
    position: AST.Offsets
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
export function trackedTrim(str: string): {
    text: string, 
    startDelCount: number, 
    endDelCount: number
} {
    return {
        text: str.trim(),
        startDelCount: str.length - str.trimStart().length,
        endDelCount: str.length - str.trimEnd().length
    };
}

/**
 * @public Method to check if a meta sequence is consumable for a dotrain
 * @param amps - The meta cbor maps array
 */
export function isConsumableMeta(maps: Map<any, any>[]): boolean {
    if (
        !maps.length ||
        (
            maps.filter(v => v.get(1) === MAGIC_NUMBERS.DOTRAIN_V1).length > 1
            || maps.filter(v => v.get(1) === MAGIC_NUMBERS.CONTRACT_META_V1).length > 1
            || maps.filter(v => 
                v.get(1) === MAGIC_NUMBERS.EXPRESSION_DEPLOYER_V2_BYTECODE_V1
            ).length > 1
            || maps.filter(v => 
                v.get(1) === MAGIC_NUMBERS.DOTRAIN_V1 ||
                v.get(1) === MAGIC_NUMBERS.CONTRACT_META_V1 ||
                v.get(1) === MAGIC_NUMBERS.EXPRESSION_DEPLOYER_V2_BYTECODE_V1
            ).length === 0
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
 * @public Convert Rainlang numeric values to interger as string
 * @param value - The value to convert
 */
export function toInteger(value: string): string {
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
 * @public Converts a string to uint8array using TextEncoder
 * @param text - the text to convert
 */
export const stringToUint8Array = (text: string): Uint8Array => {
    const encoder = new TextEncoder();
    return encoder.encode(text);
};

/**
 * @public Method to convert Uint8Array to string using TextDecoder
 * @param uint8array - The array
 */
export function uint8ArrayToString(uint8array: Uint8Array): string {
    const decoder = new TextDecoder("utf-16");
    return decoder.decode(uint8array);
}

/**
 * @public Executes a contract bytecode given the contract abi, fnunction name and args
 * @param bytecode - The contract deployed byetcode
 * @param abi - The contract ABI
 * @param fn - The contract function name
 * @param args - The function args
 * @param evm - (optional) An EVM instance
 * @returns A promise that resolves with a execution returned value or rejects if an exception error
 */
export async function execBytecode(
    bytecode: BytesLike,
    abi: any,
    fn: string,
    args: any[],
    evm?: EVM
): Promise<utils.Result>

/**
 * @public Executes a bytecode with given data
 * @param bytecode - The bytecode to execute
 * @param data - The data
 * @param evm - (optional) An EVM instance
 * @returns The execution results as Uint8Array
 */
export async function execBytecode(
    bytecode: BytesLike,
    data: BytesLike,
    evm?: EVM
): Promise<Uint8Array>

export async function execBytecode(
    bytecode: BytesLike,
    dataOrAbi: any,
    fnOrEvm?: string | EVM,
    args?: any[],
    evm?: EVM,
): Promise<Uint8Array | utils.Result> {
    // const vitalik = Address.fromString(VITALIK);
    let _evm;
    if (typeof fnOrEvm === "string" && args !== undefined) {
        const _evm = evm ? evm : new EVM();
        const iface = new utils.Interface(dataOrAbi);
        const data = iface.encodeFunctionData(fnOrEvm, args);

        try {
            const result = await _evm.runCode({
                // to: vitalik,
                // caller: vitalik,
                // origin: vitalik,
                code: arrayify(bytecode, { allowMissingPrefix: true }),
                data: arrayify(data, { allowMissingPrefix: true }),
            });

            if (result.exceptionError !== undefined) {
                try { return iface.decodeFunctionResult(fnOrEvm, result.returnValue); }
                catch (e) { return Promise.reject(e); }
            }
            else return Promise.resolve(
                iface.decodeFunctionResult(fnOrEvm, result.returnValue)
            );
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    else {
        _evm = fnOrEvm instanceof EVM ? fnOrEvm : new EVM();
        try {
            const result = await _evm.runCode({
                // to: vitalik,
                // caller: vitalik,
                // origin: vitalik,
                code: arrayify(bytecode, { allowMissingPrefix: true }),
                data: arrayify(dataOrAbi, { allowMissingPrefix: true }),
            });
            if (result.exceptionError !== undefined) return Promise.reject(
                result.returnValue
            );
            else return Promise.resolve(result.returnValue);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}

/**
 * @public Inster an account with balance to evm
 * @param evm - The EVM instance
 * @param address - The address to inster
 */
export const insertAccount = async(evm: EVM, address: Address) => {
    const acctData = {
        nonce: 0,
        balance: BigInt(100) ** BigInt(18), // 1 eth
    };
    const account = Account.fromAccountData(acctData);
    await evm.stateManager.putAccount(address, account);
};
