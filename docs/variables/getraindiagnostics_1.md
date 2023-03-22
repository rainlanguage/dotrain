[Home](../index.md) &gt; [getRainDiagnostics](./getraindiagnostics_1.md)

# Function getRainDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getRainDiagnostics(document: TextDocument, opmeta: Uint8Array | string, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` | The TextDocument |
|  opmeta | `Uint8Array \| string` | The op meta |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

Diagnostics promise

