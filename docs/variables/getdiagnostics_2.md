[Home](../index.md) &gt; [getDiagnostics](./getdiagnostics_2.md)

# Function getDiagnostics()

Provides diagnostics

<b>Signature:</b>

```typescript
function getDiagnostics(document: RainDocument, setting?: LanguageServiceParams): Promise<Diagnostic[]>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | [RainDocument](../classes/raindocument.md) | The RainDocument |
|  setting | [LanguageServiceParams](../interfaces/languageserviceparams.md) | (optional) Language service params |

<b>Returns:</b>

`Promise<Diagnostic[]>`

A promise that resolves with diagnostics

