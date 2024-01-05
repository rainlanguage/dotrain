let imports = {};
imports["__wbindgen_placeholder__"] = module.exports;
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

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder("utf-8");

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
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hc457f4f6818601a3(
        arg0,
        arg1,
        addHeapObject(arg2),
    );
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

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
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
module.exports.searchMeta = function (hash, subgraphs) {
    const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(subgraphs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.searchMeta(ptr0, len0, ptr1, len1);
    return takeObject(ret);
};

/**
 * seraches for a ExpressionDeployer reproducible data for a given hash in the given subgraphs
 * @param {string} hash
 * @param {(string)[]} subgraphs
 * @returns {Promise<DeployerQueryResponse>}
 */
module.exports.searchDeployer = function (hash, subgraphs) {
    const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(subgraphs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.searchDeployer(ptr0, len0, ptr1, len1);
    return takeObject(ret);
};

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error("out of js stack");
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
function __wbg_adapter_210(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h3bbaa7d8fd9c55c0(
        arg0,
        arg1,
        addHeapObject(arg2),
        addHeapObject(arg3),
    );
}

/**
 * Error codes of Rainlang/RainDocument problem and LSP Diagnostics
 */
module.exports.ErrorCode = Object.freeze({
    IllegalChar: 0,
    0: "IllegalChar",
    RuntimeError: 1,
    1: "RuntimeError",
    CircularDependency: 2,
    2: "CircularDependency",
    UnresolvableDependencies: 3,
    3: "UnresolvableDependencies",
    DeepImport: 4,
    4: "DeepImport",
    DeepNamespace: 5,
    5: "DeepNamespace",
    CorruptMeta: 6,
    6: "CorruptMeta",
    ElidedBinding: 7,
    7: "ElidedBinding",
    SingletonWords: 8,
    8: "SingletonWords",
    MultipleWords: 9,
    9: "MultipleWords",
    SingleWordModify: 10,
    10: "SingleWordModify",
    InconsumableMeta: 11,
    11: "InconsumableMeta",
    NamespaceOccupied: 12,
    12: "NamespaceOccupied",
    UndefinedWord: 257,
    257: "UndefinedWord",
    UndefinedAuthoringMeta: 258,
    258: "UndefinedAuthoringMeta",
    UndefinedMeta: 259,
    259: "UndefinedMeta",
    UndefinedQuote: 260,
    260: "UndefinedQuote",
    UndefinedOpcode: 261,
    261: "UndefinedOpcode",
    UndefinedIdentifier: 262,
    262: "UndefinedIdentifier",
    UndefinedDeployer: 263,
    263: "UndefinedDeployer",
    InvalidWordPattern: 513,
    513: "InvalidWordPattern",
    InvalidExpression: 514,
    514: "InvalidExpression",
    InvalidNestedNode: 515,
    515: "InvalidNestedNode",
    InvalidSelfReference: 516,
    516: "InvalidSelfReference",
    InvalidHash: 517,
    517: "InvalidHash",
    InvalidImport: 520,
    520: "InvalidImport",
    InvalidEmptyBinding: 521,
    521: "InvalidEmptyBinding",
    InvalidBindingIdentifier: 528,
    528: "InvalidBindingIdentifier",
    InvalidQuote: 529,
    529: "InvalidQuote",
    InvalidOperandArg: 530,
    530: "InvalidOperandArg",
    InvalidReference: 531,
    531: "InvalidReference",
    InvalidRainDocument: 532,
    532: "InvalidRainDocument",
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
    UndefinedNamespaceMember: 776,
    776: "UndefinedNamespaceMember",
    ExpectedOpcode: 1025,
    1025: "ExpectedOpcode",
    ExpectedSpace: 1026,
    1026: "ExpectedSpace",
    ExpectedElisionOrRebinding: 1027,
    1027: "ExpectedElisionOrRebinding",
    ExpectedClosingParen: 1028,
    1028: "ExpectedClosingParen",
    ExpectedOpeningParen: 1029,
    1029: "ExpectedOpeningParen",
    ExpectedClosingAngleBracket: 1030,
    1030: "ExpectedClosingAngleBracket",
    ExpectedName: 1031,
    1031: "ExpectedName",
    ExpectedSemi: 1032,
    1032: "ExpectedSemi",
    ExpectedHash: 1033,
    1033: "ExpectedHash",
    ExpectedOperandArgs: 1040,
    1040: "ExpectedOperandArgs",
    ExpectedRename: 1041,
    1041: "ExpectedRename",
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
 * Hashes are 32 bytes (in hex string format) and will be stored as lower case and
 * meta bytes are valid cbor encoded as Uint8Array. ExpressionDeployers data are in
 * form of js object mapped to deployedBytecode meta hash and deploy transaction hash.
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
class MetaStore {
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
     * All the cached NPE2 deployers
     * @returns {any}
     */
    get deployerCache() {
        const ret = wasm.metastore_deployerCache(this.__wbg_ptr);
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
     * @param {string} hash
     * @returns {any}
     */
    getMeta(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getMeta(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Get the NPE2 deployer details of the given deployer bytecode hash if it is cached
     * @param {string} hash
     * @returns {any}
     */
    getDeployer(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_getDeployer(this.__wbg_ptr, ptr0, len0);
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
     * @param {string} hash
     * @returns {any}
     */
    getDotrainUri(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
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
     * Searches for NPE2 deployer details in the subgraphs given the deployer hash
     * @param {string} hash
     * @returns {Promise<any>}
     */
    searchDeployer(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_searchDeployer(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer()
     * @param {string} hash
     * @returns {Promise<any>}
     */
    searchDeployerCheck(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_searchDeployerCheck(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Sets deployer record
     * @param {any} deployer_response
     * @returns {any}
     */
    setDeployer(deployer_response) {
        const ret = wasm.metastore_setDeployer(this.__wbg_ptr, addHeapObject(deployer_response));
        return takeObject(ret);
    }
    /**
     * Updates the meta cache by searching through all subgraphs for the given hash
     * @param {string} hash
     * @returns {Promise<any>}
     */
    update(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_update(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * First checks if the meta is stored and returns it if so, else will perform update()
     * @param {string} hash
     * @returns {Promise<any>}
     */
    updateCheck(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.metastore_updateCheck(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Updates the meta cache by the given hash and meta bytes, checks the hash to bytes
     * validity
     * @param {string} hash
     * @param {Uint8Array} bytes
     */
    updateWith(hash, bytes) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
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
module.exports.MetaStore = MetaStore;
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
 * // uri must be a valid URL
 * const rainDocument = RainDocument.create(text, uri, meta_store);
 *
 * // alternatively instantiate with remote meta search enabled
 * const rainDocument = await RainDocument.createAsync(text, uri, meta_store);
 *
 * // get all problems
 * const problems = rainDocument.allProblems;
 *
 * // compile this instance to get ExpressionConfig
 * const expConfig = rainDocument.compile(["entrypoint1", "entrypoint2"]);
 * ```
 */
class RainDocument {
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
     * @param {string} uri
     * @param {MetaStore} meta_store
     * @returns {Promise<RainDocument>}
     */
    static createAsync(text, uri, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_createAsync(ptr0, len0, ptr1, len1, meta_store.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Creates an instance with the given MetaStore and parses with remote meta search disabled (cached metas only)
     * @param {string} text
     * @param {string} uri
     * @param {MetaStore} meta_store
     * @returns {RainDocument}
     */
    static create(text, uri, meta_store) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        const ret = wasm.raindocument_create(ptr0, len0, ptr1, len1, meta_store.__wbg_ptr);
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
     * Updates the text and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     */
    updateText(new_text) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.raindocument_updateText(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Updates the text, uri, version and parses right away with remote meta search disabled (cached metas only)
     * @param {string} new_text
     * @param {string} uri
     * @param {number} version
     */
    update(new_text, uri, version) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.raindocument_update(this.__wbg_ptr, ptr0, len0, ptr1, len1, version);
    }
    /**
     * Updates the text and parses right away with remote meta search enabled
     * @param {string} new_text
     * @returns {Promise<void>}
     */
    updateTextAsync(new_text) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.raindocument_updateTextAsync(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
     * Updates the text, uri, version and parses right away with remote meta search enabled
     * @param {string} new_text
     * @param {string} uri
     * @param {number} version
     * @returns {Promise<void>}
     */
    updateAsync(new_text, uri, version) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.raindocument_updateAsync(this.__wbg_ptr, ptr0, len0, ptr1, len1, version);
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
     * This instance's current URI
     * @returns {string}
     */
    get uri() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.raindocument_uri(retptr, this.__wbg_ptr);
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
     * This instance's current version
     * @returns {number}
     */
    get version() {
        const ret = wasm.raindocument_version(this.__wbg_ptr);
        return ret >>> 0;
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
     * If 'ignore_words' lint option is enabled or not
     * @returns {boolean}
     */
    get ignoreWords() {
        const ret = wasm.raindocument_ignoreWords(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * If 'ignore_undefined_words' lint option is enabled or not
     * @returns {boolean}
     */
    get ignoreUndefinedWords() {
        const ret = wasm.raindocument_ignoreUndefinedWords(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * This instance's AuthoringMeta
     * @returns {IAuthoringMeta | undefined}
     */
    get authoringMeta() {
        const ret = wasm.raindocument_authoringMeta(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * This instance's NPE2 Deployer details
     * @returns {INPE2Deployer}
     */
    get deployer() {
        const ret = wasm.raindocument_deployer(this.__wbg_ptr);
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
     * @returns {ExpressionConfig}
     */
    compile(entrypoints) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.raindocument_compile(retptr, this.__wbg_ptr, ptr0, len0);
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
     * Compiles a text as RainDocument with remote meta search enabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @param {string | undefined} [uri]
     * @returns {Promise<ExpressionConfig>}
     */
    static compileTextAsync(text, entrypoints, meta_store, uri) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        var ptr2 = isLikeNone(uri)
            ? 0
            : passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.raindocument_compileTextAsync(
            ptr0,
            len0,
            ptr1,
            len1,
            meta_store.__wbg_ptr,
            ptr2,
            len2,
        );
        return takeObject(ret);
    }
    /**
     * Compiles a text as RainDocument with remote meta search disabled for parsing
     * @param {string} text
     * @param {(string)[]} entrypoints
     * @param {MetaStore} meta_store
     * @param {string | undefined} [uri]
     * @returns {Promise<ExpressionConfig>}
     */
    static compileText(text, entrypoints, meta_store, uri) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(entrypoints, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(meta_store, MetaStore);
        var ptr2 = isLikeNone(uri)
            ? 0
            : passStringToWasm0(uri, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.raindocument_compileText(
            ptr0,
            len0,
            ptr1,
            len1,
            meta_store.__wbg_ptr,
            ptr2,
            len2,
        );
        return takeObject(ret);
    }
}
module.exports.RainDocument = RainDocument;
/**
 * Provides LSP services which are methods that return LSP based results (Diagnostics, Hover, etc)
 *
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
class RainLanguageServices {
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
     * @param {boolean} related_information
     * @returns {any}
     */
    doValidateRainDocument(rain_document, related_information) {
        _assertClass(rain_document, RainDocument);
        const ret = wasm.rainlanguageservices_doValidateRainDocument(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
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
     * @param {Position} position
     * @param {any} documentation_format
     * @returns {any}
     */
    doCompleteRainDocument(rain_document, position, documentation_format) {
        _assertClass(rain_document, RainDocument);
        const ret = wasm.rainlanguageservices_doCompleteRainDocument(
            this.__wbg_ptr,
            rain_document.__wbg_ptr,
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
module.exports.RainLanguageServices = RainLanguageServices;
/**
 * Data structure (parse tree) of a Rainlang text
 *
 * RainlangDocument is a data structure of a parsed Rainlang text to its parse tree
 * which are used by the RainDocument and for providing LSP services.
 *
 * it should be noted that generally this should not be used individually outside
 * RainDocument unless there is a justified reason, as prasing a Rainlang text should
 * be done through Rain NativeParser contract and parsing method of this struct has no
 * effect on NativeParser prasing and is totally separate as it only provides AST data
 * generally used in context of RainDocument for LSP services and sourcemap generation.
 */
class RainlangDocument {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RainlangDocument.prototype);
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
        wasm.__wbg_rainlangdocument_free(ptr);
    }
    /**
     * Creates a new instance
     * @param {string} text
     * @param {IAuthoringMeta | undefined} [authoring_meta]
     * @param {Namespace | undefined} [namespace]
     * @returns {RainlangDocument}
     */
    static create(text, authoring_meta, namespace) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rainlangdocument_create(
            ptr0,
            len0,
            isLikeNone(authoring_meta) ? 0 : addHeapObject(authoring_meta),
            isLikeNone(namespace) ? 0 : addHeapObject(namespace),
        );
        return RainlangDocument.__wrap(ret);
    }
    /**
     * Updates the text of this instance and parses it right away
     * @param {string} new_text
     * @param {IAuthoringMeta | undefined} [authoring_meta]
     * @param {Namespace | undefined} [namespace]
     */
    update(new_text, authoring_meta, namespace) {
        const ptr0 = passStringToWasm0(new_text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.rainlangdocument_update(
            this.__wbg_ptr,
            ptr0,
            len0,
            isLikeNone(authoring_meta) ? 0 : addHeapObject(authoring_meta),
            isLikeNone(namespace) ? 0 : addHeapObject(namespace),
        );
    }
    /**
     * Creates an instance from interface object
     * @param {IRainlangDocument} value
     * @returns {RainlangDocument}
     */
    static fromInterface(value) {
        const ret = wasm.rainlangdocument_fromInterface(addHeapObject(value));
        return RainlangDocument.__wrap(ret);
    }
    /**
     * Creates an interface object from this instance
     * @returns {IRainlangDocument}
     */
    toInterface() {
        const ret = wasm.rainlangdocument_toInterface(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * The error msg if parsing resulted in an error
     * @returns {string | undefined}
     */
    get error() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rainlangdocument_error(retptr, this.__wbg_ptr);
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
     * This instance's text
     * @returns {string}
     */
    get text() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rainlangdocument_text(retptr, this.__wbg_ptr);
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
     * This instance's parse tree (AST)
     * @returns {(RainlangSource)[]}
     */
    get ast() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rainlangdocument_ast(retptr, this.__wbg_ptr);
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
     * This instance's problems
     * @returns {(Problem)[]}
     */
    get problems() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rainlangdocument_problems(retptr, this.__wbg_ptr);
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
            wasm.rainlangdocument_comments(retptr, this.__wbg_ptr);
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
     * Compiles this instance's text given the entrypoints and INPE2Deployer
     * @param {INPE2Deployer} deployer
     * @returns {Promise<ParseResult>}
     */
    compile(deployer) {
        const ret = wasm.rainlangdocument_compile(this.__wbg_ptr, addHeapObject(deployer));
        return takeObject(ret);
    }
}
module.exports.RainlangDocument = RainlangDocument;

module.exports.__wbindgen_object_drop_ref = function (arg0) {
    takeObject(arg0);
};

module.exports.__wbindgen_boolean_get = function (arg0) {
    const v = getObject(arg0);
    const ret = typeof v === "boolean" ? (v ? 1 : 0) : 2;
    return ret;
};

module.exports.__wbindgen_is_bigint = function (arg0) {
    const ret = typeof getObject(arg0) === "bigint";
    return ret;
};

module.exports.__wbindgen_bigint_from_i64 = function (arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

module.exports.__wbindgen_jsval_eq = function (arg0, arg1) {
    const ret = getObject(arg0) === getObject(arg1);
    return ret;
};

module.exports.__wbindgen_bigint_from_u64 = function (arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_error_new = function (arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbindgen_number_get = function (arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "number" ? obj : undefined;
    getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
    getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
};

module.exports.__wbindgen_string_get = function (arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "string" ? obj : undefined;
    var ptr1 = isLikeNone(ret)
        ? 0
        : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbindgen_is_object = function (arg0) {
    const val = getObject(arg0);
    const ret = typeof val === "object" && val !== null;
    return ret;
};

module.exports.__wbindgen_in = function (arg0, arg1) {
    const ret = getObject(arg0) in getObject(arg1);
    return ret;
};

module.exports.__wbindgen_is_string = function (arg0) {
    const ret = typeof getObject(arg0) === "string";
    return ret;
};

module.exports.__wbindgen_is_undefined = function (arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

module.exports.__wbindgen_number_new = function (arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

module.exports.__wbindgen_object_clone_ref = function (arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_string_new = function (arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbg_raindocument_new = function (arg0) {
    const ret = RainDocument.__wrap(arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_as_number = function (arg0) {
    const ret = +getObject(arg0);
    return ret;
};

module.exports.__wbindgen_cb_drop = function (arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    const ret = false;
    return ret;
};

module.exports.__wbindgen_jsval_loose_eq = function (arg0, arg1) {
    const ret = getObject(arg0) == getObject(arg1);
    return ret;
};

module.exports.__wbg_String_389b54bd9d25375f = function (arg0, arg1) {
    const ret = String(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbg_getwithrefkey_4a92a5eca60879b9 = function (arg0, arg1) {
    const ret = getObject(arg0)[getObject(arg1)];
    return addHeapObject(ret);
};

module.exports.__wbg_set_9182712abebf82ef = function (arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
};

module.exports.__wbg_String_88810dfeb4021902 = function (arg0, arg1) {
    const ret = String(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbg_getwithrefkey_5e6d9547403deab8 = function (arg0, arg1) {
    const ret = getObject(arg0)[getObject(arg1)];
    return addHeapObject(ret);
};

module.exports.__wbg_set_841ac57cff3d672b = function (arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
};

module.exports.__wbg_fetch_6a2624d7f767e331 = function (arg0) {
    const ret = fetch(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_queueMicrotask_4d890031a6a5a50c = function (arg0) {
    queueMicrotask(getObject(arg0));
};

module.exports.__wbg_queueMicrotask_adae4bc085237231 = function (arg0) {
    const ret = getObject(arg0).queueMicrotask;
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_function = function (arg0) {
    const ret = typeof getObject(arg0) === "function";
    return ret;
};

module.exports.__wbg_fetch_693453ca3f88c055 = function (arg0, arg1) {
    const ret = getObject(arg0).fetch(getObject(arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_newwithstrandinit_f581dff0d19a8b03 = function () {
    return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_signal_3c701f5f40a5f08d = function (arg0) {
    const ret = getObject(arg0).signal;
    return addHeapObject(ret);
};

module.exports.__wbg_new_0ae46f44b7485bb2 = function () {
    return handleError(function () {
        const ret = new AbortController();
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_abort_2c4fb490d878d2b2 = function (arg0) {
    getObject(arg0).abort();
};

module.exports.__wbg_new_7a20246daa6eec7e = function () {
    return handleError(function () {
        const ret = new Headers();
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_append_aa3f462f9e2b5ff2 = function () {
    return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments);
};

module.exports.__wbg_instanceof_Response_4c3b1446206114d1 = function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Response;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_url_83a6a4f65f7a2b38 = function (arg0, arg1) {
    const ret = getObject(arg1).url;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbg_status_d6d47ad2837621eb = function (arg0) {
    const ret = getObject(arg0).status;
    return ret;
};

module.exports.__wbg_headers_24def508a7518df9 = function (arg0) {
    const ret = getObject(arg0).headers;
    return addHeapObject(ret);
};

module.exports.__wbg_arrayBuffer_5b2688e3dd873fed = function () {
    return handleError(function (arg0) {
        const ret = getObject(arg0).arrayBuffer();
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_get_f01601b5a68d10e3 = function (arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
};

module.exports.__wbg_length_1009b1af0c481d7b = function (arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_new_ffc6d4d085022169 = function () {
    const ret = [];
    return addHeapObject(ret);
};

module.exports.__wbg_newnoargs_c62ea9419c21fbac = function (arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_new_bfd4534b584a9593 = function () {
    const ret = new Map();
    return addHeapObject(ret);
};

module.exports.__wbg_next_9b877f231f476d01 = function (arg0) {
    const ret = getObject(arg0).next;
    return addHeapObject(ret);
};

module.exports.__wbg_next_6529ee0cca8d57ed = function () {
    return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_done_5fe336b092d60cf2 = function (arg0) {
    const ret = getObject(arg0).done;
    return ret;
};

module.exports.__wbg_value_0c248a78fdc8e19f = function (arg0) {
    const ret = getObject(arg0).value;
    return addHeapObject(ret);
};

module.exports.__wbg_iterator_db7ca081358d4fb2 = function () {
    const ret = Symbol.iterator;
    return addHeapObject(ret);
};

module.exports.__wbg_get_7b48513de5dc5ea4 = function () {
    return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_call_90c26b09837aba1c = function () {
    return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_new_9fb8d994e1c0aaac = function () {
    const ret = new Object();
    return addHeapObject(ret);
};

module.exports.__wbg_self_f0e34d89f33b99fd = function () {
    return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_window_d3b084224f4774d7 = function () {
    return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_globalThis_9caa27ff917c6860 = function () {
    return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_global_35dfdd59a4da3e74 = function () {
    return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_set_f2740edb12e318cd = function (arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
};

module.exports.__wbg_from_71add2e723d1f1b2 = function (arg0) {
    const ret = Array.from(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_isArray_74fb723e24f76012 = function (arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
};

module.exports.__wbg_instanceof_ArrayBuffer_e7d53d51371448e2 = function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_call_5da1969d7cd31ccd = function () {
    return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_set_d257c6f2da008627 = function (arg0, arg1, arg2) {
    const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
};

module.exports.__wbg_isSafeInteger_f93fde0dca9820f8 = function (arg0) {
    const ret = Number.isSafeInteger(getObject(arg0));
    return ret;
};

module.exports.__wbg_entries_9e2e2aa45aa5094a = function (arg0) {
    const ret = Object.entries(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_new_60f57089c7563e81 = function (arg0, arg1) {
    try {
        var state0 = { a: arg0, b: arg1 };
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wbg_adapter_210(a, state0.b, arg0, arg1);
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

module.exports.__wbg_resolve_6e1c6553a82f85b7 = function (arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_then_3ab08cd4fbb91ae9 = function (arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_then_8371cc12cfedc5a2 = function (arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
};

module.exports.__wbg_buffer_a448f833075b71ba = function (arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

module.exports.__wbg_newwithbyteoffsetandlength_d0482f893617af71 = function (arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_new_8f67e318f15d7254 = function (arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_set_2357bf09366ee480 = function (arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};

module.exports.__wbg_length_1d25fa9e4ac21ce7 = function (arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_instanceof_Uint8Array_bced6f43aed8c1aa = function (arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_stringify_e1b19966d964d242 = function () {
    return handleError(function (arg0) {
        const ret = JSON.stringify(getObject(arg0));
        return addHeapObject(ret);
    }, arguments);
};

module.exports.__wbg_has_9c711aafa4b444a2 = function () {
    return handleError(function (arg0, arg1) {
        const ret = Reflect.has(getObject(arg0), getObject(arg1));
        return ret;
    }, arguments);
};

module.exports.__wbg_set_759f75cd92b612d2 = function () {
    return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments);
};

module.exports.__wbindgen_bigint_get_as_i64 = function (arg0, arg1) {
    const v = getObject(arg1);
    const ret = typeof v === "bigint" ? v : undefined;
    getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret;
    getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
};

module.exports.__wbindgen_debug_string = function (arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_memory = function () {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

module.exports.__wbindgen_closure_wrapper4764 = function (arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 1760, __wbg_adapter_50);
    return addHeapObject(ret);
};

/**
 * Method to be used as Tagged Templates to activate embedded rainlang in
 * javascript/typescript in vscode that highlights the rainlang syntax.
 * Requires rainlang vscode extension to be installed.
 */
function rainlang(stringChunks, ...vars) {
    let result = "";
    for (let i = 0; i < stringChunks.length; i++) {
        result = result + stringChunks[i] + (vars[i] ?? "");
    }
    return result;
}
module.exports.rainlang = rainlang;

const { Buffer } = require("buffer");
const wasmB64 = require("../wasm.json");
const bytes = Buffer.from(wasmB64.wasm, "base64");

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;
