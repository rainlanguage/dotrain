[Home](../index.md) &gt; [RainLanguageServices](./rainlanguageservices.md)

# Class RainLanguageServices

Provides LSP services which are methods that return LSP based results (Diagnostics, Hover, etc)

Provides methods for getting language services (such as diagnostics, completion, etc) for a given TextDocumentItem or a RainDocument. Each instance is linked to a shared locked MetaStore instance that holds all the required metadata/functionalities that are required during parsing a text.

Position encodings provided by the client are irrevelant as RainDocument/Rainlang supports only ASCII characters (parsing will stop at very first encountered non-ASCII character), so any position encodings will result in the same LSP provided Position value which is 1 for each char.

<b>Signature:</b>

```typescript
class RainLanguageServices 
```

## Example


```javascript
// create new MetaStore instance
let metaStore = new MetaStore();

// crate new instance
let langServices = new RainLanguageServices(metaStore);

let textDocument = {
  text: "some .rain text",
  uri:  "file:///name.rain",
  version: 0,
  languageId: "rainlang"
};

// creat new RainDocument
let rainDocument = langServices.newRainDocument(textdocument);

// get LSP Diagnostics
let diagnosticsRelatedInformation = true;
let diagnostics = langServices.doValidate(textDocument, diagnosticsRelatedInformation);

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [metaStore](./rainlanguageservices.md#metaStore-property) | [MetaStore](./metastore.md) | The meta Store associated with this RainLanguageServices instance |

## Methods

|  Method | Description |
|  --- | --- |
|  [doComplete(text\_document, position, documentation\_format)](./rainlanguageservices.md#doComplete-method-1) | Provides completion items at the given position |
|  [doCompleteRainDocument(rain\_document, position, documentation\_format)](./rainlanguageservices.md#doCompleteRainDocument-method-1) | Provides completion items at the given position |
|  [doHover(text\_document, position, content\_format)](./rainlanguageservices.md#doHover-method-1) | Provides hover for a fragment at the given position |
|  [doHoverRainDocument(rain\_document, position, content\_format)](./rainlanguageservices.md#doHoverRainDocument-method-1) | Provides hover for a RainDocument fragment at the given position |
|  [doValidate(text\_document, related\_information)](./rainlanguageservices.md#doValidate-method-1) | Validates the document with remote meta search disabled when parsing and reports LSP diagnostics |
|  [doValidateAsync(text\_document)](./rainlanguageservices.md#doValidateAsync-method-1) | Validates the document with remote meta search enabled when parsing and reports LSP diagnostics |
|  [doValidateRainDocument(rain\_document, related\_information)](./rainlanguageservices.md#doValidateRainDocument-method-1) | Reports LSP diagnostics from RainDocument's all problems |
|  [free()](./rainlanguageservices.md#free-method-1) |  |
|  [newRainDocument(text\_document)](./rainlanguageservices.md#newRainDocument-method-1) | Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem |
|  [newRainDocumentAsync(text\_document)](./rainlanguageservices.md#newRainDocumentAsync-method-1) | Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem |
|  [rainDocumentSemanticTokens(rain\_document, semantic\_token\_types\_index, semantic\_token\_modifiers\_len)](./rainlanguageservices.md#rainDocumentSemanticTokens-method-1) | Provides semantic tokens for RainDocument's elided fragments |
|  [semanticTokens(text\_document, semantic\_token\_types\_index, semantic\_token\_modifiers\_len)](./rainlanguageservices.md#semanticTokens-method-1) | Provides semantic tokens for elided fragments |

## Property Details

<a id="metaStore-property"></a>

### metaStore

The meta Store associated with this RainLanguageServices instance

<b>Signature:</b>

```typescript
readonly metaStore: MetaStore;
```

## Method Details

<a id="doComplete-method-1"></a>

### doComplete(text\_document, position, documentation\_format)

Provides completion items at the given position

<b>Signature:</b>

```typescript
doComplete(
        text_document: TextDocumentItem,
        position: Position,
        documentation_format?: MarkupKind,
    ): CompletionItem[] | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |
|  position | `Position` |  |
|  documentation\_format | `MarkupKind` |  |

<b>Returns:</b>

`CompletionItem[] | null`

{<!-- -->(CompletionItem)\[\] \| undefined<!-- -->}

<a id="doCompleteRainDocument-method-1"></a>

### doCompleteRainDocument(rain\_document, position, documentation\_format)

Provides completion items at the given position

<b>Signature:</b>

```typescript
doCompleteRainDocument(
        rain_document: RainDocument,
        position: Position,
        documentation_format?: MarkupKind,
    ): CompletionItem[] | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rain\_document | [RainDocument](./raindocument.md) |  |
|  position | `Position` |  |
|  documentation\_format | `MarkupKind` |  |

<b>Returns:</b>

`CompletionItem[] | null`

{<!-- -->(CompletionItem)\[\] \| undefined<!-- -->}

<a id="doHover-method-1"></a>

### doHover(text\_document, position, content\_format)

Provides hover for a fragment at the given position

<b>Signature:</b>

```typescript
doHover(
        text_document: TextDocumentItem,
        position: Position,
        content_format?: MarkupKind,
    ): Hover | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |
