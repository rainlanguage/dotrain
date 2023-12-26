[Home](../index.md) &gt; [RainlangDocument](./rainlangdocument.md)

# Class RainlangDocument

Data structure (parse tree) of a Rainlang text

RainlangDocument is a data structure of a parsed Rainlang text to its parse tree which are used by the RainDocument and for providing LSP services.

it should be noted that generally this should not be used individually outside RainDocument unless there is a justified reason, as prasing a Rainlang text should be done through Rain NativeParser contract and parsing method of this struct has no effect on NativeParser prasing and is totally separate as it only provides AST data generally used in context of RainDocument for LSP services and sourcemap generation.

<b>Signature:</b>

```typescript
class RainlangDocument 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ast](./rainlangdocument.md#ast-property) | `RainlangSource[]` | This instance's parse tree (AST) |
|  [comments](./rainlangdocument.md#comments-property) | `Comment[]` | This instance's comments |
|  [error](./rainlangdocument.md#error-property) | `string \| undefined` | The error msg if parsing resulted in an error |
|  [problems](./rainlangdocument.md#problems-property) | `Problem[]` | This instance's problems |
|  [text](./rainlangdocument.md#text-property) | `string` | This instance's text |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [create(text, authoring\_meta, namespace)](./rainlangdocument.md#create-method-static-1) | Creates a new instance |
|  [fromInterface(value)](./rainlangdocument.md#fromInterface-method-static-1) | Creates an instance from interface object |

## Methods

|  Method | Description |
|  --- | --- |
|  [compile(deployer)](./rainlangdocument.md#compile-method-1) | Compiles this instance's text given the entrypoints and INPE2Deployer |
|  [free()](./rainlangdocument.md#free-method-1) |  |
|  [toInterface()](./rainlangdocument.md#toInterface-method-1) | Creates an interface object from this instance |
|  [update(new\_text, authoring\_meta, namespace)](./rainlangdocument.md#update-method-1) | Updates the text of this instance and parses it right away |

## Property Details

<a id="ast-property"></a>

### ast

This instance's parse tree (AST)

<b>Signature:</b>

```typescript
readonly ast: RainlangSource[];
```

<a id="comments-property"></a>

### comments

This instance's comments

<b>Signature:</b>

```typescript
readonly comments: Comment[];
```

<a id="error-property"></a>

### error

The error msg if parsing resulted in an error

<b>Signature:</b>

```typescript
readonly error: string | undefined;
```

<a id="problems-property"></a>

### problems

This instance's problems

<b>Signature:</b>

```typescript
readonly problems: Problem[];
```

<a id="text-property"></a>

### text

This instance's text

<b>Signature:</b>

```typescript
readonly text: string;
```

## Static Method Details

<a id="create-method-static-1"></a>

### create(text, authoring\_meta, namespace)

Creates a new instance

<b>Signature:</b>

```typescript
static create(
        text: string,
        authoring_meta?: IAuthoringMeta,
        namespace?: Namespace,
    ): RainlangDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` |  |
|  authoring\_meta | [IAuthoringMeta](../types/iauthoringmeta.md) |  |
|  namespace | [Namespace](../types/namespace.md) |  |

<b>Returns:</b>

`RainlangDocument`

{<!-- -->RainlangDocument<!-- -->}

<a id="fromInterface-method-static-1"></a>

### fromInterface(value)

Creates an instance from interface object

<b>Signature:</b>

```typescript
static fromInterface(value: IRainlangDocument): RainlangDocument;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | [IRainlangDocument](../interfaces/irainlangdocument.md) |  |

<b>Returns:</b>

`RainlangDocument`

{<!-- -->RainlangDocument<!-- -->}

## Method Details

<a id="compile-method-1"></a>

### compile(deployer)

Compiles this instance's text given the entrypoints and INPE2Deployer

<b>Signature:</b>

```typescript
compile(deployer: INPE2Deployer): Promise<ParseResult>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  deployer | [INPE2Deployer](../interfaces/inpe2deployer.md) |  |

<b>Returns:</b>

`Promise<ParseResult>`

{<!-- -->Promise<ParseResult>}

<a id="free-method-1"></a>

### free()

<b>Signature:</b>

```typescript
free(): void;
```
<b>Returns:</b>

`void`

<a id="toInterface-method-1"></a>

### toInterface()

Creates an interface object from this instance

<b>Signature:</b>

```typescript
toInterface(): IRainlangDocument;
```
<b>Returns:</b>

`IRainlangDocument`

{<!-- -->IRainlangDocument<!-- -->}

<a id="update-method-1"></a>

### update(new\_text, authoring\_meta, namespace)

Updates the text of this instance and parses it right away

<b>Signature:</b>

```typescript
update(new_text: string, authoring_meta?: IAuthoringMeta, namespace?: Namespace): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  new\_text | `string` |  |
|  authoring\_meta | [IAuthoringMeta](../types/iauthoringmeta.md) |  |
|  namespace | [Namespace](../types/namespace.md) |  |

<b>Returns:</b>

`void`

