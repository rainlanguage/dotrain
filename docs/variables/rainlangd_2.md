[Home](../index.md) &gt; [rainlangd](./rainlangd_2.md)

# Function rainlangd()

Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rainlang instance

<b>Signature:</b>

```typescript
function rainlangd(expressionConfig: ExpressionConfig, opmeta: OpMeta[]): Promise<Rainlang>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expressionConfig | [ExpressionConfig](../types/expressionconfig.md) | ExpressionConfig to decompile |
|  opmeta | `OpMeta[]` | Array of ops metas |

<b>Returns:</b>

`Promise<Rainlang>`

A promise that resolves with a Rainlang instance

