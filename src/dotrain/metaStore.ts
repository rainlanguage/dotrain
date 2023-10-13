import { getEncodedMetaType } from "../utils";
import { RAIN_SUBGRAPHS, searchMeta, MAGIC_NUMBERS, decodeRainMetaDocument, keccak256, cborDecode } from "@rainprotocol/meta";


/**
 * @public Type of a meta sequence resolved from a meta hash
 */
export type MetaSequence = {
    /**
     * Sequence content
     */
    content: string;
    /**
     * Sequence magic number
     */
    magicNumber: MAGIC_NUMBERS;
}[];

/**
 * @public Type of encoded meta bytes
 */
export type EncodedMetaType = "sequence" | "single";

/**
 * @public Type for a record in MetaStore cache
 */
export type MetaRecord = {
    /**
     * The type of the meta
     */
    type: EncodedMetaType;
    /**
     * The decoded sequence maps
     */
    sequence: MetaSequence;
}

/**
 * @public 
 * Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities 
 * to easliy utilize them. Hashes must 32 bytes (in hex string format) and will 
 * be stored as lower case.
 * Meta bytes must be valid cbor encoded.
 * 
 * Subgraph endpoint URLs specified in "RAIN_SUBGRAPHS" from 
 * [rainlang-meta](https://github.com/rainprotocol/meta/blob/master/src/rainSubgraphs.ts) 
 * are included by default as subgraph endpoint URLs to search for metas.
 * 
 * Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraphs()`.
 * 
 * Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`,
 * it regenrates the hash from the meta to check the validity of the k/v pair and if the check
 * fails it tries to read the meta from subgraphs and store the result if it finds any.
 * 
 * @example
 * ```typescript
 * // to instantiate with including default subgraphs
 * const metaStore = new MetaStore();
 * 
 * // or to instantiate with initial arguments
 * const metaStore = await MetaStore.create(sgEndpoints, initCache);
 * 
 * // add a new subgraph endpoint url to the subgraph list
 * metaStore.addSubgraphs(["sg-url-1", "sg-url-2", ...])
 * 
 * // update the store with a new MetaStore object (merges the stores)
 * await metaStore.updateStore(newMetaStore)
 * 
 * // updates the meta store with a new meta
 * await metaStore.updateStore(metaHash, metaBytes)
 * 
 * // updates the meta store with a new meta by searching through subgraphs
 * await metaStore.updateStore(metaHash)
 * 
 * // to get a record from store
 * const opMeta = metaStore.getRecord(metaHash);
 * ```
 */
export class MetaStore {
    /**
     * Subgraph endpoint URLs of this store instance
     */
    public readonly subgraphs: string[] = [];
    /**
     * @internal k/v cache for hashs and their contents
     */
    private cache: { [hash: string]: MetaRecord | undefined | null } = {};
    // /**
    //  * Search meta in external sources queue
    //  */
    // private queue: { [hash: string]: any } = {};

    /**
     * @public Constructor of the class
     * Use `MetaStore.create` to instantiate with initial options.
     */
    constructor(includeDefualtSubgraphs = true) {
        if (includeDefualtSubgraphs) Object.values(RAIN_SUBGRAPHS).forEach(v => v.forEach(e => {
            if (!this.subgraphs.includes(e)) this.subgraphs.push(e);
        }));
    }

    /**
     * @public Creates a fresh instance of MetaStore object
     * @param options - (optional) Options for instantiation
     */
    public static async create(
        options?: {
            /**
             * Option to include default subgraphs
             */
            includeDefaultSubgraphs?: boolean;
            /**
             * Additional subgraphs endpoint URLs to include
             */
            subgraphs?: string[];
            /**
             * Records to add to the cache
             */
            records?: { [hash: string]: string }
        }
    ): Promise<MetaStore> {
        const metaStore = new MetaStore(!!options?.includeDefaultSubgraphs);
        if (options?.subgraphs && options.subgraphs.length) {
            metaStore.addSubgraphs(options?.subgraphs, false);
        }
        if (options?.records) {
            for (const hash in options.records) {
                await metaStore.updateStore(hash, options.records[hash]);
            }
        }
        return metaStore;
    }

    /**
     * @public Get op meta for a given meta hash
     * @param metaHash - The meta hash
     * @returns A MetaRecord or undefined if no matching record exists or null if the record has no sttlement
     */
    public getRecord(metaHash: string): MetaRecord | undefined | null {
        return this.cache[metaHash.toLowerCase()];
    }

    /**
     * @public Get the whole meta cache
     */
    public getCache(): { [hash: string]: MetaRecord | undefined | null } {
        return this.cache;
    }

    /**
     * @public Updates the whole store with the given MetaStore instance
     * @param metaStore - A MetaStore object instance
     */
    public updateStore(metaStore: MetaStore): void

    /**
     * @public Updates the meta store for the given meta hash and meta bytes
     * @param metaHash - The meta hash (32 bytes hex string)
     * @param metaBytes - The meta bytes that are cbor encoded emitted by the deployed contract 
     */
    public async updateStore(metaHash: string, metaBytes: string): Promise<void>

    /**
     * @public Updates the meta store for the given meta hash by reading from subgraphs
     * @param metaHash - The meta hash (32 bytes hex string)
     */
    public async updateStore(metaHash: string): Promise<void>

