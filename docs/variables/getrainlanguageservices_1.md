[Home](../index.md) &gt; [getRainLanguageServices](./getrainlanguageservices_1.md)

# Function getRainLanguageServices()

Main function to get Rain language services initiated and ready to recieve TextDocuments to provide the desired language services

<b>Signature:</b>

```typescript
function getRainLanguageServices(params?: LanguageServiceParams): RainLanguageServices;
```

## Example


```ts
// importing
import { getRainLanguageServices } from "@rainprotocol/rainlang";

// initiating the services
const langServices = getRainLanguageServices({clientCapabilities, metastore});

// getting validation results (lsp Diagnostics)
const errors = await langServices.doValidate(myTextDocument);

```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [LanguageServiceParams](../interfaces/languageserviceparams.md) |  |

<b>Returns:</b>

`RainLanguageServices`

