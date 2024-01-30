let imports = {};
let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) {
    return heap[idx];
}

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

const cachedTextEncoder =
    typeof TextEncoder !== "undefined"
        ? new TextEncoder("utf-8")
        : {
              encode: () => {
                  throw Error("TextEncoder not available");
              },
          };

const encodeString =
    typeof cachedTextEncoder.encodeInto === "function"
        ? function (arg, view) {
              return cachedTextEncoder.encodeInto(arg, view);
          }
        : function (arg, view) {
              const buf = cachedTextEncoder.encode(arg);
              view.set(buf);
              return {
                  read: arg.length,
                  written: buf.length,
              };
          };

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0()
            .subarray(ptr, ptr + buf.length)
            .set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7f) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

const cachedTextDecoder =
    typeof TextDecoder !== "undefined"
        ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true })
        : {
              decode: () => {
                  throw Error("TextDecoder not available");
              },
          };

if (typeof TextDecoder !== "undefined") {
    cachedTextDecoder.decode();
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

let cachedBigInt64Memory0 = null;

function getBigInt64Memory0() {
    if (cachedBigInt64Memory0 === null || cachedBigInt64Memory0.byteLength === 0) {
        cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer);
    }
    return cachedBigInt64Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == "number" || type == "boolean" || val == null) {
        return `${val}`;
    }
    if (type == "string") {
        return `"${val}"`;
    }
    if (type == "symbol") {
        const description = val.description;
        if (description == null) {
            return "Symbol";
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == "function") {
        const name = val.name;
        if (typeof name == "string" && name.length > 0) {
            return `Function(${name})`;
        } else {
            return "Function";
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = "[";
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for (let i = 1; i < length; i++) {
            debug += ", " + debugString(val[i]);
        }
        debug += "]";
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == "Object") {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return "Object(" + JSON.stringify(val) + ")";
        } catch (_) {
            return "Object";
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}
function __wbg_adapter_50(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h478f2e256725e5cc(
        arg0,
        arg1,
        addHeapObject(arg2),
    );
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
 * Calculates solidity keccak256 hash from the given data
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function keccak256(data) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keccak256(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Checks equality of 2 Uint8Arrays
 * @param {Uint8Array} data1
 * @param {Uint8Array} data2
 * @returns {boolean}
 */
export function eqBytes(data1, data2) {
    const ptr0 = passArray8ToWasm0(data1, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(data2, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.eqBytes(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * Converts a hex string to Uint8Array
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function arrayify(hex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.arrayify(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Converts an Uint8Array into a hex string
 * @param {Uint8Array} data
 * @returns {string}
 */
export function hexlify(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.hexlify(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error("out of js stack");
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getUint32Memory0();
    const slice = mem.subarray(ptr / 4, ptr / 4 + len);
    const result = [];
    for (let i = 0; i < slice.length; i++) {
        result.push(takeObject(slice[i]));
    }
    return result;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getUint32Memory0();
    for (let i = 0; i < array.length; i++) {
        mem[ptr / 4 + i] = addHeapObject(array[i]);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}
/**
 * seraches for a meta for a given hash in the given subgraphs
 * @param {string} hash
 * @param {(string)[]} subgraphs
 * @returns {Promise<Uint8Array>}
 */
export function searchMeta(hash, subgraphs) {
    const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(subgraphs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.searchMeta(ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
function __wbg_adapter_189(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h5e2695beb3bc5f92(
        arg0,
        arg1,
        addHeapObject(arg2),
        addHeapObject(arg3),
    );
}

/**
 * All Error codes of RainlangDocument/RainDocument problem and LSP Diagnostics
 */
export const ErrorCode = Object.freeze({
    IllegalChar: 0,
    0: "IllegalChar",
    RuntimeError: 1,
    1: "RuntimeError",
    CircularDependency: 2,
    2: "CircularDependency",
    CircularDependencyQuote: 3,
    3: "CircularDependencyQuote",
    DeepImport: 4,
    4: "DeepImport",
    DeepNamespace: 5,
    5: "DeepNamespace",
    CorruptMeta: 6,
    6: "CorruptMeta",
    ElidedBinding: 7,
    7: "ElidedBinding",
    NoneTopLevelImport: 8,
    8: "NoneTopLevelImport",
    NativeParserError: 9,
    9: "NativeParserError",
    InconsumableMeta: 10,
    10: "InconsumableMeta",
    OccupiedNamespace: 11,
    11: "OccupiedNamespace",
    OddLenHex: 12,
    12: "OddLenHex",
    CollidingNamespaceNodes: 13,
    13: "CollidingNamespaceNodes",
    UndefinedWord: 257,
    257: "UndefinedWord",
    UndefinedImport: 259,
    259: "UndefinedImport",
    UndefinedQuote: 260,
    260: "UndefinedQuote",
    UndefinedNamespaceMember: 261,
    261: "UndefinedNamespaceMember",
    UndefinedIdentifier: 262,
    262: "UndefinedIdentifier",
    InvalidWordPattern: 513,
    513: "InvalidWordPattern",
    InvalidExpression: 514,
    514: "InvalidExpression",
    InvalidNamespaceReference: 515,
    515: "InvalidNamespaceReference",
    InvalidEmptyLine: 516,
    516: "InvalidEmptyLine",
    InvalidHash: 517,
    517: "InvalidHash",
    InvalidReference: 518,
    518: "InvalidReference",
    InvalidRainDocument: 519,
    519: "InvalidRainDocument",
    InvalidImport: 520,
    520: "InvalidImport",
    InvalidEmptyBinding: 521,
    521: "InvalidEmptyBinding",
    InvalidQuote: 528,
    528: "InvalidQuote",
    InvalidOperandArg: 529,
    529: "InvalidOperandArg",
    UnexpectedToken: 769,
    769: "UnexpectedToken",
    UnexpectedClosingParen: 770,
    770: "UnexpectedClosingParen",
    UnexpectedNamespacePath: 771,
    771: "UnexpectedNamespacePath",
    UnexpectedRebinding: 772,
    772: "UnexpectedRebinding",
    UnexpectedClosingAngleParen: 773,
    773: "UnexpectedClosingAngleParen",
    UnexpectedEndOfComment: 774,
    774: "UnexpectedEndOfComment",
    UnexpectedComment: 775,
    775: "UnexpectedComment",
    UnexpectedPragma: 776,
    776: "UnexpectedPragma",
    UnexpectedRename: 777,
    777: "UnexpectedRename",
    ExpectedOpcode: 1025,
    1025: "ExpectedOpcode",
    ExpectedRename: 1026,
    1026: "ExpectedRename",
    ExpectedElisionOrRebinding: 1027,
    1027: "ExpectedElisionOrRebinding",
    ExpectedClosingParen: 1028,
    1028: "ExpectedClosingParen",
    ExpectedOpeningParen: 1029,
    1029: "ExpectedOpeningParen",
    ExpectedClosingAngleBracket: 1030,
    1030: "ExpectedClosingAngleBracket",
    ExpectedHexLiteral: 1031,
    1031: "ExpectedHexLiteral",
    ExpectedSemi: 1032,
    1032: "ExpectedSemi",
    MismatchRHS: 1281,
    1281: "MismatchRHS",
    MismatchLHS: 1282,
    1282: "MismatchLHS",
    MismatchOperandArgs: 1283,
    1283: "MismatchOperandArgs",
    OutOfRangeInputs: 1537,
    1537: "OutOfRangeInputs",
    OutOfRangeOperandArgs: 1538,
    1538: "OutOfRangeOperandArgs",
    OutOfRangeValue: 1539,
    1539: "OutOfRangeValue",
    DuplicateAlias: 1793,
    1793: "DuplicateAlias",
    DuplicateIdentifier: 1794,
    1794: "DuplicateIdentifier",
    DuplicateImportStatement: 1795,
    1795: "DuplicateImportStatement",
    DuplicateImport: 1796,
    1796: "DuplicateImport",
});
/**
 * In-memory CAS (content addressed storage) for all metadata required for parsing
 * a RainDocument which basically stores k/v pairs of meta hash, meta bytes and
 * ExpressionDeployer reproducible data as well as providing functionalities to easliy
 * read them from the CAS.
 *
 * Hashes are stored as bytes of the underlying value and meta bytes are valid cbor
 * encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to
 * deployedBytecode meta hash and deploy transaction hash.
 *
 * @example
 * ```javascript
 * // to instantiate with including default subgraphs
 * // pass 'false' to not include default rain subgraph endpoints
 * const store = new MetaStore();
 *
 * // or to instantiate with initial arguments
 * const store = MetaStore.create(options);
 *
 * // add a new subgraph endpoint URLs
 * store.addSubgraphs(["sg-url-1", "sg-url-2", ...])
 *
 * // merge another MetaStore instance to this instance
 * store.merge(anotherMetaStore)
 *
 * // updates the meta store with a new meta by searching through subgraphs
 * await store.update(hash)
 *
 * // to get a meta bytes of a corresponding hash from store
 * const meta = store.getMeta(hash);
 * ```
 */
export class MetaStore {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MetaStore.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_metastore_free(ptr);
    }
    /**
     * Constructs a new instance
     * @param {boolean | undefined} [include_rain_subgraphs]
     */
    constructor(include_rain_subgraphs) {
        const ret = wasm.metastore_new(
            isLikeNone(include_rain_subgraphs) ? 0xffffff : include_rain_subgraphs ? 1 : 0,
        );
        this.__wbg_ptr = ret >>> 0;
        return this;
    }
    /**
     * Creates new instance of Store with given initial values
     * it checks the validity of each item of the provided values and only stores those that are valid
     * @param {MetaStoreOptions} options
     * @returns {MetaStore}
     */
    static create(options) {
        const ret = wasm.metastore_create(addHeapObject(options));
        return MetaStore.__wrap(ret);
    }
    /**
     * All subgraph endpoint URLs of this instance
     * @returns {(string)[]}
     */
    get subgraphs() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.metastore_subgraphs(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * All the cached meta hash/bytes pairs
     * @returns {any}
     */
    get cache() {
        const ret = wasm.metastore_cache(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * All the cached dotrain uri/meta hash pairs
     * @returns {any}
     */
    get dotrainCache() {
        const ret = wasm.metastore_dotrainCache(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Adds new subgraph endpoints
     * @param {any} subgraphs
     */
    addSubgraphs(subgraphs) {
        wasm.metastore_addSubgraphs(this.__wbg_ptr, addHeapObject(subgraphs));
    }
    /**
     * Get the corresponding meta bytes of the given hash if it is cached
     * @param {Uint8Array} hash
     * @returns {any}
     */
    getMeta(hash) {
        const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getMeta(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Get the corresponding dotrain hash of the given dotrain uri if it is cached
     * @param {string} uri
     * @returns {any}
     */
    getDotrainHash(uri) {
        const ptr0 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getDotrainHash(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Get the corresponding uri of the given dotrain hash if it is cached
     * @param {Uint8Array} hash
     * @returns {any}
     */
    getDotrainUri(hash) {
        const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getDotrainUri(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Get the corresponding meta bytes of the given dotrain uri if it is cached
     * @param {string} uri
     * @returns {any}
     */
    getDotrainMeta(uri) {
        const ptr0 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getDotrainMeta(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Updates the meta cache by searching through all subgraphs for the given hash
     * @param {Uint8Array} hash
     * @returns {Promise<any>}
     */
    update(hash) {
        const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_update(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * First checks if the meta is stored and returns it if so, else will perform update()
     * @param {Uint8Array} hash
     * @returns {Promise<any>}
     */
    updateCheck(hash) {
        const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_updateCheck(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Updates the meta cache by the given hash and meta bytes, checks the hash to bytes
     * validity
     * @param {Uint8Array} hash
     * @param {Uint8Array} bytes
     */
    updateWith(hash, bytes) {
        const ptr0 = passArray8ToWasm0(hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.metastore_updateWith(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Deletes a dotrain record given its uri
     * @param {string} uri
     * @param {boolean} keep_meta
     */
    deleteDotrain(uri, keep_meta) {
        const ptr0 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.metastore_deleteDotrain(this.__wbg_ptr, ptr0, len0, keep_meta);
    }
    /**
     * Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache
     * and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in
     * the scope of Store and handling and passing on a correct URI (path) for the given text must be handled
     * externally by the implementer
     * @param {string} text
     * @param {string} uri
     * @param {boolean} keep_old
     * @returns {any}
     */
    setDotrain(text, uri, keep_old) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.metastore_setDotrain(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1, keep_old);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Merges another instance of MetaStore to this instance lazily, avoids duplicates
     * @param {MetaStore} other
     */
    merge(other) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertClass(other, MetaStore);
            wasm.metastore_merge(retptr, this.__wbg_ptr, other.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
 * Data structure of a parsed .rain text
 *
 * RainDocument is the main implementation block that enables parsing of a .rain file contents
 * to its building blocks and parse tree by handling and resolving imports, namespaces, etc which
 * later are used by LSP services and compiler as well as providing all the functionalities in between.
 *
 * It is a portable, extensible and composable format for describing Rainlang fragments, .rain serve as
 * a wrapper/container/medium for Rainlang to be shared and audited simply in a permissionless and
 * adversarial environment such as a public blockchain.
 *
 * @example
 * ```javascript
 * // create a new instane
 * const rainDocument = RainDocument.create(text, meta_store);
 *
 * // alternatively instantiate with remote meta search enabled
 * const rainDocument = await RainDocument.createAsync(text, meta_store);
 *
 * // get all problems
 * const problems = rainDocument.allProblems;
 *
 * // compose this instance to get rainlang string
 * const expConfig = rainDocument.compose(["entrypoint1", "entrypoint2"]);
 * ```
 */
export class RainDocument {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RainDocument.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_raindocument_free(ptr);
    }
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search enabled
     * @param {string} text
     * @param {MetaStore} meta_store
     * @returns {Promise<RainDocument>}
     */
    static createAsync(text, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_createAsync(ptr0, len0, meta_store.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
     * @param {string} text
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static create(text, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_create(ptr0, len0, meta_store.__wbg_ptr);
        return RainDocument.__wrap(ret);
    }
    /**
     * @param {IRainDocument} value
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static fromInterface(value, meta_store) {
        try {
            _assertClass(meta_store, MetaStore);
            const ret = wasm.raindocument_fromInterface(
                addBorrowedObject(value),
                meta_store.__wbg_ptr,
            );
            return RainDocument.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * @returns {IRainDocument}
     */
    toInterface() {
        const ret = wasm.raindocument_toInterface(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     */
    update(new_text) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.raindocument_update(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Updates the text, uri, version and parses right away with remote meta search enabled
     * @param {string} new_text
     * @returns {Promise<void>}
     */
    updateAsync(new_text) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.raindocument_updateAsync(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * This instance's current text
     * @returns {string}
     */
    get text() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_text(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * This instance's current text
     * @returns {string}
     */
    get frontMatter() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_frontMatter(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * This instance's current text
     * @returns {string}
     */
    get body() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_body(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * This instance's top problems
     * @returns {(Problem)[]}
     */
    get problems() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_problems(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's comments
     * @returns {(Comment)[]}
     */
    get comments() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_comments(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's imports
     * @returns {(Import)[]}
     */
    get imports() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_imports(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's bindings
     * @returns {(Binding)[]}
     */
    get bindings() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_bindings(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's namespace
     * @returns {Namespace}
     */
    get namespace() {
        const ret = wasm.raindocument_namespace(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * This instance's MetaStore
     * @returns {MetaStore}
     */
    get metaStore() {
        const ret = wasm.raindocument_metaStore(this.__wbg_ptr);
        return MetaStore.__wrap(ret);
    }
    /**
     * This instance's AuthoringMeta
     * @returns {IAuthoringMeta | undefined}
     */
    get knownWords() {
        const ret = wasm.raindocument_knownWords(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The error msg if parsing had resulted in an error
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_error(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's all problems (bindings + top)
     * @returns {(Problem)[]}
     */
    get allProblems() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_allProblems(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * This instance's bindings problems
     * @returns {(Problem)[]}
     */
    get bindingProblems() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_bindingProblems(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4, 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Parses this instance's text with remote meta search enabled
     * @returns {Promise<void>}
     */
    parseAsync() {
        const ret = wasm.raindocument_parseAsync(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Parses this instance's text with remote meta search disabled (cached metas only)
     */
    parse() {
        wasm.raindocument_parse(this.__wbg_ptr);
    }
    /**
     * Compiles this instance
     * @param {(string)[]} entrypoints
     * @returns {string}
     */
    compose(entrypoints) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.raindocument_compose(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0;
                len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Compiles a text as RainDocument with remote meta search enabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @returns {Promise<string>}
     */
    static composeTextAsync(text, entrypoints, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_composeTextAsync(
            ptr0,
            len0,
            ptr1,
            len1,
            meta_store.__wbg_ptr,
        );
        return takeObject(ret);
    }
    /**
     * Compiles a text as RainDocument with remote meta search disabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @returns {Promise<string>}
     */
    static composeText(text, entrypoints, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_composeText(ptr0, len0, ptr1, len1, meta_store.__wbg_ptr);
        return takeObject(ret);
    }
}
/**
 * Provides methods for getting language services (such as diagnostics, completion, etc)
 * for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked
 * MetaStore instance that holds all the required metadata/functionalities that are required during
 * parsing a text.
 *
 * Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports
 * only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any
 * position encodings will result in the same LSP provided Position value which is 1 for each char.
 *
 * @example
 * ```javascript
 * // create new MetaStore instance
 * let metaStore = new MetaStore();
 *
 * // crate new instance
 * let langServices = new RainLanguageServices(metaStore);
 *
 * let textDocument = {
 *    text: "some .rain text",
 *    uri:  "file:///name.rain",
 *    version: 0,
 *    languageId: "rainlang"
 * };
 *
 * // creat new RainDocument
 * let rainDocument = langServices.newRainDocument(textdocument);
 *
 * // get LSP Diagnostics
 * let diagnosticsRelatedInformation = true;
 * let diagnostics = langServices.doValidate(textDocument, diagnosticsRelatedInformation);
 * ```
 */
export class RainLanguageServices {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rainlanguageservices_free(ptr);
    }
    /**
     * The meta Store associated with this RainLanguageServices instance
     * @returns {MetaStore}
     */
    get metaStore() {
        const ret = wasm.rainlanguageservices_metaStore(this.__wbg_ptr);
        return MetaStore.__wrap(ret);
    }
    /**
     * Instantiates with the given MetaStore
     * @param {MetaStore} meta_store
     */
    constructor(meta_store) {
        _assertClass(meta_store, MetaStore);
        const ret = wasm.rainlanguageservices_js_new(meta_store.__wbg_ptr);
        this.__wbg_ptr = ret >>> 0;
        return this;
    }
    /**
     * Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem
     * @param {TextDocumentItem} text_document
     * @returns {RainDocument}
     */
    newRainDocument(text_document) {
        const ret = wasm.rainlanguageservices_newRainDocument(
            this.__wbg_ptr,
            addHeapObject(text_document),
        );
        return RainDocument.__wrap(ret);
    }
    /**
     * Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem
     * @param {TextDocumentItem} text_document
     * @returns {Promise<RainDocument>}
     */
    newRainDocumentAsync(text_document) {
        const ret = wasm.rainlanguageservices_newRainDocumentAsync(
            this.__wbg_ptr,
            addHeapObject(text_document),
        );
        return takeObject(ret);
    }
    /**
     * Validates the document with remote meta search disabled when parsing and reports LSP diagnostics
     * @param {TextDocumentItem} text_document
     * @param {boolean} related_information
     * @returns {any}
     */
    doValidate(text_document, related_information) {
        const ret = wasm.rainlanguageservices_doValidate(
            this.__wbg_ptr,
            addHeapObject(text_document),
            related_information,
        );
        return takeObject(ret);
    }
    /**
     * Reports LSP diagnostics from RainDocument's all problems
     * @param {RainDocument} rain_document
     * @param {string} uri
     * @param {boolean} related_information
     * @returns {any}
     */
    doValidateRainDocument(rain_document, uri, related_information) {
        _assertClass(rain_document, RainDocument);
        const ptr0 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rainlanguageservices_doValidateRainDocument(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
            ptr0,
            len0,
            related_information,
        );
        return takeObject(ret);
    }
    /**
     * Validates the document with remote meta search enabled when parsing and reports LSP diagnostics
     * @param {TextDocumentItem} text_document
     * @param {boolean} related_information
     * @returns {Promise<any>}
     */
    doValidateAsync(text_document, related_information) {
        const ret = wasm.rainlanguageservices_doValidateAsync(
            this.__wbg_ptr,
            addHeapObject(text_document),
            related_information,
        );
        return takeObject(ret);
    }
    /**
     * Provides completion items at the given position
     * @param {TextDocumentItem} text_document
     * @param {Position} position
     * @param {any} documentation_format
     * @returns {any}
     */
    doComplete(text_document, position, documentation_format) {
        const ret = wasm.rainlanguageservices_doComplete(
            this.__wbg_ptr,
            addHeapObject(text_document),
            addHeapObject(position),
            addHeapObject(documentation_format),
        );
        return takeObject(ret);
    }
    /**
     * Provides completion items at the given position
     * @param {RainDocument} rain_document
     * @param {string} uri
     * @param {Position} position
     * @param {any} documentation_format
     * @returns {any}
     */
    doCompleteRainDocument(rain_document, uri, position, documentation_format) {
        _assertClass(rain_document, RainDocument);
        const ptr0 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rainlanguageservices_doCompleteRainDocument(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
            ptr0,
            len0,
            addHeapObject(position),
            addHeapObject(documentation_format),
        );
        return takeObject(ret);
    }
    /**
     * Provides hover for a fragment at the given position
     * @param {TextDocumentItem} text_document
     * @param {Position} position
     * @param {any} content_format
     * @returns {any}
     */
    doHover(text_document, position, content_format) {
        const ret = wasm.rainlanguageservices_doHover(
            this.__wbg_ptr,
            addHeapObject(text_document),
            addHeapObject(position),
            addHeapObject(content_format),
        );
        return takeObject(ret);
    }
    /**
     * Provides hover for a RainDocument fragment at the given position
     * @param {RainDocument} rain_document
     * @param {Position} position
     * @param {any} content_format
     * @returns {any}
     */
    doHoverRainDocument(rain_document, position, content_format) {
        _assertClass(rain_document, RainDocument);
        const ret = wasm.rainlanguageservices_doHoverRainDocument(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
            addHeapObject(position),
            addHeapObject(content_format),
        );
        return takeObject(ret);
    }
    /**
     * Provides semantic tokens for elided fragments
     * @param {TextDocumentItem} text_document
     * @param {number} semantic_token_types_index
     * @param {number} semantic_token_modifiers_len
     * @returns {any}
     */
    semanticTokens(text_document, semantic_token_types_index, semantic_token_modifiers_len) {
        const ret = wasm.rainlanguageservices_semanticTokens(
            this.__wbg_ptr,
            addHeapObject(text_document),
            semantic_token_types_index,
            semantic_token_modifiers_len,
        );
        return takeObject(ret);
    }
    /**
     * Provides semantic tokens for RainDocument's elided fragments
     * @param {RainDocument} rain_document
     * @param {number} semantic_token_types_index
     * @param {number} semantic_token_modifiers_len
     * @returns {any}
     */
    rainDocumentSemanticTokens(
        rain_document,
        semantic_token_types_index,
        semantic_token_modifiers_len,
    ) {
        _assertClass(rain_document, RainDocument);
        const ret = wasm.rainlanguageservices_rainDocumentSemanticTokens(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
            semantic_token_types_index,
            semantic_token_modifiers_len,
        );
        return takeObject(ret);
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === "function" && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === "function") {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                if (module.headers.get("Content-Type") != "application/wasm") {
                    console.warn(
                        "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
                        e,
                    );
                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.__wbindgen_placeholder__ = {};
    imports.__wbindgen_placeholder__.__wbindgen_object_drop_ref = function (arg0) {
        takeObject(arg0);
    };
    imports.__wbindgen_placeholder__.__wbindgen_is_string = function (arg0) {
        const ret = typeof getObject(arg0) === "string";
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_string_get = function (arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof obj === "string" ? obj : undefined;
        var ptr1 = isLikeNone(ret)
            ? 0
            : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.__wbindgen_placeholder__.__wbindgen_is_object = function (arg0) {
        const val = getObject(arg0);
        const ret = typeof val === "object" && val !== null;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_is_undefined = function (arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_in = function (arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_error_new = function (arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_number_new = function (arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_raindocument_new = function (arg0) {
        const ret = RainDocument.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_object_clone_ref = function (arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_boolean_get = function (arg0) {
        const v = getObject(arg0);
        const ret = typeof v === "boolean" ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_is_bigint = function (arg0) {
        const ret = typeof getObject(arg0) === "bigint";
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_bigint_from_i64 = function (arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_jsval_eq = function (arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_bigint_from_u64 = function (arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_number_get = function (arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof obj === "number" ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_string_new = function (arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_cb_drop = function (arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbindgen_as_number = function (arg0) {
        const ret = +getObject(arg0);
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_fetch_6a2624d7f767e331 = function (arg0) {
        const ret = fetch(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_queueMicrotask_118eeb525d584d9a = function (arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.__wbindgen_placeholder__.__wbg_queueMicrotask_26a89c14c53809c0 = function (arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_is_function = function (arg0) {
        const ret = typeof getObject(arg0) === "function";
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_fetch_06d656a1b748ac0d = function (arg0, arg1) {
        const ret = getObject(arg0).fetch(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_newwithstrandinit_9fd2fc855c6327eb = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_signal_7876560d9d0f914c = function (arg0) {
        const ret = getObject(arg0).signal;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_new_fa36281638875de8 = function () {
        return handleError(function () {
            const ret = new AbortController();
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_abort_7792bf3f664d7bb3 = function (arg0) {
        getObject(arg0).abort();
    };
    imports.__wbindgen_placeholder__.__wbg_instanceof_Response_0d25bb8436a9cefe = function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Response;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_url_47f8307501523859 = function (arg0, arg1) {
        const ret = getObject(arg1).url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.__wbindgen_placeholder__.__wbg_status_351700a30c61ba61 = function (arg0) {
        const ret = getObject(arg0).status;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_headers_e38c00d713e8888c = function (arg0) {
        const ret = getObject(arg0).headers;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_arrayBuffer_ec4617b29bb0f61c = function () {
        return handleError(function (arg0) {
            const ret = getObject(arg0).arrayBuffer();
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_new_a979e9eedc5e81a3 = function () {
        return handleError(function () {
            const ret = new Headers();
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_append_047382169b61373d = function () {
        return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbindgen_jsval_loose_eq = function (arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_getwithrefkey_4a92a5eca60879b9 = function (arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_set_9182712abebf82ef = function (arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.__wbindgen_placeholder__.__wbg_String_88810dfeb4021902 = function (arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.__wbindgen_placeholder__.__wbg_getwithrefkey_5e6d9547403deab8 = function (arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_get_c43534c00f382c8a = function (arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_length_d99b680fd68bf71b = function (arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_new_34c624469fb1d4fd = function () {
        const ret = [];
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_newnoargs_5859b6d41c6fe9f7 = function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_new_ad4df4628315a892 = function () {
        const ret = new Map();
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_next_1938cf110c9491d4 = function (arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_next_267398d0e0761bf9 = function () {
        return handleError(function (arg0) {
            const ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_done_506b44765ba84b9c = function (arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_value_31485d8770eb06ab = function (arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_iterator_364187e1ee96b750 = function () {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_get_5027b32da70f39b1 = function () {
        return handleError(function (arg0, arg1) {
            const ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_call_a79f1973a4f07d5e = function () {
        return handleError(function (arg0, arg1) {
            const ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_new_87d841e70661f6e9 = function () {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_self_086b5302bcafb962 = function () {
        return handleError(function () {
            const ret = self.self;
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_window_132fa5d7546f1de5 = function () {
        return handleError(function () {
            const ret = window.window;
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_globalThis_e5f801a37ad7d07b = function () {
        return handleError(function () {
            const ret = globalThis.globalThis;
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_global_f9a61fce4af6b7c1 = function () {
        return handleError(function () {
            const ret = global.global;
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_set_379b27f1d5f1bf9c = function (arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.__wbindgen_placeholder__.__wbg_from_a663e01d8dab8e44 = function (arg0) {
        const ret = Array.from(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_isArray_fbd24d447869b527 = function (arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_instanceof_ArrayBuffer_f4521cec1b99ee35 = function (
        arg0,
    ) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_call_f6a2bc58c19c53c6 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_set_83e83bc2428e50ab = function (arg0, arg1, arg2) {
        const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_isSafeInteger_d8c89788832a17bf = function (arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_entries_7a47f5716366056b = function (arg0) {
        const ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_new_1d93771b84541aa5 = function (arg0, arg1) {
        try {
            var state0 = { a: arg0, b: arg1 };
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_189(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.__wbindgen_placeholder__.__wbg_resolve_97ecd55ee839391b = function (arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_then_7aeb7c5f1536640f = function (arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_then_5842e4e97f7beace = function (arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_buffer_5d1b598a01b41a42 = function (arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_newwithbyteoffsetandlength_d695c7957788f922 = function (
        arg0,
        arg1,
        arg2,
    ) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_new_ace717933ad7117f = function (arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbg_set_74906aa30864df5a = function (arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.__wbindgen_placeholder__.__wbg_length_f0764416ba5bb237 = function (arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_instanceof_Uint8Array_4f5cffed7df34b2f = function (
        arg0,
    ) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.__wbindgen_placeholder__.__wbg_stringify_daa6661e90c04140 = function () {
        return handleError(function (arg0) {
            const ret = JSON.stringify(getObject(arg0));
            return addHeapObject(ret);
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_has_a2919659b7b645b3 = function () {
        return handleError(function (arg0, arg1) {
            const ret = Reflect.has(getObject(arg0), getObject(arg1));
            return ret;
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbg_set_37a50e901587b477 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            return ret;
        }, arguments);
    };
    imports.__wbindgen_placeholder__.__wbindgen_bigint_get_as_i64 = function (arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof v === "bigint" ? v : undefined;
        getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_debug_string = function (arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.__wbindgen_placeholder__.__wbindgen_throw = function (arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.__wbindgen_placeholder__.__wbindgen_memory = function () {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.__wbindgen_placeholder__.__wbindgen_closure_wrapper1749 = function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 423, __wbg_adapter_50);
        return addHeapObject(ret);
    };

    return imports;
}

/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
export function rainlang(stringChunks, ...vars) {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
}

imports = __wbg_get_imports();

export * from "vscode-languageserver-types";
export * from "vscode-languageserver-protocol";

import { Buffer } from "buffer";
import wasmB64 from "../wasm.json";
const bytes = Buffer.from(wasmB64.wasm, "base64");

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
