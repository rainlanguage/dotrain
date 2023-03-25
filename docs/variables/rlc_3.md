[Home](../index.md) &gt; [rlc](./rlc_3.md)

# Function rlc()

Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(rainDocument: RainDocument): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | [RainDocument](../classes/raindocument.md) | The rain document to compile |

<b>Returns:</b>

`Promise<ExpressionConfig>`

ExpressionConfig promise

