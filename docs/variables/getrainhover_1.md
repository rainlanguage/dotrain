[Home](../index.md) &gt; [getRainHover](./getrainhover_1.md)

# Function getRainHover()

Provides hover items

<b>Signature:</b>

```typescript
function getRainHover(document: TextDocument, position: Position, setting?: LanguageServiceParams): Promise<Hover | null>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocuemnt |
|  position | `Position` | Position of the textDocument to get the completion items for |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Hover | null>`

Promise of hover item and null if no item was available for that position

