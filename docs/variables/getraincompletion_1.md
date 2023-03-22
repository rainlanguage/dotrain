[Home](../index.md) &gt; [getRainCompletion](./getraincompletion_1.md)

# Function getRainCompletion()

Provides completion items

<b>Signature:</b>

```typescript
function getRainCompletion(document: TextDocument, position: Position, opmeta: Uint8Array | string, setting?: LanguageServiceParams): CompletionItem[] | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocuemnt |
|  position | `Position` | Position of the textDocument to get the completion items for |
|  opmeta | `Uint8Array \| string` | The op meta |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`CompletionItem[] | null`

Completion items and null if no completion items were available for that position

