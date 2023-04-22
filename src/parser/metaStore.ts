import { isBytesLike, deepCopy } from "../utils";
import { sgBook, searchMeta, MAGIC_NUMBERS, decodeRainMetaDocument, keccak256 } from "@rainprotocol/meta";


/**
 * @public 
 * Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities 
 * to easliy utilize them. Hashes must 32 bytes (in hex string format) and will 
 * be stored as lower case and meta bytes must be valid cbor encoded that emitted by the contract.
 * 
 * Subgraph endpoint URLs specified in "sgBook" from 
 * [rainlang-meta](https://github.com/rainprotocol/meta/blob/master/src/subgraphBook.ts) 
 * are included by default as subgraph endpoint URLs to search for metas.
 * 
 * Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraph()`, 
 * which must be valid starting with `https"//api.thegraph.com/subgraphs/name/`, else they will be ignored.
 * 
 * Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`,
 * it regenrates the hash from the meta to check the validity of the k/v pair and if the check
 * fails it tries to read the meta from subgraphs and store the result if it finds any.
 * 
 * @example
 * ```typescript
 * // to instantiate
 * const metaStore = new MetaStore(sgEndpoints, initCache);
 * 
 * // add a new subgraph endpoint url to the subgraph list
 * metaStore.addSubgraph("https://api.thegraph.com...")
 * 
 * // update the store with a new MetaStore object (merges the stores)
 * await metaStore.updateStore(newMetaStore)
 * 
 * // updates the op meta store with a new meta
 * await metaStore.updateOpMetaStore(metaHash, metaBytes)
 * 
 * // updates the op meta store with a new meta by searching through subgraphs
 * await metaStore.updateOpMetaStore(metaHash)
 * 
 * // updates the contract meta store with a new meta
 * await metaStore.updateContractMetaStore(metaHash, metaBytes)
 * 
 * // updates the contract meta store with a new meta by searching through subgraphs
 * await metaStore.updateContractMetaStore(metaHash)
 * 
 * // to get an op meta from store
 * const opMeta = metaStore.getOpMeta(metaHash);
 * 
 * // to get an contract meta from store
 * const contractMeta = metaStore.getContractMeta(metaHash);
 * ```
 */
export class MetaStore {
    /**
     * @public Subgraph endpoint URLs of this store instance
     */
    public readonly subgraphs: string[] = [];
    /**
     * @private Meta Hash/Op Meta kv pairs of this store instance.
     */
    private opMetaCache: { [hash: string]: string | undefined } = {};
    /**
     * @private Meta Hash/contract Meta kv pairs of this store instance.
     */
    private contractMetaCache: { [hash: string]: string | undefined } = {};

    /**
     * @public Constructor of the class
     * Use `MetaStore.create` to instantiate with initial options.
     */
    constructor() {
        Object.values(sgBook).forEach(v => {
            if (!this.subgraphs.includes(v)) this.subgraphs.push(v);
        });
    }

    /**
     * @public Creates a fresh instance of MetaStore object
     * @param options - (optional) Options for instantiation
     */
    public static async create(
        options?: {
            /**
             * Additional subgraphs endpoint URLs to include
             */
            subgraphs?: string[];
            /**
             * Initial meta hash and meta bytes k/v pairs to include in the store
             * Meta bytes must be valid cbor encoded emitted by the contract event
             */
            initMetas?: { [hash: string]: string }
        }
    ): Promise<MetaStore> {
        const settle = async(hash: string, bytes: string) => {
            let check1 = true;
            let check2 = true;
            const _decodeBytes = decodeRainMetaDocument(bytes);
            for (const item of _decodeBytes) {
                if (check1 && item.get(1) === MAGIC_NUMBERS.OPS_META_V1.toString()) {
                    await metaStore.updateOpMetaStore(hash, bytes);
                    check1 = false;
                }
                if (check2 && item.get(1) === MAGIC_NUMBERS.CONTRACT_META_V1.toString()) {
                    await metaStore.updateContractMetaStore(hash, bytes);
                    check2 = false;
                }
            }
        };

        const metaStore = new MetaStore();
        if (options?.subgraphs) options.subgraphs.forEach(v => {
            metaStore.addSubgraph(v);
        });
        if (options?.initMetas) {
            const hashes = Object.keys(options.initMetas);
            for (const hash of hashes) {
                try {
                    await settle(hash, options.initMetas[hash]);
                }
                catch {
                    try {
                        await settle(hash, await searchMeta(hash));
                    }
                    catch {
                        console.log(`cannot find a settlement for hash: ${hash}`);
                    }
                }
            }
        }
        return metaStore;
    }

    /**
     * @public Get op meta for a given meta hash
     * @param metaHash - The meta hash
     * @returns The op meta bytes as hex string if it exists in the store and `undefined` if it doesn't
     */
    public getOpMeta(metaHash: string): string | undefined {
        return this.exctractMeta(this.opMetaCache[metaHash.toLowerCase()], "op");
    }

    /**
     * @public Get contract meta for a given meta hash
     * @param metaHash - The meta hash
     * @returns The contract meta bytes as hex string if it exists in the store and `undefined` if it doesn't
     */
    public getContractMeta(metaHash: string): string | undefined {
        return this.exctractMeta(this.contractMetaCache[metaHash.toLowerCase()], "op");
    }

    /**
     * @public Get the whole op meta k/v store
     * @returns The op meta store
     */
    public getOpMetaStore(): { [hash: string]: string | undefined } {
        return deepCopy(this.opMetaCache);
    }

    /**
     * @public Get the whole contract meta k/v store
     * @returns The contract meta store
     */
    public getContractMetaStore(): { [hash: string]: string | undefined } {
        return deepCopy(this.contractMetaCache);
    }

