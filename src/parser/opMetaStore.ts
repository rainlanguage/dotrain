import { isBytesLike, BytesLike, hexlify, deepCopy } from "../utils";
import { sgBook, searchOpMeta, checkOpMetaHash } from "@rainprotocol/meta";


/**
 * @public 
 * Stores k/v pairs of meta hash and op metas, as well as subgraph endpoint urls that will
 * be used to query, given a meta hash. Hashes must 32 bytes (in hex string format) and will 
 * be stored as lower case (same with op meta bytes, they will be stored as hex string lower case).
 * 
 * Subgraph endpoint URLs specified in "sgBook" from 
 * [rainlang-meta](https://github.com/rainprotocol/meta/blob/master/src/subgraphBook.ts) 
 * are included by default.
 * 
 * Provided subgraphs, either at instantiation or when using `addSubgraph()`, must be valid 
 * starting with `https"//api.thegraph.com/subgraphs/name/`, else they will be ignored.
 * 
 * Given a k/v pair of meta hash and op meta either at instantiation or when using `updateStore()`,
 * it regenrates the hash from the op meta to check the validity of the k/v pair and if the check
 * fails they will be ignored.
 * 
 * All k/v pairs will be stored as **lower case**. So for reading op meta from the `cache`, make sure 
 * the keys is in lower case. (use `toLowerCase()`)
 * 
 * @example
 * ```typescript
 * // to instantiate
 * const opMetaStore = new OpMetaStore(sgEndpoints, initCache);
 * 
 * // add a new subgraph endpoint url to the subgraph list
 * opMetaStore.addSubgraph("https://api.thegraph.com...")
 * 
 * // update the store with a new op meta (fetches the opmeta from subgraph)
 * await opMetaStore.updateStore(metaHash)
 * 
 * // updates the store with a new op meta (checks the validity, ignores if doesn;t pass the check)
 * await opMetaStore.updateStore(metaHash, opMeta)
 * 
 * // to read an op meta of a meta hash (important to provide the key as lower case)
 * const opmeta = opMetaStore.cache[metaHash.toLowerCase()];
 * ```
 */
export class OpMetaStore {
    /**
     * @public Subgraph endpoint URLs of this store instance
     */
    public readonly subgraphs: string[] = [];
    /**
     * @private Meta Hash/Op Meta kv pairs of this store instance.
     * 
     * **IMPORTANT** - Make sure to use `toLowerCase()` for keys when reading.
     */
    private cache: { [hash: string]: string } = {};

    constructor(
        options?: {
            subgraphs?: string[];
            initialCache?: { [hash: string]: BytesLike }
        }
    ) {
        Object.values(sgBook).forEach(v => {
            if (!this.subgraphs.includes(v)) this.subgraphs.push(v);
        });
        if (options?.subgraphs) options.subgraphs.forEach(v => {
            if (v.startsWith("https://api.thegraph.com/subgraphs/name/")) {
                if (!this.subgraphs.includes(v)) this.subgraphs.push(v);
            }
        });
        if (options?.initialCache) {
            const keys = Object.keys(options.initialCache);
            for (const hash of keys) {
                if (hash.match(/^0x[a-fA-F0-9]{64}$/)) {
                    if (isBytesLike(options.initialCache[hash])) {
                        const _opmeta = typeof options.initialCache[hash] === "string"
                            ? (options.initialCache[hash] as string).toLowerCase()
                            : hexlify(
                                options.initialCache[hash], 
                                { allowMissingPrefix: true }
                            ).toLowerCase();
                        if (checkOpMetaHash(_opmeta, hash.toLowerCase())) this.cache[
                            hash.toLowerCase()
                        ] = _opmeta;
                    }
                }
            }
        }
    }

    /**
     * @public Get op meta for a given meta hash
     * @param metaHash - The meta hash
     * @returns The op meta bytes as hex string if it exists in the store and `undefined` if it doesn't
     */
    public getOpMeta(metaHash: string): string | undefined {
        return this.cache[metaHash.toLowerCase()];
    }

    /**
     * @public Get the whole k/v store object
     * @returns This instance's cache
     */
    public getStore(): { [hash: string]: string } {
        return deepCopy(this.cache);
    }

    /**
     * @public Updates the store with the given OpMetaStore instance
     * @param opMetaStore - An OpMetaStore object instance
     */
    public updateStore(opMetaStore: OpMetaStore): void

    /**
     * @public Updates the store for the given meta hash and op meta
     * @param metaHash - The meta hash (32 bytes hex string)
     * @param opmeta - The op meta bytes, 
     */
    public updateStore(metaHash: string, opmeta: BytesLike): void

    /**
     * @public Updates the store for the given meta hash by reading from subgraphs
     * @param metaHash - The meta hash (32 bytes hex string)
     */
    public async updateStore(metaHash: string): Promise<void>

    public async updateStore(hashOrStore: string | OpMetaStore, opmeta: BytesLike = "") {
        if (hashOrStore instanceof OpMetaStore) {
            const _kv = hashOrStore.getStore();
            this.cache = {
                ...this.cache,
                ..._kv
            };
            for (const sg of hashOrStore.subgraphs) {
                if (!this.subgraphs.includes(sg)) this.subgraphs.push(sg);
            }
        }
        else {
            if (hashOrStore.match(/^0x[a-fA-F0-9]{64}$/)) {
                if (opmeta) {
                    if (!isBytesLike(opmeta)) throw new Error("invalid op meta!");
                    const _opmeta = typeof opmeta === "string" 
                        ? opmeta.toLowerCase()
                        : hexlify(opmeta, { allowMissingPrefix: true }).toLowerCase();
                    if (checkOpMetaHash(_opmeta, hashOrStore.toLowerCase())) this.cache[
                        hashOrStore.toLowerCase()
                    ] = _opmeta;
                }
                else {
                    const _opmeta = await searchOpMeta(hashOrStore);
                    this.cache[hashOrStore.toLowerCase()] = _opmeta;
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

}