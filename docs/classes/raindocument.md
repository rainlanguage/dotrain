[Home](../index.md) &gt; [RainDocument](./raindocument.md)

# Class RainDocument

RainDocument is a class object that parses a text to provides data and functionalities in order to be used later on to provide Rain Language Services or in RainDocument compiler to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work.

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
|  [constants](./raindocument.md#constants-property) | `Record<string, string>` |  |
|  [expressions](./raindocument.md#expressions-property) | `NamedExpression[]` |  |
|  [metaStore](./raindocument.md#metaStore-property) | [MetaStore](./metastore.md) |  |
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
|  [fillOut(text, position)](./raindocument.md#fillOut-method-1) | Fills outside of a position with whitespaces |
|  [getAllProblems()](./raindocument.md#getAllProblems-method-1) | Get all problems of this RainDocument instance |
|  [getComments()](./raindocument.md#getComments-method-1) | Get the current comments inside of the text of this RainDocument instance |
|  [getContextAliases()](./raindocument.md#getContextAliases-method-1) | Get the context aliases of specified meta hashes in this RainDocument instance |
|  [getDependencies()](./raindocument.md#getDependencies-method-1) | Get the expression dependencies of this RainDocument instance |
|  [getDependencyProblems()](./raindocument.md#getDependencyProblems-method-1) | Get the dependency problems of this RainDocument instance |
|  [getExpProblems()](./raindocument.md#getExpProblems-method-1) | Get the expression problems of this RainDocument instance |
|  [getImports()](./raindocument.md#getImports-method-1) | Get the imports of this RainDocument instance |
|  [getOpMeta()](./raindocument.md#getOpMeta-method-1) | Get the current text of this RainDocument instance |
|  [getOpMetaBytes()](./raindocument.md#getOpMetaBytes-method-1) | Get the current text of this RainDocument instance |
|  [getOpMetaImportIndex()](./raindocument.md#getOpMetaImportIndex-method-1) | Get the current text of this RainDocument instance |
|  [getOpMetaLength()](./raindocument.md#getOpMetaLength-method-1) | Get the current text of this RainDocument instance |
|  [getOpMetaWithCtxAliases()](./raindocument.md#getOpMetaWithCtxAliases-method-1) | Get the current text of this RainDocument instance |
|  [getProblems()](./raindocument.md#getProblems-method-1) | Get the current problems of this RainDocument instance |
|  [getText()](./raindocument.md#getText-method-1) | Get the current text of this RainDocument instance |
|  [getTopProblems()](./raindocument.md#getTopProblems-method-1) | Get top problems of this RainDocument instance |
|  [parse()](./raindocument.md#parse-method-1) | Parses this instance of RainDocument |
|  [updateText(newText)](./raindocument.md#updateText-method-1) | Updates the TextDocument of this RainDocument instance with new text |
|  [updateText(newTextDocument)](./raindocument.md#updateText-method-2) | Updates the TextDocument of this RainDocument instance |

## Property Details

<a id="constants-property"></a>

### constants

<b>Signature:</b>

```typescript
readonly constants: Record<string, string>;
```

<a id="expressions-property"></a>

### expressions

<b>Signature:</b>

```typescript
expressions: NamedExpression[];
```

<a id="metaStore-property"></a>

### metaStore

<b>Signature:</b>

```typescript
metaStore: MetaStore;
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
static create(textDocument: TextDocument, metaStore?: MetaStore): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` | The text document |
|  metaStore | [MetaStore](./metastore.md) | (optional) The initial MetaStore object |

<b>Returns:</b>

`Promise<RainDocument>`

A new RainDocument instance

<a id="create-method-static-2"></a>

### create(text, metaStore, uri, version)

Creates a new RainDocument object instance from a text string

<b>Signature:</b>

```typescript
static create(text: TextDocument, metaStore?: MetaStore, uri?: string, version?: number): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `TextDocument` | The text string |
|  metaStore | [MetaStore](./metastore.md) | (optional) The initial MetaStore object |
|  uri | `string` | (optional) The URI of the text, URI is the unique identifier of a TextDocument |
|  version | `number` | (optional) The version of the text |

<b>Returns:</b>

`Promise<RainDocument>`

A new RainDocument instance

## Method Details

<a id="fillOut-method-1"></a>

### fillOut(text, position)

Fills outside of a position with whitespaces

<b>Signature:</b>

```typescript
fillOut(text: string, position: PositionOffset): string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  position | [PositionOffset](../types/positionoffset.md) |  |

<b>Returns:</b>

`string`

<a id="getAllProblems-method-1"></a>

### getAllProblems()

Get all problems of this RainDocument instance

<b>Signature:</b>

```typescript
getAllProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

<a id="getComments-method-1"></a>

### getComments()

Get the current comments inside of the text of this RainDocument instance

<b>Signature:</b>

```typescript
getComments(): Comment[];
```
<b>Returns:</b>

`Comment[]`

<a id="getContextAliases-method-1"></a>

### getContextAliases()

Get the context aliases of specified meta hashes in this RainDocument instance

<b>Signature:</b>

```typescript
getContextAliases(): ContextAlias[];
```
<b>Returns:</b>

`ContextAlias[]`

<a id="getDependencies-method-1"></a>

### getDependencies()

Get the expression dependencies of this RainDocument instance

<b>Signature:</b>

```typescript
getDependencies(): [string, string][];
```
<b>Returns:</b>

`[string, string][]`

<a id="getDependencyProblems-method-1"></a>

### getDependencyProblems()

Get the dependency problems of this RainDocument instance

<b>Signature:</b>

```typescript
getDependencyProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

<a id="getExpProblems-method-1"></a>

### getExpProblems()

Get the expression problems of this RainDocument instance

<b>Signature:</b>

```typescript
getExpProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

<a id="getImports-method-1"></a>

### getImports()

Get the imports of this RainDocument instance

<b>Signature:</b>

```typescript
getImports(): Import[];
```
<b>Returns:</b>

`Import[]`

<a id="getOpMeta-method-1"></a>

### getOpMeta()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMeta(): OpMeta[];
```
<b>Returns:</b>

`OpMeta[]`

<a id="getOpMetaBytes-method-1"></a>

### getOpMetaBytes()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMetaBytes(): string;
```
<b>Returns:</b>

`string`

<a id="getOpMetaImportIndex-method-1"></a>

### getOpMetaImportIndex()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMetaImportIndex(): number;
```
<b>Returns:</b>

`number`

<a id="getOpMetaLength-method-1"></a>

### getOpMetaLength()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMetaLength(): number;
```
<b>Returns:</b>

`number`

<a id="getOpMetaWithCtxAliases-method-1"></a>

### getOpMetaWithCtxAliases()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMetaWithCtxAliases(): OpMeta[];
```
<b>Returns:</b>

`OpMeta[]`

<a id="getProblems-method-1"></a>

### getProblems()

Get the current problems of this RainDocument instance

<b>Signature:</b>

```typescript
getProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

<a id="getText-method-1"></a>

### getText()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getText(): string;
```
<b>Returns:</b>

`string`

<a id="getTopProblems-method-1"></a>

### getTopProblems()

Get top problems of this RainDocument instance

<b>Signature:</b>

```typescript
getTopProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

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