|  position | `Position` |  |
|  content\_format | `MarkupKind` |  |

<b>Returns:</b>

`Hover | null`

{<!-- -->Hover \| undefined<!-- -->}

<a id="doHoverRainDocument-method-1"></a>

### doHoverRainDocument(rain\_document, position, content\_format)

Provides hover for a RainDocument fragment at the given position

<b>Signature:</b>

```typescript
doHoverRainDocument(
        rain_document: RainDocument,
        position: Position,
        content_format?: MarkupKind,
    ): Hover | null;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rain\_document | [RainDocument](./raindocument.md) |  |
|  position | `Position` |  |
|  content\_format | `MarkupKind` |  |

<b>Returns:</b>

`Hover | null`

{<!-- -->Hover \| undefined<!-- -->}

<a id="doValidate-method-1"></a>

### doValidate(text\_document, related\_information)

Validates the document with remote meta search disabled when parsing and reports LSP diagnostics

<b>Signature:</b>

```typescript
doValidate(text_document: TextDocumentItem, related_information: boolean): Diagnostic[];
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |
|  related\_information | `boolean` |  |

<b>Returns:</b>

`Diagnostic[]`

{<!-- -->(Diagnostic)\[\]<!-- -->}

<a id="doValidateAsync-method-1"></a>

### doValidateAsync(text\_document)

Validates the document with remote meta search enabled when parsing and reports LSP diagnostics

<b>Signature:</b>

```typescript
doValidateAsync(text_document: TextDocumentItem): Promise<Diagnostic[]>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |

<b>Returns:</b>

`Promise<Diagnostic[]>`

{<!-- -->Promise<any>}

<a id="doValidateRainDocument-method-1"></a>

### doValidateRainDocument(rain\_document, related\_information)

Reports LSP diagnostics from RainDocument's all problems

<b>Signature:</b>

```typescript
doValidateRainDocument(rain_document: RainDocument, related_information: boolean): Diagnostic[];
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rain\_document | [RainDocument](./raindocument.md) |  |
|  related\_information | `boolean` |  |

<b>Returns:</b>

`Diagnostic[]`

{<!-- -->(Diagnostic)\[\]<!-- -->}

<a id="free-method-1"></a>

### free()

<b>Signature:</b>

```typescript
free(): void;
```
<b>Returns:</b>

`void`

<a id="newRainDocument-method-1"></a>

### newRainDocument(text\_document)

Instantiates a RainDocument with remote meta search disabled when parsing from the given TextDocumentItem

<b>Signature:</b>

```typescript
newRainDocument(text_document: TextDocumentItem): RainDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |

<b>Returns:</b>

`RainDocument`

{<!-- -->RainDocument<!-- -->}

<a id="newRainDocumentAsync-method-1"></a>

### newRainDocumentAsync(text\_document)

Instantiates a RainDocument with remote meta search enabled when parsing from the given TextDocumentItem

<b>Signature:</b>

```typescript
newRainDocumentAsync(text_document: TextDocumentItem): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |

<b>Returns:</b>

`Promise<RainDocument>`

{<!-- -->Promise<RainDocument>}

<a id="rainDocumentSemanticTokens-method-1"></a>

### rainDocumentSemanticTokens(rain\_document, semantic\_token\_types\_index, semantic\_token\_modifiers\_len)

Provides semantic tokens for RainDocument's elided fragments

<b>Signature:</b>

```typescript
rainDocumentSemanticTokens(
        rain_document: RainDocument,
        semantic_token_types_index: number,
        semantic_token_modifiers_len: number,
    ): SemanticTokensPartialResult;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rain\_document | [RainDocument](./raindocument.md) |  |
|  semantic\_token\_types\_index | `number` |  |
|  semantic\_token\_modifiers\_len | `number` |  |

<b>Returns:</b>

`SemanticTokensPartialResult`

{<!-- -->SemanticTokensPartialResult<!-- -->}

<a id="semanticTokens-method-1"></a>

### semanticTokens(text\_document, semantic\_token\_types\_index, semantic\_token\_modifiers\_len)

Provides semantic tokens for elided fragments

<b>Signature:</b>

```typescript
semanticTokens(
        text_document: TextDocumentItem,
        semantic_token_types_index: number,
        semantic_token_modifiers_len: number,
    ): SemanticTokensPartialResult;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text\_document | `TextDocumentItem` |  |
|  semantic\_token\_types\_index | `number` |  |
|  semantic\_token\_modifiers\_len | `number` |  |

<b>Returns:</b>

`SemanticTokensPartialResult`

{<!-- -->SemanticTokensPartialResult<!-- -->}

