[Home](../index.md) &gt; [rainlangc](./rainlangc_1.md)

# Function rainlangc()

Rain Language Compiler (rainlangc), compiles a text into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rainlangc(text: string, opmeta: OpMeta[]): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  opmeta | `OpMeta[]` | Array of ops metas |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with problems found in text

