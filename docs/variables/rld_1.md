[Home](../index.md) &gt; [rld](./rld_1.md)

# Function rld()

Rain Language Decompiler (rld), decompiles ExpressionConfig (bytes) to a valid Rain document

<b>Signature:</b>

```typescript
function rld(expressionConfig: ExpressionConfig, metaHash: string, metaStore?: MetaStore, prettyFormat?: boolean): Promise<RainDocument>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expressionConfig | [ExpressionConfig](../types/expressionconfig.md) | ExpressionConfig to decompile |
|  metaHash | `string` | The meta hash |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object instance |
|  prettyFormat | `boolean` | (optional) Format the output document |

<b>Returns:</b>

`Promise<RainDocument>`

A promise that resolves with a RainDocument