    /**
     * @public Updates the whole store with the given MetaStore instance
     * @param metaStore - A MetaStore object instance
     */
    public updateStore(metaStore: MetaStore) {
        const _opkv = metaStore.getOpMetaStore();
        const _contkv = metaStore.getContractMetaStore();
        this.opMetaCache = {
            ...this.opMetaCache,
            ..._opkv
        };
        this.contractMetaCache = {
            ...this.contractMetaCache,
            ..._contkv
        };
        for (const sg of metaStore.subgraphs) {
            if (!this.subgraphs.includes(sg)) this.subgraphs.push(sg);
        }
    }

    /**
     * @public Updates the op meta store with the given MetaStore instance
     * @param metaStore - A MetaStore object instance
     */
    public updateOpMetaStore(metaStore: MetaStore): void

    /**
     * @public Updates the op meta store for the given meta hash and meta bytes
     * @param metaHash - The meta hash (32 bytes hex string)
     * @param metaBytes - The meta bytes, 
     */
    public async updateOpMetaStore(metaHash: string, metaBytes: string): Promise<void>

    /**
     * @public Updates the op meta store for the given meta hash by reading from subgraphs
     * @param metaHash - The meta hash (32 bytes hex string)
     */
    public async updateOpMetaStore(metaHash: string): Promise<void>

    public async updateOpMetaStore(hashOrStore: string | MetaStore, metaBytes = "") {
        if (hashOrStore instanceof MetaStore) {
            const _kv = hashOrStore.getOpMetaStore();
            this.opMetaCache = {
                ...this.opMetaCache,
                ..._kv
            };
            for (const sg of hashOrStore.subgraphs) {
                if (!this.subgraphs.includes(sg)) this.subgraphs.push(sg);
            }
        }
        else {
            if (hashOrStore.match(/^0x[a-fA-F0-9]{64}$/)) {
                if (
                    metaBytes && 
                    isBytesLike(metaBytes) && 
                    keccak256(metaBytes).toLowerCase() === hashOrStore.toLowerCase()
                ) this.opMetaCache[hashOrStore.toLowerCase()] = metaBytes.toLowerCase();
                else {
                    try {
                        const _res = await searchMeta(hashOrStore);
                        const _metaBytes = decodeRainMetaDocument(_res).find(
                            v => v.get(1) === MAGIC_NUMBERS.OPS_META_V1.toString()
                        ) ? _res : undefined;
                        this.opMetaCache[hashOrStore.toLowerCase()] = _metaBytes?.toLowerCase();
                    }
                    catch {
                        this.opMetaCache[hashOrStore.toLowerCase()] = undefined;
                    }
                }
            }
        }
    }

    /**
     * @public Updates the contract meta store with the given MetaStore instance
     * @param metaStore - A MetaStore object instance
     */
    public updateContractMetaStore(metaStore: MetaStore): void

    /**
     * @public Updates the contract meta store for the given meta hash and meta bytes
     * @param metaHash - The meta hash (32 bytes hex string)
     * @param metaBytes - The meta bytes, 
     */
    public async updateContractMetaStore(metaHash: string, metaBytes: string): Promise<void>

    /**
     * @public Updates the contract meta store for the given meta hash by reading from subgraphs
     * @param metaHash - The meta hash (32 bytes hex string)
     */
    public async updateContractMetaStore(metaHash: string): Promise<void>

    public async updateContractMetaStore(hashOrStore: string | MetaStore, metaBytes = "") {
        if (hashOrStore instanceof MetaStore) {
            const _kv = hashOrStore.getContractMetaStore();
            this.contractMetaCache = {
                ...this.contractMetaCache,
                ..._kv
            };
            for (const sg of hashOrStore.subgraphs) {
                if (!this.subgraphs.includes(sg)) this.subgraphs.push(sg);
            }
        }
        else {
            if (hashOrStore.match(/^0x[a-fA-F0-9]{64}$/)) {
                if (
                    metaBytes && 
                    isBytesLike(metaBytes) && 
                    keccak256(metaBytes).toLowerCase() === hashOrStore.toLowerCase()
                ) this.opMetaCache[hashOrStore.toLowerCase()] = metaBytes.toLowerCase();
                else {
                    try {
                        const _res = await searchMeta(hashOrStore);
                        const _metaBytes = decodeRainMetaDocument(_res).find(
                            v => v.get(1) === MAGIC_NUMBERS.CONTRACT_META_V1.toString()
                        ) ? _res : undefined;
                        this.opMetaCache[hashOrStore.toLowerCase()] = _metaBytes?.toLowerCase();
                    }
                    catch {
                        this.opMetaCache[hashOrStore.toLowerCase()] = undefined;
                    }
                }
            }
        }
    }

    /**
     * @public Adds a new subgraph endpoint URL to the subgraph list
     * @param subgraphUrl - The subgraph endpoint URL
     */
    public addSubgraph(subgraphUrl: string) {
        if (!subgraphUrl.startsWith("https://api.thegraph.com/subgraphs/name/")) {
            if (!this.subgraphs.includes(subgraphUrl)) this.subgraphs.push(subgraphUrl);
        }
    }

    /**
     * Extracts the compressed meta bytes out of a cbor encoded bytes
     */
    private exctractMeta(
        metaBytes: string | undefined, 
        type: "op" | "contract"
    ): string | undefined {
        return metaBytes 
            ? decodeRainMetaDocument(metaBytes).find(v => {
                v.get(1) === (
                    type === "op" 
                        ? MAGIC_NUMBERS.OPS_META_V1 
                        : MAGIC_NUMBERS.CONTRACT_META_V1
                ).toString();
            }).get(0)
            : undefined;
    }

}