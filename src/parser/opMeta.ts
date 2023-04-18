import { sgBook } from "@rainprotocol/meta";
import { isBytesLike, BytesLike, hexlify } from "../utils";


export class OpMetaCache {
    public readonly subgraphs: string[] = [];
    private cache: { [hash: string]: BytesLike } = {};

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
                            ? options.initialCache[hash]
                            : hexlify(options.initialCache[hash], { allowMissingPrefix: true });
                        this.cache[hash] = _opmeta;
                    }
                }
            }
            Object.assign(this.cache, options.initialCache);
        }
    }

    public addOpMeta(metaHash: string, opmeta: BytesLike) {
        if (!metaHash.match(/^0x[a-fA-F0-9]{64}$/)) throw new Error(
            "invalid meta hash!"
        );
        if (!isBytesLike(opmeta)) throw new Error("invalid op meta!");
        const _opmeta = typeof opmeta === "string" 
            ? opmeta 
            : hexlify(opmeta, { allowMissingPrefix: true });
        this.cache[metaHash] = _opmeta;
    }

    public addSubgraph(subgraphUrl: string) {
        if (!subgraphUrl.startsWith("https://api.thegraph.com/subgraphs/name/")) throw new Error(
            "invalid subgraph endpoint url!"
        );
        if (!this.subgraphs.includes(subgraphUrl)) this.subgraphs.push(subgraphUrl);
    }

}