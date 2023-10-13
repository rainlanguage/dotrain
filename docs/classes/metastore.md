[Home](../index.md) &gt; [MetaStore](./metastore.md)

# Class MetaStore

Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities to easliy utilize them. Hashes must 32 bytes (in hex string format) and will be stored as lower case. Meta bytes must be valid cbor encoded.

Subgraph endpoint URLs specified in "RAIN\_SUBGRAPHS" from \[rainlang-meta\](https://github.com/rainprotocol/meta/blob/master/src/rainSubgraphs.ts) are included by default as subgraph endpoint URLs to search for metas.

Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraphs()`<!-- -->.

Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`<!-- -->, it regenrates the hash from the meta to check the validity of the k/v pair and if the check fails it tries to read the meta from subgraphs and store the result if it finds any.

<b>Signature:</b>

```typescript
class MetaStore 
```

## Example


```typescript
// to instantiate with including default subgraphs
const metaStore = new MetaStore();

// or to instantiate with initial arguments
const metaStore = await MetaStore.create(sgEndpoints, initCache);

// add a new subgraph endpoint url to the subgraph list
metaStore.addSubgraphs(["sg-url-1", "sg-url-2", ...])

// update the store with a new MetaStore object (merges the stores)
await metaStore.updateStore(newMetaStore)

// updates the meta store with a new meta
await metaStore.updateStore(metaHash, metaBytes)

// updates the meta store with a new meta by searching through subgraphs
await metaStore.updateStore(metaHash)

// to get a record from store
const opMeta = metaStore.getRecord(metaHash);

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [subgraphs](./metastore.md#subgraphs-property) | `string[]` | Subgraph endpoint URLs of this store instance |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(options)](./metastore.md#create-method-static-1) | Creates a fresh instance of MetaStore object |

## Methods

|  Method | Description |
|  --- | --- |
|  [addSubgraphs(subgraphUrls, sync)](./metastore.md#addSubgraphs-method-1) | Adds a new subgraphs endpoint URL to the subgraph list |
|  [getCache()](./metastore.md#getCache-method-1) | Get the whole meta cache |
|  [getRecord(metaHash)](./metastore.md#getRecord-method-1) | Get op meta for a given meta hash |
|  [updateStore(metaStore)](./metastore.md#updateStore-method-1) | Updates the whole store with the given MetaStore instance |
|  [updateStore(metaHash, metaBytes)](./metastore.md#updateStore-method-2) | Updates the meta store for the given meta hash and meta bytes |
|  [updateStore(metaHash)](./metastore.md#updateStore-method-3) | Updates the meta store for the given meta hash by reading from subgraphs |

## Property Details

<a id="subgraphs-property"></a>

### subgraphs

Subgraph endpoint URLs of this store instance

<b>Signature:</b>

```typescript
readonly subgraphs: string[];
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(options)

Creates a fresh instance of MetaStore object

<b>Signature:</b>

```typescript
static create(options?: {
        includeDefaultSubgraphs?: boolean;
        subgraphs?: string[];
        records?: {
            [hash: string]: string;
        };
    }): Promise<MetaStore>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | <pre>{&#010;    includeDefaultSubgraphs?: boolean;&#010;    subgraphs?: string[];&#010;    records?: {&#010;        [hash: string]: string;&#010;    };&#010;}</pre> | (optional) Options for instantiation |

<b>Returns:</b>

`Promise<MetaStore>`

## Method Details

<a id="addSubgraphs-method-1"></a>

### addSubgraphs(subgraphUrls, sync)

Adds a new subgraphs endpoint URL to the subgraph list

<b>Signature:</b>

```typescript
addSubgraphs(subgraphUrls: string[], sync?: boolean): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  subgraphUrls | `string[]` | Array of subgraph endpoint URLs |
|  sync | `boolean` | Option to search for settlement for unsetteled hashs in the cache with new added subgraphs, default is true |

<b>Returns:</b>

`Promise<void>`

<a id="getCache-method-1"></a>

### getCache()

Get the whole meta cache

<b>Signature:</b>

```typescript
getCache(): {
        [hash: string]: MetaRecord | undefined | null;
    };
```
<b>Returns:</b>

`{
        [hash: string]: MetaRecord | undefined | null;
    }`

<a id="getRecord-method-1"></a>

### getRecord(metaHash)

Get op meta for a given meta hash

<b>Signature:</b>

```typescript
getRecord(metaHash: string): MetaRecord | undefined | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaHash | `string` | The meta hash |

<b>Returns:</b>

`MetaRecord | undefined | null`

A MetaRecord or undefined if no matching record exists or null if the record has no sttlement

<a id="updateStore-method-1"></a>

### updateStore(metaStore)

Updates the whole store with the given MetaStore instance

<b>Signature:</b>

```typescript
updateStore(metaStore: MetaStore): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaStore | [MetaStore](./metastore.md) | A MetaStore object instance |

<b>Returns:</b>

`void`

<a id="updateStore-method-2"></a>

### updateStore(metaHash, metaBytes)

Updates the meta store for the given meta hash and meta bytes

<b>Signature:</b>

```typescript
updateStore(metaHash: string, metaBytes: string): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaHash | `string` | The meta hash (32 bytes hex string) |
|  metaBytes | `string` | The meta bytes that are cbor encoded emitted by the deployed contract |

<b>Returns:</b>

`Promise<void>`

<a id="updateStore-method-3"></a>

### updateStore(metaHash)

Updates the meta store for the given meta hash by reading from subgraphs

<b>Signature:</b>

```typescript
updateStore(metaHash: string): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaHash | `string` | The meta hash (32 bytes hex string) |

<b>Returns:</b>

`Promise<void>`

