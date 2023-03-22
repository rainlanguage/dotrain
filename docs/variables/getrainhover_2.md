[Home](../index.md) &gt; [getRainHover](./getrainhover_2.md)

# Function getRainHover()

Provides hover items

<b>Signature:</b>

```typescript
function getRainHover(document: RainDocument, position: Position, setting?: LanguageServiceParams): Hover | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | [RainDocument](../classes/raindocument.md) | The RainDocument object instance |
|  position | `Position` | Position of the textDocument to get the completion items for |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Hover | null`

Promise of hover item and null if no item was available for that position

