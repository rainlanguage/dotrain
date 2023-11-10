[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [RainDocument](./raindocument_1.md)

# Function Compile.RainDocument()

RainDocument compiler, compiles a text into valid ExpressionConfig

<b>Signature:</b>

```typescript
function RainDocument(text: string, entrypoints: string[], options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  entrypoints | `string[]` | The entrypoints to compile |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with `undefined` if problems were found within the text

