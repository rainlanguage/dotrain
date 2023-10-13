[Home](../index.md) &gt; [dotraind](./dotraind_1.md)

# Function dotraind()

RainDocument (dotrain) decompiler, decompiles ExpressionConfig (bytes) to a valid RainDocument instance

<b>Signature:</b>

```typescript
function dotraind(expressionConfig: ExpressionConfig, metaHash: string, metaStore?: MetaStore): Promise<RainDocument>;
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

