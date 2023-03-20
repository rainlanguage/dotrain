[Home](../index.md) &gt; [getRainDiagnostics](./getraindiagnostics_2.md)

# Function getRainDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getRainDiagnostics(document: RainDocument, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | [RainDocument](../classes/raindocument.md) | The RainDocument |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

Diagnostics promise

