[Home](../index.md) &gt; [Rainlang](./rainlang.md)

# Class Rainlang

Rainlang class is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an op meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler

<b>Signature:</b>

```typescript
class Rainlang 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [constants](./rainlang.md#constants-property) | `Record<string, string>` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(text, opmetaHash, metaStore)](./rainlang.md#create-method-static-1) | Creates a new Rainlang instance with a opmeta hash |

## Methods

|  Method | Description |
|  --- | --- |
|  [getAst()](./rainlang.md#getAst-method-1) | Get AST of this Rainlang instance |
|  [getComments()](./rainlang.md#getComments-method-1) | Get the current comments inside of the text of this Rainlang instance |
|  [getOpMeta()](./rainlang.md#getOpMeta-method-1) | Get the current text of this Rainlang instance |
|  [getProblems()](./rainlang.md#getProblems-method-1) | Get the current problems of this Rainlang instance |
|  [getRuntimeError()](./rainlang.md#getRuntimeError-method-1) | Get the current runtime error of this Rainlang instance |
|  [getText()](./rainlang.md#getText-method-1) | Get the current text of this Rainlang instance |
|  [parse()](./rainlang.md#parse-method-1) | Parses this instance of Rainlang |
|  [updateText(newText)](./rainlang.md#updateText-method-1) | Updates the text of this Rainlang instance and parse it right after that |

## Property Details

<a id="constants-property"></a>

### constants

<b>Signature:</b>

```typescript
readonly constants: Record<string, string>;
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(text, opmetaHash, metaStore)

Creates a new Rainlang instance with a opmeta hash

<b>Signature:</b>

```typescript
static create(text: string, opmetaHash: string, metaStore?: MetaStore): Promise<Rainlang>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The text |
|  opmetaHash | `string` | The op meta hash |
|  metaStore | [MetaStore](./metastore.md) | (optional) The MetaStore instance |

<b>Returns:</b>

`Promise<Rainlang>`

## Method Details

<a id="getAst-method-1"></a>

### getAst()

Get AST of this Rainlang instance

<b>Signature:</b>

```typescript
getAst(): RainlangAST;
```
<b>Returns:</b>

`RainlangAST`

<a id="getComments-method-1"></a>

### getComments()

Get the current comments inside of the text of this Rainlang instance

<b>Signature:</b>

```typescript
getComments(): Comment[];
```
<b>Returns:</b>

`Comment[]`

<a id="getOpMeta-method-1"></a>

### getOpMeta()

Get the current text of this Rainlang instance

<b>Signature:</b>

```typescript
getOpMeta(): OpMeta[];
```
<b>Returns:</b>

`OpMeta[]`

<a id="getProblems-method-1"></a>

### getProblems()

Get the current problems of this Rainlang instance

<b>Signature:</b>

```typescript
getProblems(): Problem[];
```
<b>Returns:</b>

`Problem[]`

<a id="getRuntimeError-method-1"></a>

### getRuntimeError()

Get the current runtime error of this Rainlang instance

<b>Signature:</b>

```typescript
getRuntimeError(): Error | undefined;
```
<b>Returns:</b>

`Error | undefined`

<a id="getText-method-1"></a>

### getText()

Get the current text of this Rainlang instance

<b>Signature:</b>

```typescript
getText(): string;
```
<b>Returns:</b>

`string`

<a id="parse-method-1"></a>

### parse()

Parses this instance of Rainlang

<b>Signature:</b>

```typescript
parse(): void;
```
<b>Returns:</b>

`void`

<a id="updateText-method-1"></a>

### updateText(newText)

Updates the text of this Rainlang instance and parse it right after that

<b>Signature:</b>

```typescript
updateText(newText: string): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  newText | `string` | The new text |

<b>Returns:</b>

`void`

