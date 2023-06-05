[Home](../index.md) &gt; [RainDocument](./raindocument.md)

# Class RainDocument

RainDocument is a class object that provides data and functionalities in order to be used later on to provide Rain Language Services or in Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes). It uses Rain parser under the hood which does all the heavy work.

<b>Signature:</b>

```typescript
class RainDocument 
```

## Example


```typescript
// to import
import { Raindocument } from 'rainlang';

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
|  [create(textDocument, metaStore)](./raindocument.md#create-method-static-1) | Creates a new RainDocument object instance |

## Methods

|  Method | Description |
|  --- | --- |
|  [getAllProblems()](./raindocument.md#getAllProblems-method-1) | Get all problems of this RainDocument instance |
|  [getComments()](./raindocument.md#getComments-method-1) | Get the current comments inside of the text of this RainDocument instance |
|  [getConstants()](./raindocument.md#getConstants-method-1) | Get constant k/v pairs of this RainDocument instance |
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
|  [getRuntimeError()](./raindocument.md#getRuntimeError-method-1) | Get the current runtime error of this RainDocument instance |
|  [getTextDocument()](./raindocument.md#getTextDocument-method-1) | Get the current text of this RainDocument instance |
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

Creates a new RainDocument object instance

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

## Method Details

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

<a id="getConstants-method-1"></a>

### getConstants()

Get constant k/v pairs of this RainDocument instance

<b>Signature:</b>

```typescript
getConstants(): Record<string, string>;
```
<b>Returns:</b>

`Record<string, string>`

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

<a id="getRuntimeError-method-1"></a>

### getRuntimeError()

Get the current runtime error of this RainDocument instance

<b>Signature:</b>

```typescript
getRuntimeError(): Error | undefined;
```
<b>Returns:</b>

`Error | undefined`

<a id="getTextDocument-method-1"></a>

### getTextDocument()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getTextDocument(): TextDocument;
```
<b>Returns:</b>

`TextDocument`

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

