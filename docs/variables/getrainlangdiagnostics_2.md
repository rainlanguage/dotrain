[Home](../index.md) &gt; [getRainlangDiagnostics](./getrainlangdiagnostics_2.md)

# Function getRainlangDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getRainlangDiagnostics(document: RainDocument, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | [RainDocument](../classes/raindocument.md) | The RainDocument |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

A promise that resolves with diagnostics

