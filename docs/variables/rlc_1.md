[Home](../index.md) &gt; [rlc](./rlc_1.md)

# Function rlc()

Rain Language Compiler (rlc), compiles a text into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(text: string, metaStore?: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

