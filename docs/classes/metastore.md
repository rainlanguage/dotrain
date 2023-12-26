[Home](../index.md) &gt; [MetaStore](./metastore.md)

# Class MetaStore

In-memory CAS (content addressed storage) for all metadata required for parsing a RainDocument which basically stores k/v pairs of meta hash, meta bytes and ExpressionDeployer reproducible data as well as providing functionalities to easliy read them from the CAS.

Hashes are 32 bytes (in hex string format) and will be stored as lower case and meta bytes are valid cbor encoded as Uint8Array. ExpressionDeployers data are in form of js object mapped to deployedBytecode meta hash and deploy transaction hash.

<b>Signature:</b>

```typescript
class MetaStore 
```

## Example


```typescript
// to instantiate with including default subgraphs
// pass 'false' to not include default rain subgraph endpoints
const store = new MetaStore();

// or to instantiate with initial arguments
const store = MetaStore.create(options);

// add a new subgraph endpoint URLs
store.addSubgraphs(["sg-url-1", "sg-url-2", ...])

// merge another MetaStore instance to this instance
store.merge(anotherMetaStore)

// updates the meta store with a new meta by searching through subgraphs
await store.update(hash)

// to get a meta bytes of a corresponding hash from store
const meta = store.getMeta(hash);

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [cache](./metastore.md#cache-property) | `Record<string, Uint8Array>` | All the cached meta hash/bytes pairs |
|  [deployerCache](./metastore.md#deployerCache-property) | `Record<string, INPE2Deployer>` | All the cached NPE2 deployers |
|  [dotrainCache](./metastore.md#dotrainCache-property) | `Record<string, string>` | All the cached dotrain uri/meta hash pairs |
|  [subgraphs](./metastore.md#subgraphs-property) | `string[]` | All subgraph endpoint URLs of this instance |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(options)](./metastore.md#create-method-static-1) | Creates new instance of Store with given initial values, it checks the validity of each item and only stores those that are valid |

## Methods

|  Method | Description |
|  --- | --- |
|  [addSubgraphs(subgraphs)](./metastore.md#addSubgraphs-method-1) | Adds new subgraph endpoints |
|  [deleteDotrain(uri, keep\_meta)](./metastore.md#deleteDotrain-method-1) | Deletes a dotrain record given its uri |
|  [free()](./metastore.md#free-method-1) |  |
|  [getDeployer(hash)](./metastore.md#getDeployer-method-1) | Get the NPE2 deployer details of the given deployer bytecode hash if it is cached |
|  [getDotrainHash(uri)](./metastore.md#getDotrainHash-method-1) | Get the corresponding dotrain hash of the given dotrain uri if it is cached |
|  [getDotrainMeta(uri)](./metastore.md#getDotrainMeta-method-1) | Get the corresponding meta bytes of the given dotrain uri if it is cached |
|  [getDotrainUri(hash)](./metastore.md#getDotrainUri-method-1) | Get the corresponding uri of the given dotrain hash if it is cached |
|  [getMeta(hash)](./metastore.md#getMeta-method-1) | Get the corresponding meta bytes of the given hash if it is cached |
|  [merge(other)](./metastore.md#merge-method-1) | Merges another instance of MetaStore to this instance lazily, avoids duplicates |
|  [searchDeployer(hash)](./metastore.md#searchDeployer-method-1) | Searches for NPE2 deployer details in the subgraphs given the deployer hash |
|  [searchDeployerCheck(hash)](./metastore.md#searchDeployerCheck-method-1) | If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer() |
|  [setDeployer(deployer\_response)](./metastore.md#setDeployer-method-1) | Sets deployer record |
|  [setDotrain(text, uri, keep\_old)](./metastore.md#setDotrain-method-1) | Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in the scope of MetaStore and handling and passing on a correct URI for the given text must be handled externally by the implementer |
|  [update(hash)](./metastore.md#update-method-1) | Updates the meta cache by searching through all subgraphs for the given hash |
|  [updateCheck(hash)](./metastore.md#updateCheck-method-1) | First checks if the meta is stored and returns it if so, else will perform update() |
|  [updateWith(hash, bytes)](./metastore.md#updateWith-method-1) | Updates the meta cache by the given hash and meta bytes, checks the hash to bytes validity |

## Property Details

<a id="cache-property"></a>

### cache

All the cached meta hash/bytes pairs

<b>Signature:</b>

```typescript
readonly cache: Record<string, Uint8Array>;
```

<a id="deployerCache-property"></a>

### deployerCache

All the cached NPE2 deployers

<b>Signature:</b>

```typescript
readonly deployerCache: Record<string, INPE2Deployer>;
```

<a id="dotrainCache-property"></a>

### dotrainCache

All the cached dotrain uri/meta hash pairs

<b>Signature:</b>

```typescript
readonly dotrainCache: Record<string, string>;
```

<a id="subgraphs-property"></a>

### subgraphs

All subgraph endpoint URLs of this instance

<b>Signature:</b>

```typescript
readonly subgraphs: string[];
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(options)

Creates new instance of Store with given initial values, it checks the validity of each item and only stores those that are valid

<b>Signature:</b>

