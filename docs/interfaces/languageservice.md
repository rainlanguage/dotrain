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
|  [doComplete(textDocument, position)](./languageservice.md#doComplete-method-1) |  |
|  [doHover(textDocument, position)](./languageservice.md#doHover-method-1) |  |
|  [doValidation(textDocument)](./languageservice.md#doValidation-method-1) |  |
|  [newRainDocument(textDocument)](./languageservice.md#newRainDocument-method-1) |  |

## Method Details

<a id="doComplete-method-1"></a>

### doComplete(textDocument, position)

<b>Signature:</b>

```typescript
doComplete(textDocument: TextDocument, position: Position): Promise<CompletionItem[] | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  position | `Position` |  |

<b>Returns:</b>

`Promise<CompletionItem[] | null>`

<a id="doHover-method-1"></a>

### doHover(textDocument, position)

<b>Signature:</b>

```typescript
doHover(textDocument: TextDocument, position: Position): Promise<Hover | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |
|  position | `Position` |  |

<b>Returns:</b>

`Promise<Hover | null>`

<a id="doValidation-method-1"></a>

### doValidation(textDocument)

<b>Signature:</b>

```typescript
doValidation(textDocument: TextDocument): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |

<b>Returns:</b>

`Promise<Diagnostic[]>`

<a id="newRainDocument-method-1"></a>

### newRainDocument(textDocument)

<b>Signature:</b>

```typescript
newRainDocument(textDocument: TextDocument): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |

<b>Returns:</b>

`Promise<RainDocument>`

