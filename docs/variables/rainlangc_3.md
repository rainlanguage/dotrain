[Home](../index.md) &gt; [rainlangc](./rainlangc_3.md)

# Function rainlangc()

Rain Language Compiler (rainlangc), compiles Rain Documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rainlangc(rainDocument: RainDocument, entrypoints: string[], metaStore?: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | [RainDocument](../classes/raindocument.md) | The RainDocument to compile |
|  entrypoints | `string[]` |  |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object to get merged with the RainDocument's MetaStore |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

