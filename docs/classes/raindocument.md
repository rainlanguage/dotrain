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

// to get the parse tree after instantiation
const parseTree = myRainDocument.getParseTree()

// to update the text
await myRainDocument.update(newText)

```

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(textDocument, metaStore)](./raindocument.md#create-method-static-1) | Creates a new instance of RainDocument |

## Methods

|  Method | Description |
|  --- | --- |
|  [getComments()](./raindocument.md#getComments-method-1) | Get the current comments inside of the text of this RainDocument instance |
|  [getConstants()](./raindocument.md#getConstants-method-1) | Get constants k/v pairs of this RainDocument instance |
|  [getContextAliases()](./raindocument.md#getContextAliases-method-1) | Get the context aliases of specified meta hashes in this RainDocument instance |
|  [getExpressionConfig(item)](./raindocument.md#getExpressionConfig-method-1) | Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance. This method should not be used directly, insteda the RainCompiler (rlc) should be used. |
|  [getLHSAliases()](./raindocument.md#getLHSAliases-method-1) | Get the parsed exp aliases of this RainDocument instance |
|  [getMetaHashes()](./raindocument.md#getMetaHashes-method-1) | Get the specified meta hashes of this RainDocument instance |
|  [getMetaStore()](./raindocument.md#getMetaStore-method-1) | Get the MetaStore object instance of this RainDocument instance |
|  [getOpMeta()](./raindocument.md#getOpMeta-method-1) | Get the current op meta of this RainDocument instance |
|  [getOpMetaBytes()](./raindocument.md#getOpMetaBytes-method-1) | Get the current raw op meta of this RainDocument instance in hex string |
|  [getParseTree()](./raindocument.md#getParseTree-method-1) | Get the current parse tree of this RainDocument instance |
|  [getProblems()](./raindocument.md#getProblems-method-1) | Get the current problems of this RainDocument instance |
|  [getRuntimeError()](./raindocument.md#getRuntimeError-method-1) | Get the current runtime error of this RainDocument instance |
|  [getTextDocument()](./raindocument.md#getTextDocument-method-1) | Get the current text of this RainDocument instance |
|  [update(newTextDocument)](./raindocument.md#update-method-1) | Method to update the RainDocument with new text or opmeta and get the parse results |

## Static Method Details

<a id="create-method-static-1"></a>

### create(textDocument, metaStore)

Creates a new instance of RainDocument

<b>Signature:</b>

```typescript
static create(textDocument: TextDocument, metaStore?: MetaStore): Promise<RainDocument>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  textDocument | `TextDocument` | The text document |
|  metaStore | [MetaStore](./metastore.md) | The MetaStore object |

<b>Returns:</b>

`Promise<RainDocument>`

A new instance of RainDocument

## Method Details

<a id="getComments-method-1"></a>

### getComments()

Get the current comments inside of the text of this RainDocument instance

<b>Signature:</b>

```typescript
getComments(): RDComment[];
```
<b>Returns:</b>

`RDComment[]`

<a id="getConstants-method-1"></a>

### getConstants()

Get constants k/v pairs of this RainDocument instance

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

<a id="getExpressionConfig-method-1"></a>

### getExpressionConfig(item)

Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance. This method should not be used directly, insteda the RainCompiler (rlc) should be used.

<b>Signature:</b>

```typescript
getExpressionConfig(item?: RDNode | RDNode[][] | RDParseTree): ExpressionConfig | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  item | `RDNode \| RDNode[][] \| RDParseTree` | Optional item to get the ExpressionConfig for |

<b>Returns:</b>

`ExpressionConfig | undefined`

<a id="getLHSAliases-method-1"></a>

### getLHSAliases()

Get the parsed exp aliases of this RainDocument instance

<b>Signature:</b>

```typescript
getLHSAliases(): RDAliasNode[][];
```
<b>Returns:</b>

`RDAliasNode[][]`

<a id="getMetaHashes-method-1"></a>

### getMetaHashes()

Get the specified meta hashes of this RainDocument instance

<b>Signature:</b>

```typescript
getMetaHashes(): RDMetaHash[];
```
<b>Returns:</b>

`RDMetaHash[]`

<a id="getMetaStore-method-1"></a>

### getMetaStore()

Get the MetaStore object instance of this RainDocument instance

<b>Signature:</b>

```typescript
getMetaStore(): MetaStore;
```
<b>Returns:</b>

`MetaStore`

<a id="getOpMeta-method-1"></a>

### getOpMeta()

Get the current op meta of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMeta(): OpMeta[];
```
<b>Returns:</b>

`OpMeta[]`

<a id="getOpMetaBytes-method-1"></a>

### getOpMetaBytes()

Get the current raw op meta of this RainDocument instance in hex string

<b>Signature:</b>

```typescript
getOpMetaBytes(): string;
```
<b>Returns:</b>

`string`

<a id="getParseTree-method-1"></a>

### getParseTree()

Get the current parse tree of this RainDocument instance

<b>Signature:</b>

```typescript
getParseTree(): RDParseTree;
```
<b>Returns:</b>

`RDParseTree`

<a id="getProblems-method-1"></a>

### getProblems()

Get the current problems of this RainDocument instance

<b>Signature:</b>

```typescript
getProblems(): RDProblem[];
```
<b>Returns:</b>

`RDProblem[]`

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

<a id="update-method-1"></a>

### update(newTextDocument)

Method to update the RainDocument with new text or opmeta and get the parse results

<b>Signature:</b>

```typescript
update(newTextDocument?: TextDocument): Promise<void>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newTextDocument | `TextDocument` | Raw text to parse |

<b>Returns:</b>

`Promise<void>`

