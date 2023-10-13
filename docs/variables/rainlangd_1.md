[Home](../index.md) &gt; [rainlangd](./rainlangd_1.md)

# Function rainlangd()

Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rainlang instance

<b>Signature:</b>

```typescript
function rainlangd(expressionConfig: ExpressionConfig, opmetaHash: string, metaStore?: MetaStore): Promise<Rainlang>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expressionConfig | [ExpressionConfig](../types/expressionconfig.md) | ExpressionConfig to decompile |
|  opmetaHash | `string` | The op meta hash |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object instance |

<b>Returns:</b>

`Promise<Rainlang>`

A promise that resolves with a Rainlang instance

