[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [RainDocument](./raindocument_2.md)

# Function Compile.RainDocument()

RainDocument compiler, compiles Text Documents into valid ExpressionConfig

<b>Signature:</b>

```typescript
function RainDocument(document: TextDocument, entrypoints: string[], options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument to compile |
|  entrypoints | `string[]` | The entrypoints to compile |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