    public async updateStore(hashOrStore: string | MetaStore, metaBytes?: string) {
        if (hashOrStore instanceof MetaStore) {
            const _kv = hashOrStore.getCache();
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
                const hash = hashOrStore.toLowerCase();
                if (!this.cache[hash]) {
                    if (metaBytes) {
                        if (!metaBytes.startsWith("0x")) metaBytes = "0x" + metaBytes;
                        try {
                            if (
                                keccak256(metaBytes).toLowerCase() === hash
                            ) {
                                const _type = getEncodedMetaType(metaBytes);
                                const _content = metaBytes.toLowerCase();
                                this.cache[hash] = {
                                    type: _type,
                                    sequence: this.decodeContent(_content, _type)
                                };
                            }
                            else {
                                if (!this.cache[hash]) this.cache[hash] = null;
                            }
                        }
                        catch {
                            if (!this.cache[hash]) this.cache[hash] = null;
                        }
                    }
                    else {
                        try {
                            const _settlement = await searchMeta(hashOrStore, this.subgraphs);
                            this.cache[hash] = _settlement.rainMetaV1
                                ? {
                                    type: "sequence",
                                    sequence: this.decodeContent(
                                        _settlement.rainMetaV1.metaBytes,
                                        "sequence"
                                    )
                                }
                                : {
                                    type: "single",
                                    sequence: this.decodeContent(
                                        _settlement.metaContentV1.encodedData,
                                        "single"
                                    )
                                };
                        }
                        catch {
                            if (!this.cache[hash]) this.cache[hash] = null;
                            console.log(`cannot find any settlement for hash: ${hashOrStore}`);
                        }
                    //     if (this.queue[hash] !== undefined) {
                    //         clearTimeout(this.queue[hash].timeout);
                    //         this.queue[hash].resolve();
                    //     }
                    //     else this.queue[hash] = {};
                    //     await new Promise<void>(resolve => {
                    //         this.queue[hash].resolve = resolve;
                    //         this.queue[hash].timeout = setTimeout(
                    //             async() => {
                    //                 if (this.queue[hash]?.timeout) {
                    //                     clearTimeout(this.queue[hash].timeout);
                    //                 }
                    //                 delete this.queue[hash];
                    //                 try {
                    //                     const _settlement = await searchMeta(
                    //                         hashOrStore,
                    //                         this.subgraphs
                    //                     );
                    //                     this.cache[hash] = 
                    //                         _settlement.rainMetaV1
                    //                             ? {
                    //                                 type: "sequence",
                    //                                 sequence: this.decodeContent(
                    //                                     _settlement.rainMetaV1.metaBytes,
                    //                                     "sequence"
                    //                                 )
                    //                             }
                    //                             : {
                    //                                 type: "single",
                    //                                 sequence: this.decodeContent(
                    //                                     _settlement.metaContentV1.encodedData,
                    //                                     "single"
                    //                                 )
                    //                             };
                    //                 }
                    //                 catch {
                    //                     if (!this.cache[hash]) this.cache[hash] = null;
                    //                     console.log(`cannot find any settlement for hash: ${hashOrStore}`);
                    //                 }
                    //                 resolve();
                    //             },
                    //             300
                    //         );
                    //     });
                    }
                }
            }
        }
    }

    /**
     * @public Adds a new subgraphs endpoint URL to the subgraph list
     * @param subgraphUrls - Array of subgraph endpoint URLs
     * @param sync - Option to search for settlement for unsetteled hashs in the cache with new added subgraphs, default is true
     */
    public async addSubgraphs(subgraphUrls: string[], sync = true) {
        subgraphUrls.forEach(sg => {
            if (typeof sg === "string" && sg) {
                if (!this.subgraphs.includes(sg)) this.subgraphs.push(sg);
            }
        });
        if (sync) for (const hash in this.cache) {
            if (this.cache[hash] === undefined || this.cache[hash] === null) {
                try {
                    const _settlement = await searchMeta(hash, subgraphUrls);
                    this.cache[hash] = _settlement.rainMetaV1
                        ? {
                            type: "sequence",
                            sequence: this.decodeContent(
                                _settlement.rainMetaV1.metaBytes,
                                "sequence"
                            )
                        }
                        : {
                            type: "single",
                            sequence: this.decodeContent(
                                _settlement.metaContentV1.encodedData,
                                "single"
                            )
                        };
                }
                catch {
                    if (!this.cache[hash.toLowerCase()]) {
                        this.cache[hash.toLowerCase()] = null;
                    }
                }
            }
        }
    }

    /**
     * @internal Decode the compressed meta bytes out of a cbor encoded bytes
     */
    private decodeContent(
        metaBytes: string, 
        type: EncodedMetaType
    ): MetaSequence {
        const _metaSequence: MetaSequence = [];
        if (metaBytes) {
            try {
                if (type === "sequence") _metaSequence.push(
                    ...decodeRainMetaDocument(
                        metaBytes.startsWith("0x") ? metaBytes : "0x" + metaBytes
                    )?.map(v => {
                        try {
                            return {
                                content: v.get(0).toString("hex"),
                                magicNumber: v.get(1) as MAGIC_NUMBERS
                            };
                        }
                        catch {
                            return undefined;
                        }
                    })?.filter(
                        v => v !== undefined
                    ) as MetaSequence
                );
                else _metaSequence.push(
                    ...cborDecode(
                        metaBytes.startsWith("0x") ? metaBytes.slice(2) : metaBytes
                    )?.map(v => {
                        try {
                            return {
                                content: v.get(0).toString("hex"),
                                magicNumber: v.get(1) as MAGIC_NUMBERS
                            };
                        }
                        catch {
                            return undefined;
                        }
                    })?.filter(
                        v => v !== undefined
                    ) as MetaSequence
                );
            }
            catch { /**/ }
        }
        return _metaSequence;
    }
}
