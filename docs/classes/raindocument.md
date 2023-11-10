[Home](../index.md) &gt; [RainDocument](./raindocument.md)

# Class RainDocument

RainDocument aka dotrain is a class object that parses a text to provides data and functionalities in order to be used later on to provide Rain Language Services or in RainDocument compiler to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work.

<b>Signature:</b>

```typescript
class RainDocument 
```

## Example


```typescript
// to import
import { RainDocument } from 'rainlang';

// to create a new instance of the RainDocument object which parses right after instantiation
const myRainDocument = await RainDocument.create(text)

// to get the problems
const problems = myRainDocument.getAllProblems()

// to update the text
await myRainDocument.updateText(newText)

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [authoringMeta](./raindocument.md#authoringMeta-property) | `Meta.Authoring[]` |  |
|  [authoringMetaPath](./raindocument.md#authoringMetaPath-property) | `string` |  |
|  [bindings](./raindocument.md#bindings-property) | `AST.Binding[]` |  |
|  [bytecode](./raindocument.md#bytecode-property) | `string` |  |
|  [comments](./raindocument.md#comments-property) | `AST.Comment[]` |  |
|  [constants](./raindocument.md#constants-property) | `Record<string, string>` |  |
|  [imports](./raindocument.md#imports-property) | `AST.Import[]` |  |
|  [metaStore](./raindocument.md#metaStore-property) | `Meta.Store` |  |
|  [namespace](./raindocument.md#namespace-property) | [AST.Namespace](../namespaces/ast/types/namespace.md) |  |
|  [problems](./raindocument.md#problems-property) | `AST.Problem[]` |  |
|  [runtimeError](./raindocument.md#runtimeError-property) | `Error \| undefined` |  |
|  [textDocument](./raindocument.md#textDocument-property) | `TextDocument` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(textDocument, metaStore)](./raindocument.md#create-method-static-1) | Creates a new RainDocument object instance with a TextDocument |
|  [create(text, metaStore, uri, version)](./raindocument.md#create-method-static-2) | Creates a new RainDocument object instance from a text string |

## Methods

|  Method | Description |
|  --- | --- |
|  [getAllProblems()](./raindocument.md#getAllProblems-method-1) | Get all problems of this RainDocument instance |
|  [getBindingsProblems()](./raindocument.md#getBindingsProblems-method-1) | Get the expression problems of this RainDocument instance |
|  [getText()](./raindocument.md#getText-method-1) | Get the current text of this RainDocument instance |
|  [parse()](./raindocument.md#parse-method-1) | Parses this instance of RainDocument |
|  [updateText(newText)](./raindocument.md#updateText-method-1) | Updates the TextDocument of this RainDocument instance with new text |
|  [updateText(newTextDocument)](./raindocument.md#updateText-method-2) | Updates the TextDocument of this RainDocument instance |

## Property Details

<a id="authoringMeta-property"></a>

### authoringMeta

<b>Signature:</b>

```typescript
authoringMeta: Meta.Authoring[];
```

<a id="authoringMetaPath-property"></a>

### authoringMetaPath

<b>Signature:</b>

```typescript
authoringMetaPath: string;
```

<a id="bindings-property"></a>

### bindings

<b>Signature:</b>

```typescript
bindings: AST.Binding[];
```

<a id="bytecode-property"></a>

### bytecode

<b>Signature:</b>

```typescript
bytecode: string;
```

<a id="comments-property"></a>

### comments

<b>Signature:</b>

```typescript
comments: AST.Comment[];
```

<a id="constants-property"></a>

### constants

<b>Signature:</b>

```typescript
readonly constants: Record<string, string>;
```

<a id="imports-property"></a>

### imports

<b>Signature:</b>

```typescript
imports: AST.Import[];
```

<a id="metaStore-property"></a>

### metaStore

<b>Signature:</b>

```typescript
metaStore: Meta.Store;
```

<a id="namespace-property"></a>

### namespace

<b>Signature:</b>

```typescript
namespace: AST.Namespace;
```

<a id="problems-property"></a>

### problems

<b>Signature:</b>

```typescript
problems: AST.Problem[];
```

<a id="runtimeError-property"></a>

### runtimeError

<b>Signature:</b>

```typescript
runtimeError: Error | undefined;
```

<a id="textDocument-property"></a>

### textDocument

<b>Signature:</b>

```typescript
textDocument: TextDocument;
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(textDocument, metaStore)

Creates a new RainDocument object instance with a TextDocument

<b>Signature:</b>

```typescript
static create(textDocument: TextDocument, metaStore?: Meta.Store): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` | The text document |
|  metaStore | `Meta.Store` | (optional) The initial Meta.Store object |

<b>Returns:</b>

`Promise<RainDocument>`

A new RainDocument instance

<a id="create-method-static-2"></a>

### create(text, metaStore, uri, version)

Creates a new RainDocument object instance from a text string

<b>Signature:</b>

```typescript
static create(text: string, metaStore?: Meta.Store, uri?: string, version?: number): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The text string |
|  metaStore | `Meta.Store` | (optional) The initial Meta.Store object |
|  uri | `string` | (optional) The URI of the text, URI is the unique identifier of a TextDocument |
|  version | `number` | (optional) The version of the text |

<b>Returns:</b>

`Promise<RainDocument>`

A new RainDocument instance

## Method Details

<a id="getAllProblems-method-1"></a>

### getAllProblems()

Get all problems of this RainDocument instance

<b>Signature:</b>

```typescript
getAllProblems(): AST.Problem[];
```
<b>Returns:</b>

`AST.Problem[]`

<a id="getBindingsProblems-method-1"></a>

### getBindingsProblems()

Get the expression problems of this RainDocument instance

<b>Signature:</b>

```typescript
getBindingsProblems(): AST.Problem[];
```
<b>Returns:</b>

`AST.Problem[]`

<a id="getText-method-1"></a>

### getText()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getText(): string;
```
<b>Returns:</b>

`string`

<a id="parse-method-1"></a>

### parse()

Parses this instance of RainDocument

<b>Signature:</b>

```typescript
parse(): Promise<void>;
```
<b>Returns:</b>

`Promise<void>`

<a id="updateText-method-1"></a>

### updateText(newText)

Updates the TextDocument of this RainDocument instance with new text

<b>Signature:</b>

```typescript
updateText(newText: string): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newText | `string` | The new text |

<b>Returns:</b>

`Promise<void>`

<a id="updateText-method-2"></a>

### updateText(newTextDocument)

Updates the TextDocument of this RainDocument instance

<b>Signature:</b>

```typescript
updateText(newTextDocument: TextDocument): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newTextDocument | `TextDocument` | The new TextDocument |

<b>Returns:</b>

`Promise<void>`

