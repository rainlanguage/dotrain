[Home](../index.md) &gt; [RainLanguageServices](./rainlanguageservices.md)

# Interface RainLanguageServices

Interface for Rain language services

<b>Signature:</b>

```typescript
interface RainLanguageServices 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [metaStore](./rainlanguageservices.md#metaStore-property) | `Meta.Store` |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [doComplete(textDocument, position)](./rainlanguageservices.md#doComplete-method-1) |  |
|  [doComplete(rainDocument, position)](./rainlanguageservices.md#doComplete-method-2) |  |
|  [doHover(textDocument, position)](./rainlanguageservices.md#doHover-method-1) |  |
|  [doHover(rainDocument, position)](./rainlanguageservices.md#doHover-method-2) |  |
|  [doValidate(textDocument)](./rainlanguageservices.md#doValidate-method-1) |  |
|  [doValidate(rainDocument)](./rainlanguageservices.md#doValidate-method-2) |  |
|  [newRainDocument(textDocument)](./rainlanguageservices.md#newRainDocument-method-1) |  |

## Property Details

<a id="metaStore-property"></a>

### metaStore

<b>Signature:</b>

```typescript
metaStore: Meta.Store;
```

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

<a id="doComplete-method-2"></a>

### doComplete(rainDocument, position)

<b>Signature:</b>

```typescript
doComplete(rainDocument: RainDocument, position: Position): Promise<CompletionItem[] | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | [RainDocument](../classes/raindocument.md) |  |
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

<a id="doHover-method-2"></a>

### doHover(rainDocument, position)

<b>Signature:</b>

```typescript
doHover(rainDocument: RainDocument, position: Position): Promise<Hover | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | [RainDocument](../classes/raindocument.md) |  |
|  position | `Position` |  |

<b>Returns:</b>

`Promise<Hover | null>`

<a id="doValidate-method-1"></a>

### doValidate(textDocument)

<b>Signature:</b>

```typescript
doValidate(textDocument: TextDocument): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` |  |

<b>Returns:</b>

`Promise<Diagnostic[]>`

<a id="doValidate-method-2"></a>

### doValidate(rainDocument)

<b>Signature:</b>

```typescript
doValidate(rainDocument: RainDocument): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainDocument | [RainDocument](../classes/raindocument.md) |  |

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

