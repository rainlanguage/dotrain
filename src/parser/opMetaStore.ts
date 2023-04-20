import { isBytesLike, BytesLike, hexlify } from "../utils";
import { sgBook, searchOpMeta, checkOpMetaHash } from "@rainprotocol/meta";


/**
 * @public 
 * Stores k/v pairs of meta hash and op metas, as well as subgraph endpoint urls that will
 * be used to query, given a meta hash. Hashes must 32 bytes (in hex string format).
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
 * ```
 */
export class OpMetaStore {
    public readonly subgraphs: string[] = [];
    public readonly cache: { [hash: string]: string } = {};

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
                            ? options.initialCache[hash] as string
                            : hexlify(options.initialCache[hash], { allowMissingPrefix: true });
                        if (checkOpMetaHash(_opmeta, hash)) this.cache[hash] = _opmeta;
                    }
                }
            }
        }
    }


    /**
     * @public Updates the store for the given meta hash and op meta
     * @param metaHash - The meta hash (32 bytes hex string)
     * @param opmeta - (optional) The op meta bytes, 
     * if not provided will fetch from subgraphs,
     * if provided will check its validity
     */
    public async updateStore(metaHash: string, opmeta: BytesLike = "") {
        if (!metaHash.match(/^0x[a-fA-F0-9]{64}$/)) throw new Error(
            "invalid meta hash!"
        );
        if (opmeta) {
            if (!isBytesLike(opmeta)) throw new Error("invalid op meta!");
            const _opmeta = typeof opmeta === "string" 
                ? opmeta 
                : hexlify(opmeta, { allowMissingPrefix: true });
            if (checkOpMetaHash(_opmeta, metaHash)) this.cache[metaHash] = _opmeta;
            else throw new Error("provided meta hash and opmeta don't match");
        }
        else {
            const _opmeta = await searchOpMeta(metaHash);
            this.cache[metaHash] = _opmeta;
        }
    }

    /**
     * @public Adds a new subgraph endpoint URL to the subgraph list
     * @param subgraphUrl - The subgraph endpoint URL
     */
    public addSubgraph(subgraphUrl: string) {
        if (!subgraphUrl.startsWith("https://api.thegraph.com/subgraphs/name/")) throw new Error(
            "invalid subgraph endpoint url!"
        );
        if (!this.subgraphs.includes(subgraphUrl)) this.subgraphs.push(subgraphUrl);
    }

}