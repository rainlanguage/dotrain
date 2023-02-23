[Home](../index.md) &gt; [RainDocument](./raindocument.md)

# Class RainDocument

RainDocument is a wrapper for RainParser that provides the main functionalities and data types in order to be used later on to provide Rain Language Services or in Rain Language Compiler (rlc) to get the ExpressionConfig (deployable bytes)

\*

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
|  [getExpressionConfig(item)](./raindocument.md#getExpressionConfig-method-1) | Get the ExpressionConfig (i.e. deployable bytes) of this RainDocument instance. This method should not be used directly, insteda the RainCompiler (rlc) should be used. |
|  [getOpMeta()](./raindocument.md#getOpMeta-method-1) | Get the current raw op meta of this RainDocument instance in hex string |
|  [getParseTree()](./raindocument.md#getParseTree-method-1) | Get the current parse tree of this RainDocument instance |
|  [getProblems()](./raindocument.md#getProblems-method-1) | Get the current problems of this RainDocument instance |
|  [getResult()](./raindocument.md#getResult-method-1) | Get the current parse result of this RainDocument instance which consists of parse tree, problems, comments and expression aliases |
|  [getRuntimeError()](./raindocument.md#getRuntimeError-method-1) | Get the current runtime error of this RainDocument instance |
|  [getText()](./raindocument.md#getText-method-1) | Get the current text of this RainDocument instance |
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

<a id="getOpMeta-method-1"></a>

### getOpMeta()

Get the current raw op meta of this RainDocument instance in hex string

<b>Signature:</b>

```typescript
getOpMeta(): string;
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

<a id="getText-method-1"></a>

### getText()

Get the current text of this RainDocument instance

<b>Signature:</b>

```typescript
getText(): string;
```
<b>Returns:</b>

`string`

<a id="update-method-1"></a>

### update(newTextDocument, newOpMeta)

Method to update the RainDocument with new text or opmeta and get the parse results

<b>Signature:</b>

```typescript
update(newTextDocument?: string, newOpMeta?: Uint8Array | string): RainDocumentResult;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newTextDocument | `string` | (optional) Raw text to parse |
|  newOpMeta | `Uint8Array \| string` | (optional) Ops meta as bytes ie hex string or Uint8Array or json content as string |

<b>Returns:</b>

`RainDocumentResult`

RainDocument results

