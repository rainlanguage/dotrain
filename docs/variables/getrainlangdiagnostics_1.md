[Home](../index.md) &gt; [getRainlangDiagnostics](./getrainlangdiagnostics_1.md)

# Function getRainlangDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getRainlangDiagnostics(document: TextDocument, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

A promise that resolves with diagnostics

