[Home](../index.md) &gt; [Rainlang](./rainlang.md)

# Class Rainlang

Rainlang class is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an authoring meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler

<b>Signature:</b>

```typescript
class Rainlang 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ast](./rainlang.md#ast-property) | [AST.Rainlang](../namespaces/ast/types/rainlang.md) |  |
|  [authoringMeta](./rainlang.md#authoringMeta-property) | `Meta.Authoring[]` |  |
|  [binding](./rainlang.md#binding-property) | [AST.Binding](../namespaces/ast/types/binding.md) |  |
|  [bytecode](./rainlang.md#bytecode-property) | `string` |  |
|  [comments](./rainlang.md#comments-property) | `AST.Comment[]` |  |
|  [constants](./rainlang.md#constants-property) | `Record<string, string>` |  |
|  [namespaces](./rainlang.md#namespaces-property) | [AST.Namespace](../namespaces/ast/types/namespace.md) |  |
|  [problems](./rainlang.md#problems-property) | `AST.Problem[]` |  |
|  [text](./rainlang.md#text-property) | `string` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(text, bytecode, metaStore)](./rainlang.md#create-method-static-1) | Creates a new Rainlang instance with a contract bytecode |
|  [create(text, bytecodeHash, metaStore)](./rainlang.md#create-method-static-2) | Creates a new Rainlang instance with a bytecode meta hash |

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
ast: AST.Rainlang;
```

<a id="authoringMeta-property"></a>

### authoringMeta

<b>Signature:</b>

```typescript
authoringMeta: Meta.Authoring[];
```

<a id="binding-property"></a>

### binding

<b>Signature:</b>

```typescript
binding?: AST.Binding;
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

<a id="namespaces-property"></a>

### namespaces

<b>Signature:</b>

```typescript
namespaces: AST.Namespace;
```

<a id="problems-property"></a>

### problems

<b>Signature:</b>

```typescript
problems: AST.Problem[];
```

<a id="text-property"></a>

### text

<b>Signature:</b>

```typescript
text: string;
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(text, bytecode, metaStore)

Creates a new Rainlang instance with a contract bytecode

<b>Signature:</b>

```typescript
static create(text: string, bytecode: string, metaStore?: Meta.Store): Promise<Rainlang>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The text |
|  bytecode | `string` | The ExpressionDeployerNP deployed bytecode |
|  metaStore | `Meta.Store` | (optional) The Meta.Store instance |

<b>Returns:</b>

`Promise<Rainlang>`

<a id="create-method-static-2"></a>

### create(text, bytecodeHash, metaStore)

Creates a new Rainlang instance with a bytecode meta hash

<b>Signature:</b>

```typescript
static create(text: string, bytecodeHash: string, metaStore?: Meta.Store): Promise<Rainlang>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The text |
|  bytecodeHash | `string` | The bytecode meta hash |
|  metaStore | `Meta.Store` | (optional) The Meta.Store instance |

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

