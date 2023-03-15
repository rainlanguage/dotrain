[Home](../index.md) &gt; [LanguageService](./languageservice.md)

# Interface LanguageService

Interface for Rain language services

<b>Signature:</b>

```typescript
interface LanguageService 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [doComplete(document, opmeta, position)](./languageservice.md#doComplete-method-1) |  |
|  [doHover(document, opmeta, position)](./languageservice.md#doHover-method-1) |  |
|  [doValidation(document, opmeta)](./languageservice.md#doValidation-method-1) |  |
|  [newRainDocument(document, opmeta)](./languageservice.md#newRainDocument-method-1) |  |
|  [parseRainDocument(document, opmeta)](./languageservice.md#parseRainDocument-method-1) |  |

## Method Details

<a id="doComplete-method-1"></a>

### doComplete(document, opmeta, position)

<b>Signature:</b>

```typescript
doComplete(document: TextDocument, opmeta: Uint8Array | string, position: Position): Promise<CompletionItem[] | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |
|  position | `Position` |  |

<b>Returns:</b>

`Promise<CompletionItem[] | null>`

<a id="doHover-method-1"></a>

### doHover(document, opmeta, position)

<b>Signature:</b>

```typescript
doHover(document: TextDocument, opmeta: Uint8Array | string, position: Position): Promise<Hover | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |
|  position | `Position` |  |

<b>Returns:</b>

`Promise<Hover | null>`

<a id="doValidation-method-1"></a>

### doValidation(document, opmeta)

<b>Signature:</b>

```typescript
doValidation(document: TextDocument, opmeta: Uint8Array | string): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`Promise<Diagnostic[]>`

<a id="newRainDocument-method-1"></a>

### newRainDocument(document, opmeta)

<b>Signature:</b>

```typescript
newRainDocument(document: TextDocument, opmeta: Uint8Array | string): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`RainDocument`

<a id="parseRainDocument-method-1"></a>

### parseRainDocument(document, opmeta)

<b>Signature:</b>

```typescript
parseRainDocument(document: TextDocument, opmeta: Uint8Array | string): RainDocumentResult;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  document | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`RainDocumentResult`

