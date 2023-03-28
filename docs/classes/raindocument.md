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
const myRainDocument = new RainDocument(text, opmeta)

// to get the parse results after instantiation
const results = myRainDocument.getResult()

// to get the parse results with new text or opmeta
const newResult = myRainDocument.update(newText, newOpmeta)

```

## Methods

|  Method | Description |
|  --- | --- |
|  [getComments()](./raindocument.md#getComments-method-1) | Get the current comments inside of the text of this RainDocument instance |
|  [getCurrentLHSAliases()](./raindocument.md#getCurrentLHSAliases-method-1) | Get the current sub-exp aliases of this RainParser instance |
|  [getExpressionConfig(item)](./raindocument.md#getExpressionConfig-method-1) | Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance. This method should not be used directly, insteda the RainCompiler (rlc) should be used. |
|  [getLHSAliases()](./raindocument.md#getLHSAliases-method-1) | Get the parsed exp aliases of this RainParser instance |
|  [getOpMeta()](./raindocument.md#getOpMeta-method-1) | Get the current op meta of this RainDocument instance |
|  [getOpMetaError()](./raindocument.md#getOpMetaError-method-1) | Get the current runtime error of this RainDocument instance |
|  [getParseTree()](./raindocument.md#getParseTree-method-1) | Get the current parse tree of this RainDocument instance |
|  [getProblems()](./raindocument.md#getProblems-method-1) | Get the current problems of this RainDocument instance |
|  [getRawOpMeta()](./raindocument.md#getRawOpMeta-method-1) | Get the current raw op meta of this RainDocument instance in hex string |
|  [getResult()](./raindocument.md#getResult-method-1) | Get the current parse result of this RainDocument instance which consists of parse tree, problems, comments and expression aliases |
|  [getRuntimeError()](./raindocument.md#getRuntimeError-method-1) | Get the current runtime error of this RainDocument instance |
|  [getTextDocument()](./raindocument.md#getTextDocument-method-1) | Get the current text of this RainDocument instance |
|  [update(newTextDocument, newOpMeta)](./raindocument.md#update-method-1) | Method to update the RainDocument with new text or opmeta and get the parse results |

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

<a id="getCurrentLHSAliases-method-1"></a>

### getCurrentLHSAliases()

Get the current sub-exp aliases of this RainParser instance

<b>Signature:</b>

```typescript
getCurrentLHSAliases(): RDAliasNode[];
```
<b>Returns:</b>

`RDAliasNode[]`

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

Get the parsed exp aliases of this RainParser instance

<b>Signature:</b>

```typescript
getLHSAliases(): RDAliasNode[][];
```
<b>Returns:</b>

`RDAliasNode[][]`

<a id="getOpMeta-method-1"></a>

### getOpMeta()

Get the current op meta of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMeta(): OpMeta[];
```
<b>Returns:</b>

`OpMeta[]`

<a id="getOpMetaError-method-1"></a>

### getOpMetaError()

Get the current runtime error of this RainDocument instance

<b>Signature:</b>

```typescript
getOpMetaError(): Error | undefined;
```
<b>Returns:</b>

`Error | undefined`

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

<a id="getRawOpMeta-method-1"></a>

### getRawOpMeta()

Get the current raw op meta of this RainDocument instance in hex string

<b>Signature:</b>

```typescript
getRawOpMeta(): string;
```
<b>Returns:</b>

`string`

<a id="getResult-method-1"></a>

### getResult()

Get the current parse result of this RainDocument instance which consists of parse tree, problems, comments and expression aliases

<b>Signature:</b>

```typescript
getResult(): RainDocumentResult;
```
<b>Returns:</b>

`RainDocumentResult`

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

### update(newTextDocument, newOpMeta)

Method to update the RainDocument with new text or opmeta and get the parse results

<b>Signature:</b>

```typescript
update(newTextDocument?: TextDocument, newOpMeta?: BytesLike): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newTextDocument | `TextDocument` | (optional) Raw text to parse |
|  newOpMeta | `BytesLike` | (optional) Ops meta as bytes ie hex string or Uint8Array |

<b>Returns:</b>

`void`

