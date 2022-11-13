[Home](../index.md) &gt; [Parser](./parser.md)

# Class Parser

Parser is a mini compiler to generate a valid StateConfig (deployable bytes) from a text script

<b>Signature:</b>

```typescript
class Parser 
```

## Example


```typescript
// to import
import { Parser } from 'rain-sdk';

// to set the custom opmeta
Parser.set(opmeta)

// to set the custom details of GTE and LTE opcodes
Parser.setGteMeta(name?, description?, data?, description?)
Parser.setLteMeta(name?, description?, data?, description?)

// to execute the parsing and get parse tree object and StateConfig
let parseTree;
let stateConfig
[ parseTree, stateConfig ] = Parser.get(textScript, customOpMeta, customMultiOutputPlaceholderChar);

// to get parse tree object only
let parseTree = Parser.getParseTree(textScript, customOpMeta, customMultiOutputPlaceholderChar);

// to get StateConfig only
let stateConfig = Parser.getStateConfig(textScript, customOpMeta, customMultiOutputPlaceholderChar);

// to build StateConfig (compile) from ParseTree object or a Node or array of Node
let argument: Node || Node[] || ParseTree
let stateConfig = Parser.compile(argument)

```

## Static Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [constants](./parser.md#constants-property-static) | `BigNumberish[]` |  |
|  [parseTree](./parser.md#parseTree-property-static) | [ParseTree](../types/parsetree.md) |  |
|  [resolveMultiOutput](./parser.md#resolveMultiOutput-property-static) | `(totalCount: number, depthLevel: number) => void` | Method to resolve multi output nodes at current state of parsing |
|  [sources](./parser.md#sources-property-static) | `BytesLike[]` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [compile(parseTree, offset, constants)](./parser.md#compile-method-static-1) | Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes |
|  [get(expression, opmeta, multiOutputPlaceholderChar)](./parser.md#get-method-static-1) | Method to get parse tree object and StateConfig |
|  [getParseTree(expression, opmeta, multiOutputPlaceholderChar)](./parser.md#getParseTree-method-static-1) | Method to get the parse tree object |
|  [getStateConfig(expression, opmeta, multiOutputPlaceholderChar)](./parser.md#getStateConfig-method-static-1) | Method to get the StateConfig |
|  [setGteMeta(name, description, data, aliases)](./parser.md#setGteMeta-method-static-1) | Method to set the details of the GTE opcode |
|  [setIneqMeta(name, description, data, aliases)](./parser.md#setIneqMeta-method-static-1) | Method to set the details of the INEQ opcode |
|  [setLteMeta(name, description, data, aliases)](./parser.md#setLteMeta-method-static-1) | Method to set the details of the LTE opcode |
|  [updateArgs(config)](./parser.md#updateArgs-method-static-1) | Method to update the arguments of zipmaps after full bytes build (if any present) |

## Static Property Details

<a id="constants-property-static"></a>

### constants

<b>Signature:</b>

```typescript
static constants: BigNumberish[];
```

<a id="parseTree-property-static"></a>

### parseTree

<b>Signature:</b>

```typescript
static parseTree: ParseTree;
```

<a id="resolveMultiOutput-property-static"></a>

### resolveMultiOutput

Method to resolve multi output nodes at current state of parsing

<b>Signature:</b>

```typescript
static resolveMultiOutput: (totalCount: number, depthLevel: number) => void;
```

<a id="sources-property-static"></a>

### sources

<b>Signature:</b>

```typescript
static sources: BytesLike[];
```

## Static Method Details

<a id="compile-method-static-1"></a>

### compile(parseTree, offset, constants)

Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes

<b>Signature:</b>

```typescript
static compile(parseTree: Node | Node[] | Record<number, Node[]> | Record<number, {
        tree: Node[];
        position: number[];
    }>, offset?: number, constants?: BigNumberish[]): StateConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  parseTree | <pre>Node \| Node[] \| Record<number, Node[]> \| Record<number, {&#010;    tree: Node[];&#010;    position: number[];&#010;}></pre> | Tree like object (Parse Tree object or a Node or array of Nodes) to get the StateConfig from |
|  offset | `number` | This argument is used internally and should be ignored when calling this method externally |
|  constants | `BigNumberish[]` | This argument is used internally and should be ignored when calling this method externally |

<b>Returns:</b>

`StateConfig`

StateConfig, i.e. compiled bytes

<a id="get-method-static-1"></a>

### get(expression, opmeta, multiOutputPlaceholderChar)

Method to get parse tree object and StateConfig

<b>Signature:</b>

```typescript
static get(expression: string, opmeta?: typeof standardOpMeta, multiOutputPlaceholderChar?: string): [ParseTree, StateConfig];
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `typeof standardOpMeta` | (optional) custom opmeta |
|  multiOutputPlaceholderChar | `string` | (optional) custom multi output placeholder character, default is '\_' |

<b>Returns:</b>

`[ParseTree, StateConfig]`

Array of parse tree object and StateConfig

<a id="getParseTree-method-static-1"></a>

### getParseTree(expression, opmeta, multiOutputPlaceholderChar)

Method to get the parse tree object

<b>Signature:</b>

```typescript
static getParseTree(expression: string, opmeta?: typeof standardOpMeta, multiOutputPlaceholderChar?: string): ParseTree;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `typeof standardOpMeta` | (optional) custom opmeta |
|  multiOutputPlaceholderChar | `string` | (optional) custom multi output placeholder character, default is '\_' |

<b>Returns:</b>

`ParseTree`

A parse tree object

<a id="getStateConfig-method-static-1"></a>

### getStateConfig(expression, opmeta, multiOutputPlaceholderChar)

Method to get the StateConfig

<b>Signature:</b>

```typescript
static getStateConfig(expression: string, opmeta?: typeof standardOpMeta, multiOutputPlaceholderChar?: string): StateConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `typeof standardOpMeta` | (optional) custom opmeta |
|  multiOutputPlaceholderChar | `string` | (optional) custom multi output placeholder character, default is '\_' |

<b>Returns:</b>

`StateConfig`

A StateConfig

<a id="setGteMeta-method-static-1"></a>

### setGteMeta(name, description, data, aliases)

Method to set the details of the GTE opcode

<b>Signature:</b>

```typescript
static setGteMeta(name?: string, description?: string, data?: any, aliases?: string[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | `string` | (optional) name of the GTE opcode |
|  description | `string` | (optional) The description |
|  data | `any` | (optional) data |
|  aliases | `string[]` | (optional) The aliases of GTE opcode |

<b>Returns:</b>

`void`

<a id="setIneqMeta-method-static-1"></a>

### setIneqMeta(name, description, data, aliases)

Method to set the details of the INEQ opcode

<b>Signature:</b>

```typescript
static setIneqMeta(name?: string, description?: string, data?: any, aliases?: string[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | `string` | (optional) name of the INEQ opcode |
|  description | `string` | (optional) The description |
|  data | `any` | (optional) data |
|  aliases | `string[]` | (optional) The aliases of INEQ opcode |

<b>Returns:</b>

`void`

<a id="setLteMeta-method-static-1"></a>

### setLteMeta(name, description, data, aliases)

Method to set the details of the LTE opcode

<b>Signature:</b>

```typescript
static setLteMeta(name?: string, description?: string, data?: any, aliases?: string[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | `string` | (optional) name of the LTE opcode |
|  description | `string` | (optional) The description |
|  data | `any` | (optional) data |
|  aliases | `string[]` | (optional) The aliases of LTE opcode |

<b>Returns:</b>

`void`

<a id="updateArgs-method-static-1"></a>

### updateArgs(config)

Method to update the arguments of zipmaps after full bytes build (if any present)

<b>Signature:</b>

```typescript
static updateArgs(config: StateConfig): StateConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  config | [StateConfig](../types/stateconfig.md) |  |

<b>Returns:</b>

`StateConfig`

