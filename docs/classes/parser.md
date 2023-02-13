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
import { Parser } from 'rainlang';

// to execute the parsing and get parse tree object and ExpressionConfig
let parseTree;
let stateConfig
[ parseTree, stateConfig ] = Parser.get(textScript, opMeta);

// to get parse tree object only
let parseTree = Parser.getParseTree(textScript, opMeta);

// to get ExpressionConfig only
let stateConfig = Parser.getExpressionConfig(textScript, opMeta);

// to build ExpressionConfig (compile) from ParseTree object or a Node or array of Node
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
|  [compile(parseTree)](./parser.md#compile-method-static-1) | Method to get ExpressionConfig (bytes) from a Parse Tree object or a Node or array of Nodes |
|  [get(expression, opmeta)](./parser.md#get-method-static-1) | Method to get parse tree object and ExpressionConfig |
|  [getExpressionConfig(expression, opmeta)](./parser.md#getExpressionConfig-method-static-1) | Method to get the ExpressionConfig |
|  [getParseTree(expression, opmeta)](./parser.md#getParseTree-method-static-1) | Method to get the parse tree object |

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

### compile(parseTree)

Method to get ExpressionConfig (bytes) from a Parse Tree object or a Node or array of Nodes

<b>Signature:</b>

```typescript
static compile(parseTree: Node | Node[] | Record<number, Node[]> | Record<number, {
        tree: Node[];
        position: number[];
    }>): ExpressionConfig;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  parseTree | <pre>Node \| Node[] \| Record<number, Node[]> \| Record<number, {&#010;    tree: Node[];&#010;    position: number[];&#010;}></pre> | Tree like object (Parse Tree object or a Node or array of Nodes) to get the ExpressionConfig from |

<b>Returns:</b>

`ExpressionConfig`

ExpressionConfig, i.e. compiled bytes ready to be deployed

<a id="get-method-static-1"></a>

### get(expression, opmeta)

Method to get parse tree object and ExpressionConfig

<b>Signature:</b>

```typescript
static get(expression: string, opmeta: Uint8Array | string | object[]): [ParseTree & {
        comments?: Comment[];
    }, ExpressionConfig] | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |

<b>Returns:</b>

`[ParseTree & {
        comments?: Comment[];
    }, ExpressionConfig] | string`

Array of parse tree object and ExpressionConfig

<a id="getExpressionConfig-method-static-1"></a>

### getExpressionConfig(expression, opmeta)

Method to get the ExpressionConfig

<b>Signature:</b>

```typescript
static getExpressionConfig(expression: string, opmeta: Uint8Array | string | object[]): ExpressionConfig | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |

<b>Returns:</b>

`ExpressionConfig | string`

A ExpressionConfig

<a id="getParseTree-method-static-1"></a>

### getParseTree(expression, opmeta)

Method to get the parse tree object

<b>Signature:</b>

```typescript
static getParseTree(expression: string, opmeta: Uint8Array | string | object[]): ParseTree & {
        comments?: Comment[];
    } | string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |

<b>Returns:</b>

`ParseTree & {
        comments?: Comment[];
    } | string`

A parse tree object

