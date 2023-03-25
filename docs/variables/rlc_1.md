[Home](../index.md) &gt; [rlc](./rlc_1.md)

# Function rlc()

Rain Language Compiler (rlc), compiles documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(text: string, opmeta: Uint8Array | string): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  opmeta | `Uint8Array \| string` | Ops meta as bytes ie hex string or Uint8Array |

<b>Returns:</b>

`Promise<ExpressionConfig>`

ExpressionConfig promise

