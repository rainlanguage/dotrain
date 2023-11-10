[Home](../index.md) &gt; [fillOut](./fillout_1.md)

# Function fillOut()

Fills a text with whitespaces excluding a position by keeping line structure intact

<b>Signature:</b>

```typescript
function fillOut(text: string, position: AST.Offsets): string;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The text |
|  position | [AST.Offsets](../namespaces/ast/types/offsets.md) | the position to exclude |

<b>Returns:</b>

`string`

The edited text string

