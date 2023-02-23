[Home](../index.md) &gt; [rld](./rld_1.md)

# Function rld()

Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rain document

<b>Signature:</b>

```typescript
function rld(expressionConfig: ExpressionConfig, opmeta: Uint8Array | string, prettyFormat?: boolean): Promise<RainDocument>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expressionConfig | [ExpressionConfig](../types/expressionconfig.md) | ExpressionConfig to decompile |
|  opmeta | `Uint8Array \| string` | Ops meta as bytes ie hex string or Uint8Array or json content as string |
|  prettyFormat | `boolean` | (optional) Format the output document |

<b>Returns:</b>

`Promise<RainDocument>`

a Raindocument promise

