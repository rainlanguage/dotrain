[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [RainDocument](./raindocument_3.md)

# Function Compile.RainDocument()

RainDocument compiler, compiles Rain Documents into valid ExpressionConfig

<b>Signature:</b>

```typescript
function RainDocument(rainDocument: RD, entrypoints: string[], options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | `RD` | The RainDocument to compile |
|  entrypoints | `string[]` | The entrypoints to compile |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

