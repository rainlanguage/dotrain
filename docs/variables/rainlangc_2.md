[Home](../index.md) &gt; [rainlangc](./rainlangc_2.md)

# Function rainlangc()

Rain Language Compiler (rainlangc), compiles Text Documents into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rainlangc(document: TextDocument, entrypoints: string[], metaStore?: MetaStore): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument to compile |
|  entrypoints | `string[]` |  |
|  metaStore | [MetaStore](../classes/metastore.md) | (optional) MetaStore object |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

