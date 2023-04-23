[Home](../index.md) &gt; [getRainDiagnostics](./getraindiagnostics_1.md)

# Function getRainDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getRainDiagnostics(document: TextDocument, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

A promise that resolves with diagnostics

