[Home](../index.md) &gt; [rlc](./rlc_2.md)

# Function rlc()

Rain Language Compiler (rlc), compiles Rain documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(document: TextDocument, opmeta: Uint8Array | string): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument to compile |
|  opmeta | `Uint8Array \| string` | Ops meta as bytes ie hex string or Uint8Array |

<b>Returns:</b>

`Promise<ExpressionConfig>`

ExpressionConfig promise

