[Home](../index.md) &gt; [rlc](./rlc_2.md)

# Function rlc()

Rain Language Compiler (rlc), compiles Text Documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rlc(document: TextDocument, metaStore?: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument to compile |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

