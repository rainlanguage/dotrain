[Home](../index.md) &gt; [getRainCompletion](./getraincompletion_2.md)

# Function getRainCompletion()

Provides completion items

<b>Signature:</b>

```typescript
function getRainCompletion(document: RainDocument, position: Position, setting?: LanguageServiceParams): Promise<CompletionItem[] | null>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | [RainDocument](../classes/raindocument.md) | The RainDocument object instance |
|  position | `Position` | Position of the textDocument to get the completion items for |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<CompletionItem[] | null>`

A promise that resolves with Completion items or null if no completion items were available for that position

