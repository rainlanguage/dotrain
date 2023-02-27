[Home](../index.md) &gt; [rlc](./rlc_1.md)

# Function rlc()

Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(document: RainDocument | string, opmeta?: Uint8Array | string): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `RainDocument \| string` | The document to compile, either a RainDocument instance or a raw text with opmeta |
|  opmeta | `Uint8Array \| string` | (optional) Ops meta as bytes ie hex string or Uint8Array or json content as string |

<b>Returns:</b>

`Promise<ExpressionConfig>`

ExpressionConfig promise

