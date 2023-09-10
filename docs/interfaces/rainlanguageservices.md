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
|  [metaStore](./rainlanguageservices.md#metaStore-property) | [MetaStore](../classes/metastore.md) |  |
|  [rainDocuments](./rainlanguageservices.md#rainDocuments-property) | `Map<string, RainDocument>` |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [doComplete(textDocument, position)](./rainlanguageservices.md#doComplete-method-1) |  |
|  [doHover(textDocument, position)](./rainlanguageservices.md#doHover-method-1) |  |
|  [doValidate(textDocument)](./rainlanguageservices.md#doValidate-method-1) |  |
|  [newRainDocument(textDocument)](./rainlanguageservices.md#newRainDocument-method-1) |  |

## Property Details

<a id="metaStore-property"></a>

### metaStore

<b>Signature:</b>

```typescript
metaStore: MetaStore;
```

<a id="rainDocuments-property"></a>

### rainDocuments

<b>Signature:</b>

```typescript
rainDocuments: Map<string, RainDocument>;
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

