[Home](../index.md) &gt; [getLanguageService](./getlanguageservice_1.md)

# Function getLanguageService()

Main function to get Rain language services initiated and ready to recieve TextDocuments to provide the desired language services

<b>Signature:</b>

```typescript
function getLanguageService(params?: LanguageServiceParams): LanguageService;
```

## Example


```ts
// importing
import { getLanguageService } from "@rainprotocol/rainlang";

// initiating the services
const langServices = getLanguageService(clientCapabilities);

// getting validation results (lsp Diagnostics)
const errors = await langServices.doValidate(myDocument, opmeta);

```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [LanguageServiceParams](../interfaces/languageserviceparams.md) |  |

<b>Returns:</b>

`LanguageService`

