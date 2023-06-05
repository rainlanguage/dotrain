[Home](../index.md) &gt; [rainlangd](./rainlangd_1.md)

# Function rainlangd()

Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rain document

<b>Signature:</b>

```typescript
function rainlangd(expressionConfig: ExpressionConfig, metaHash: string, metaStore?: MetaStore): Promise<RainDocument>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expressionConfig | [ExpressionConfig](../types/expressionconfig.md) | ExpressionConfig to decompile |
|  metaHash | `string` | The meta hash |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object instance |

<b>Returns:</b>

`Promise<RainDocument>`

A promise that resolves with a RainDocument

