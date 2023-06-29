[Home](../index.md) &gt; [dotrainc](./dotrainc_1.md)

# Function dotrainc()

RainDocument (dotrain) compiler, compiles a text into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function dotrainc(text: string, entrypoints: string[], metaStore?: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  entrypoints | `string[]` |  |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

