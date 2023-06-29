[Home](../index.md) &gt; [dotrainc](./dotrainc_3.md)

# Function dotrainc()

RainDocument (dotrain) compiler, compiles Rain Documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function dotrainc(rainDocument: RainDocument, entrypoints: string[], metaStore?: MetaStore): Promise<ExpressionConfig>;
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

