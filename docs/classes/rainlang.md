[Home](../index.md) &gt; [Rainlang](./rainlang.md)

# Class Rainlang

> Warning: This API is now obsolete.
> 
> Rainlang class is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an op meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler
> 

<b>Signature:</b>

```typescript
class Rainlang 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ast](./rainlang.md#ast-property) | [RainlangAST](../types/rainlangast.md) |  |
|  [binding](./rainlang.md#binding-property) | [Binding](../types/binding.md) |  |
|  [comments](./rainlang.md#comments-property) | `Comment[]` |  |
|  [constants](./rainlang.md#constants-property) | `Record<string, string>` |  |
|  [namespaces](./rainlang.md#namespaces-property) | [Namespace](../types/namespace.md) |  |
|  [opmeta](./rainlang.md#opmeta-property) | `OpMeta[]` |  |
|  [problems](./rainlang.md#problems-property) | `Problem[]` |  |
|  [text](./rainlang.md#text-property) | `string` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(text, opmetaHash, metaStore)](./rainlang.md#create-method-static-1) | Creates a new Rainlang instance with a opmeta hash |

## Methods

|  Method | Description |
|  --- | --- |
|  [getRuntimeError()](./rainlang.md#getRuntimeError-method-1) | Get the current runtime error of this Rainlang instance |
|  [parse()](./rainlang.md#parse-method-1) | Parses this instance of Rainlang |
|  [updateText(newText)](./rainlang.md#updateText-method-1) | Updates the text of this Rainlang instance and parse it right after that |

## Property Details

<a id="ast-property"></a>

### ast

<b>Signature:</b>

```typescript
ast: RainlangAST;
```

<a id="binding-property"></a>

### binding

<b>Signature:</b>

```typescript
binding?: Binding;
```

<a id="comments-property"></a>

### comments

<b>Signature:</b>

```typescript
comments: Comment[];
```

<a id="constants-property"></a>

### constants

<b>Signature:</b>

```typescript
readonly constants: Record<string, string>;
```

<a id="namespaces-property"></a>

### namespaces

<b>Signature:</b>

```typescript
namespaces: Namespace;
```

<a id="opmeta-property"></a>

### opmeta

<b>Signature:</b>

```typescript
opmeta: OpMeta[];
```

<a id="problems-property"></a>

### problems

<b>Signature:</b>

```typescript
problems: Problem[];
```

<a id="text-property"></a>

### text

<b>Signature:</b>

```typescript
text: string;
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

<a id="getRuntimeError-method-1"></a>

### getRuntimeError()

Get the current runtime error of this Rainlang instance

<b>Signature:</b>

```typescript
getRuntimeError(): Error | undefined;
```
<b>Returns:</b>

`Error | undefined`

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

