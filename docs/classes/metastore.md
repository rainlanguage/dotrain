[Home](../index.md) &gt; [MetaStore](./metastore.md)

# Class MetaStore

Reads, stores and simply manages k/v pairs of meta hash and meta bytes and provides the functionalities to easliy utilize them. Hashes must 32 bytes (in hex string format) and will be stored as lower case. Meta bytes must be valid cbor encoded that emitted by the contract.

Subgraph endpoint URLs specified in "sgBook" from \[rainlang-meta\](https://github.com/rainprotocol/meta/blob/master/src/subgraphBook.ts) are included by default as subgraph endpoint URLs to search for metas.

Subgraphs URLs can also be provided, either at instantiation or when using `addSubgraph()`<!-- -->, which must be valid starting with `https"//api.thegraph.com/subgraphs/name/`<!-- -->, else they will be ignored.

Given a k/v pair of meta hash and meta bytes either at instantiation or when using `updateStore()`<!-- -->, it regenrates the hash from the meta to check the validity of the k/v pair and if the check fails it tries to read the meta from subgraphs and store the result if it finds any.

<b>Signature:</b>

```typescript
class MetaStore 
```

## Example


```typescript
// to instantiate
const metaStore = new MetaStore();

// or to instantiate with initial arguments
const metaStore = await MetaStore.create(sgEndpoints, initCache);

// add a new subgraph endpoint url to the subgraph list
metaStore.addSubgraph("https://api.thegraph.com...")

// update the store with a new MetaStore object (merges the stores)
await metaStore.updateStore(newMetaStore)

// updates the meta store with a new meta
await metaStore.updateStore(metaHash, metaBytes)

// updates the meta store with a new meta by searching through subgraphs
await metaStore.updateStore(metaHash)

// to get an op meta from store
const opMeta = metaStore.getOpMeta(metaHash);

// to get a contract meta from store
const contractMeta = metaStore.getContractMeta(metaHash);

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
|  [addSubgraph(subgraphUrl)](./metastore.md#addSubgraph-method-1) | Adds a new subgraph endpoint URL to the subgraph list |
|  [getContractMeta(metaHash)](./metastore.md#getContractMeta-method-1) | Get contract meta for a given meta hash |
|  [getContractMetaStore()](./metastore.md#getContractMetaStore-method-1) | Get the whole contract meta k/v store |
|  [getOpMeta(metaHash)](./metastore.md#getOpMeta-method-1) | Get op meta for a given meta hash |
|  [getOpMetaStore()](./metastore.md#getOpMetaStore-method-1) | Get the whole op meta k/v store |
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
        subgraphs?: string[];
        initMetas?: {
            [hash: string]: string;
        };
    }): Promise<MetaStore>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | <pre>{&#010;    subgraphs?: string[];&#010;    initMetas?: {&#010;        [hash: string]: string;&#010;    };&#010;}</pre> | (optional) Options for instantiation |

<b>Returns:</b>

`Promise<MetaStore>`

## Method Details

<a id="addSubgraph-method-1"></a>

### addSubgraph(subgraphUrl)

Adds a new subgraph endpoint URL to the subgraph list

<b>Signature:</b>

```typescript
addSubgraph(subgraphUrl: string): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  subgraphUrl | `string` | The subgraph endpoint URL |

<b>Returns:</b>

`void`

<a id="getContractMeta-method-1"></a>

### getContractMeta(metaHash)

Get contract meta for a given meta hash

<b>Signature:</b>

```typescript
getContractMeta(metaHash: string): string | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaHash | `string` | The meta hash |

<b>Returns:</b>

`string | undefined`

The contract meta bytes as hex string if it exists in the store and `undefined` if it doesn't

<a id="getContractMetaStore-method-1"></a>

### getContractMetaStore()

Get the whole contract meta k/v store

<b>Signature:</b>

```typescript
getContractMetaStore(): {
        [hash: string]: string | undefined;
    };
```
<b>Returns:</b>

`{
        [hash: string]: string | undefined;
    }`

The contract meta store

<a id="getOpMeta-method-1"></a>

### getOpMeta(metaHash)

Get op meta for a given meta hash

<b>Signature:</b>

```typescript
getOpMeta(metaHash: string): string | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metaHash | `string` | The meta hash |

<b>Returns:</b>

`string | undefined`

The op meta bytes as hex string if it exists in the store and `undefined` if it doesn't

<a id="getOpMetaStore-method-1"></a>

### getOpMetaStore()

Get the whole op meta k/v store

<b>Signature:</b>

```typescript
getOpMetaStore(): {
        [hash: string]: string | undefined;
    };
```
<b>Returns:</b>

`{
        [hash: string]: string | undefined;
    }`

The op meta store

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

