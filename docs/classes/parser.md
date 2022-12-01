[Home](../index.md) &gt; [Parser](./parser.md)

# Class Parser

Rain Parser is a compiler written in TypeScript in order to parse, compile and output Rain Expressions into deployable bytes for Rain Protocol's smart contracts and also a parse tree object which contains all the parsed data and info of the opcode, values, errors and ... that can be used by the caller, for example to be make an enriched Rain in-bowser text editor. Rain Parser uses an standard opcode metadata callled OpMeta in order to parse opcodes into deployable bytes of an Rain Interpreter.

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
|  [\_resolveMultiOutput](./parser.md#_resolveMultiOutput-property-static) | `(totalCount: number, depthLevel: number) => void` | Method to resolve multi output nodes at current state of parsing |
|  [constants](./parser.md#constants-property-static) | `BigNumberish[]` |  |
|  [parseTree](./parser.md#parseTree-property-static) | [ParseTree](../types/parsetree.md) |  |
|  [sources](./parser.md#sources-property-static) | `BytesLike[]` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [compile(parseTree, constants)](./parser.md#compile-method-static-1) | Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes |
|  [get(expression, opmeta)](./parser.md#get-method-static-1) | Method to get parse tree object and StateConfig |
|  [getParseTree(expression, opmeta)](./parser.md#getParseTree-method-static-1) | Method to get the parse tree object |
|  [getStateConfig(expression, opmeta)](./parser.md#getStateConfig-method-static-1) | Method to get the StateConfig |
|  [setGteMeta(name, description, data, aliases)](./parser.md#setGteMeta-method-static-1) | Method to set the details of the GTE opcode |
|  [setInEqMeta(name, description, data, aliases)](./parser.md#setInEqMeta-method-static-1) | Method to set the details of the INEQ opcode |
|  [setLteMeta(name, description, data, aliases)](./parser.md#setLteMeta-method-static-1) | Method to set the details of the LTE opcode |

## Static Property Details

<a id="_resolveMultiOutput-property-static"></a>

### \_resolveMultiOutput

Method to resolve multi output nodes at current state of parsing

<b>Signature:</b>

```typescript
static _resolveMultiOutput: (totalCount: number, depthLevel: number) => void;
```

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

<a id="sources-property-static"></a>

### sources

<b>Signature:</b>

```typescript
static sources: BytesLike[];
```

## Static Method Details

<a id="compile-method-static-1"></a>

### compile(parseTree, constants)

Method to get StateConfig (bytes) from a Parse Tree object or a Node or array of Nodes

<b>Signature:</b>

```typescript
static compile(parseTree: Node | Node[] | Record<number, Node[]> | Record<number, {
        tree: Node[];
        position: number[];
    }>, constants?: BigNumberish[]): StateConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  parseTree | <pre>Node \| Node[] \| Record<number, Node[]> \| Record<number, {&#010;    tree: Node[];&#010;    position: number[];&#010;}></pre> | Tree like object (Parse Tree object or a Node or array of Nodes) to get the StateConfig from |
|  constants | `BigNumberish[]` | This argument is used internally and should be ignored when calling this method externally |

<b>Returns:</b>

`StateConfig`

StateConfig, i.e. compiled bytes

<a id="get-method-static-1"></a>

### get(expression, opmeta)

Method to get parse tree object and StateConfig

<b>Signature:</b>

```typescript
static get(expression: string, opmeta?: OpMeta[]): [ParseTree | (ParseTree & {
        'comments': Comment[];
    }), StateConfig] | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `OpMeta[]` | (optional) custom opmeta |

<b>Returns:</b>

`[ParseTree | (ParseTree & {
        'comments': Comment[];
    }), StateConfig] | string`

Array of parse tree object and StateConfig

<a id="getParseTree-method-static-1"></a>

### getParseTree(expression, opmeta)

Method to get the parse tree object

<b>Signature:</b>

```typescript
static getParseTree(expression: string, opmeta?: OpMeta[]): ParseTree | (ParseTree & {
        'comments': Comment[];
    }) | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `OpMeta[]` | (optional) custom opmeta |

<b>Returns:</b>

`ParseTree | (ParseTree & {
        'comments': Comment[];
    }) | string`

A parse tree object

<a id="getStateConfig-method-static-1"></a>

### getStateConfig(expression, opmeta)

Method to get the StateConfig

<b>Signature:</b>

```typescript
static getStateConfig(expression: string, opmeta?: OpMeta[]): StateConfig | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `OpMeta[]` | (optional) custom opmeta |

<b>Returns:</b>

`StateConfig | string`

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

<a id="setInEqMeta-method-static-1"></a>

### setInEqMeta(name, description, data, aliases)

Method to set the details of the INEQ opcode

<b>Signature:</b>

```typescript
static setInEqMeta(name?: string, description?: string, data?: any, aliases?: string[]): void;
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

