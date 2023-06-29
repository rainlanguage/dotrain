[Home](../index.md) &gt; [rainlangc](./rainlangc_2.md)

# Function rainlangc()

Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rainlangc(text: string, opmetaHash: string, metaStore: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  opmetaHash | `string` | The op meta hash |
|  metaStore | [MetaStore](../classes/metastore.md) |  |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with problems found in text

