[Home](../index.md) &gt; [buildMetaInfo](./buildmetainfo_1.md)

# Function buildMetaInfo()

Build a general info from a meta content (used as hover info for a meta hash)

<b>Signature:</b>

```typescript
function buildMetaInfo(hash: string, metaStore: MetaStore): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  hash | `string` | The meta hash to build info from |
|  metaStore | [MetaStore](../classes/metastore.md) | The meta store instance that keeps this hash as record |

<b>Returns:</b>

`Promise<string>`

A promise that resolves with general info about the meta