```typescript
static create(options: MetaStoreOptions): MetaStore;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [MetaStoreOptions](../interfaces/metastoreoptions.md) | initial values |

<b>Returns:</b>

`MetaStore`

{<!-- -->MetaStore<!-- -->}

## Method Details

<a id="addSubgraphs-method-1"></a>

### addSubgraphs(subgraphs)

Adds new subgraph endpoints

<b>Signature:</b>

```typescript
addSubgraphs(subgraphs: string[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  subgraphs | `string[]` |  |

<b>Returns:</b>

`void`

<a id="deleteDotrain-method-1"></a>

### deleteDotrain(uri, keep\_meta)

Deletes a dotrain record given its uri

<b>Signature:</b>

```typescript
deleteDotrain(uri: string, keep_meta: boolean): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uri | `string` |  |
|  keep\_meta | `boolean` |  |

<b>Returns:</b>

`void`

<a id="free-method-1"></a>

### free()

<b>Signature:</b>

```typescript
free(): void;
```
<b>Returns:</b>

`void`

<a id="getDeployer-method-1"></a>

### getDeployer(hash)

Get the NPE2 deployer details of the given deployer bytecode hash if it is cached

<b>Signature:</b>

```typescript
getDeployer(hash: string): INPE2Deployer | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`INPE2Deployer | undefined`

{<!-- -->INPE2Deployer \| undefined<!-- -->}

<a id="getDotrainHash-method-1"></a>

### getDotrainHash(uri)

Get the corresponding dotrain hash of the given dotrain uri if it is cached

<b>Signature:</b>

```typescript
getDotrainHash(uri: string): string | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uri | `string` |  |

<b>Returns:</b>

`string | undefined`

{<!-- -->string \| undefined<!-- -->}

<a id="getDotrainMeta-method-1"></a>

### getDotrainMeta(uri)

Get the corresponding meta bytes of the given dotrain uri if it is cached

<b>Signature:</b>

```typescript
getDotrainMeta(uri: string): Uint8Array | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uri | `string` |  |

<b>Returns:</b>

`Uint8Array | undefined`

{<!-- -->Uint8Array \| undefined<!-- -->}

<a id="getDotrainUri-method-1"></a>

### getDotrainUri(hash)

Get the corresponding uri of the given dotrain hash if it is cached

<b>Signature:</b>

```typescript
getDotrainUri(hash: string): string | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`string | undefined`

{<!-- -->string \| undefined<!-- -->}

<a id="getMeta-method-1"></a>

### getMeta(hash)

Get the corresponding meta bytes of the given hash if it is cached

<b>Signature:</b>

```typescript
getMeta(hash: string): Uint8Array | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`Uint8Array | undefined`

{<!-- -->Uint8Array \| undefined<!-- -->}

<a id="merge-method-1"></a>

### merge(other)

Merges another instance of MetaStore to this instance lazily, avoids duplicates

<b>Signature:</b>

```typescript
merge(other: MetaStore): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  other | [MetaStore](./metastore.md) |  |

<b>Returns:</b>

`void`

<a id="searchDeployer-method-1"></a>

### searchDeployer(hash)

Searches for NPE2 deployer details in the subgraphs given the deployer hash

<b>Signature:</b>

```typescript
searchDeployer(hash: string): Promise<INPE2Deployer | undefined>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`Promise<INPE2Deployer | undefined>`

{<!-- -->Promise<!-- -->&lt;<!-- -->INPE2Deployer \| undefined<!-- -->&gt;<!-- -->}

<a id="searchDeployerCheck-method-1"></a>

### searchDeployerCheck(hash)

If the NPE2 deployer is already cached it returns it immediately else performs searchDeployer()

<b>Signature:</b>

```typescript
searchDeployerCheck(hash: string): Promise<INPE2Deployer | undefined>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`Promise<INPE2Deployer | undefined>`

{<!-- -->Promise<!-- -->&lt;<!-- -->INPE2Deployer \| undefined<!-- -->&gt;<!-- -->}

<a id="setDeployer-method-1"></a>

### setDeployer(deployer\_response)

Sets deployer record

<b>Signature:</b>

```typescript
setDeployer(deployer_response: DeployerQueryResponse): INPE2Deployer;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  deployer\_response | [DeployerQueryResponse](../interfaces/deployerqueryresponse.md) |  |

<b>Returns:</b>

`INPE2Deployer`

<a id="setDotrain-method-1"></a>

### setDotrain(text, uri, keep\_old)

Stores (or updates in case the URI already exists) the given dotrain text as meta into the store cache and maps it to the given uri (path), it should be noted that reading the content of the dotrain is not in the scope of MetaStore and handling and passing on a correct URI for the given text must be handled externally by the implementer

<b>Signature:</b>

```typescript
setDotrain(text: string, uri: string, keep_old: boolean): string[];
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  uri | `string` |  |
|  keep\_old | `boolean` | keeps the old dotrain meta in the cache |

<b>Returns:</b>

`string[]`

{<!-- -->string\[\]<!-- -->} new hash and old hash if the given uri was already cached

<a id="update-method-1"></a>

### update(hash)

Updates the meta cache by searching through all subgraphs for the given hash

<b>Signature:</b>

```typescript
update(hash: string): Promise<Uint8Array | undefined>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`Promise<Uint8Array | undefined>`

{<!-- -->Promise<!-- -->&lt;<!-- -->Uint8Array \| undefined<!-- -->&gt;<!-- -->}

<a id="updateCheck-method-1"></a>

### updateCheck(hash)

First checks if the meta is stored and returns it if so, else will perform update()

<b>Signature:</b>

```typescript
updateCheck(hash: string): Promise<Uint8Array | undefined>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |

<b>Returns:</b>

`Promise<Uint8Array | undefined>`

{<!-- -->Promise<!-- -->&lt;<!-- -->Uint8Array \| undefined<!-- -->&gt;<!-- -->}

<a id="updateWith-method-1"></a>

### updateWith(hash, bytes)

Updates the meta cache by the given hash and meta bytes, checks the hash to bytes validity

<b>Signature:</b>

```typescript
updateWith(hash: string, bytes: Uint8Array): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` |  |
|  bytes | `Uint8Array` |  |

<b>Returns:</b>

`void`

