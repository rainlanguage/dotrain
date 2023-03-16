[Home](../index.md) &gt; [LanguageService](./languageservice.md)

# Interface LanguageService

Interface for Rain language services

<b>Signature:</b>

```typescript
interface LanguageService 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [rainDocuments](./languageservice.md#rainDocuments-property) | `Map<string, RainDocument>` |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [doComplete(textDocument, position, opmeta)](./languageservice.md#doComplete-method-1) |  |
|  [doHover(textDocument, position, opmeta)](./languageservice.md#doHover-method-1) |  |
|  [doValidation(textDocument, opmeta)](./languageservice.md#doValidation-method-1) |  |
|  [newRainDocument(textDocument, opmeta)](./languageservice.md#newRainDocument-method-1) |  |
|  [parseRainDocument(textDocument, opmeta)](./languageservice.md#parseRainDocument-method-1) |  |

## Property Details

<a id="rainDocuments-property"></a>

### rainDocuments

<b>Signature:</b>

```typescript
rainDocuments: Map<string, RainDocument>;
```

## Method Details

<a id="doComplete-method-1"></a>

### doComplete(textDocument, position, opmeta)

<b>Signature:</b>

```typescript
doComplete(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string): CompletionItem[] | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  position | `Position` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`CompletionItem[] | null`

<a id="doHover-method-1"></a>

### doHover(textDocument, position, opmeta)

<b>Signature:</b>

```typescript
doHover(textDocument: TextDocument, position: Position, opmeta?: Uint8Array | string): Hover | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  position | `Position` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`Hover | null`

<a id="doValidation-method-1"></a>

### doValidation(textDocument, opmeta)

<b>Signature:</b>

```typescript
doValidation(textDocument: TextDocument, opmeta?: Uint8Array | string): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`Promise<Diagnostic[]>`

<a id="newRainDocument-method-1"></a>

### newRainDocument(textDocument, opmeta)

<b>Signature:</b>

```typescript
newRainDocument(textDocument: TextDocument, opmeta: Uint8Array | string): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`RainDocument`

<a id="parseRainDocument-method-1"></a>

### parseRainDocument(textDocument, opmeta)

<b>Signature:</b>

```typescript
parseRainDocument(textDocument: TextDocument, opmeta?: Uint8Array | string): RainDocumentResult;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  opmeta | `Uint8Array \| string` |  |

<b>Returns:</b>

`RainDocumentResult`

