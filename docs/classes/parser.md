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
let expressionConfig
[ parseTree, expressionConfig ] = Parser.get(textScript, opMeta);

// to get parse tree object only
let parseTree = Parser.getParseTree(textScript, opMeta);

// to get ExpressionConfig only
let expressionConfig = Parser.getExpressionConfig(textScript, opMeta);

// to build ExpressionConfig (compile) from ParseTree object or a Node or array of Node
let argument: Node || Node[] || ParseTree
let expressionConfig = Parser.compile(argument)

```

## Static Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [constants](./parser.md#constants-property-static) | `BigNumberish[]` |  |
|  [numericPattern](./parser.md#numericPattern-property-static) | `RegExp` |  |
|  [parseTree](./parser.md#parseTree-property-static) | [ParseTree](../types/parsetree.md) |  |
|  [sources](./parser.md#sources-property-static) | `BytesLike[]` |  |
|  [wordPattern](./parser.md#wordPattern-property-static) | `RegExp` |  |

## Static Methods

|  Method | Description |
|  --- | --- |
|  [compile(parseTree)](./parser.md#compile-method-static-1) | Method to get ExpressionConfig (bytes) from a Parse Tree object or a Node or array of Nodes |
|  [get(expression, opmeta, callback)](./parser.md#get-method-static-1) | Method to get parse tree object and ExpressionConfig |
|  [getExpressionConfig(expression, opmeta, callback)](./parser.md#getExpressionConfig-method-static-1) | Method to get the ExpressionConfig |
|  [getParseTree(expression, opmeta, callback)](./parser.md#getParseTree-method-static-1) | Method to get the parse tree object |

## Static Property Details

<a id="constants-property-static"></a>

### constants

<b>Signature:</b>

```typescript
static constants: BigNumberish[];
```

<a id="numericPattern-property-static"></a>

### numericPattern

<b>Signature:</b>

```typescript
static numericPattern: RegExp;
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

<a id="wordPattern-property-static"></a>

### wordPattern

<b>Signature:</b>

```typescript
static wordPattern: RegExp;
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
    }>): ExpressionConfig | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  parseTree | <pre>Node \| Node[] \| Record<number, Node[]> \| Record<number, {&#010;    tree: Node[];&#010;    position: number[];&#010;}></pre> | Tree like object (Parse Tree object or a Node or array of Nodes) to get the ExpressionConfig from |

<b>Returns:</b>

`ExpressionConfig | undefined`

ExpressionConfig, i.e. compiled bytes ready to be deployed

<a id="get-method-static-1"></a>

### get(expression, opmeta, callback)

Method to get parse tree object and ExpressionConfig

<b>Signature:</b>

```typescript
static get(expression: string, opmeta: Uint8Array | string | object[], callback?: (error: Error) => void): [
        ParseTree & {
            diagnostics: Diagnostic[];
            comments: Comment[];
        },
        (ExpressionConfig | undefined)
    ] | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |
|  callback | `(error: Error) => void` | (optional) A callback fn to handle runtime errors |

<b>Returns:</b>

`[
        ParseTree & {
            diagnostics: Diagnostic[];
            comments: Comment[];
        },
        (ExpressionConfig | undefined)
    ] | undefined`

Array of parse tree object and ExpressionConfig

<a id="getExpressionConfig-method-static-1"></a>

### getExpressionConfig(expression, opmeta, callback)

Method to get the ExpressionConfig

<b>Signature:</b>

```typescript
static getExpressionConfig(expression: string, opmeta: Uint8Array | string | object[], callback?: (error: Error) => void): ExpressionConfig | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |
|  callback | `(error: Error) => void` | (optional) A callback fn to handle runtime errors |

<b>Returns:</b>

`ExpressionConfig | undefined`

A ExpressionConfig

<a id="getParseTree-method-static-1"></a>

### getParseTree(expression, opmeta, callback)

Method to get the parse tree object

<b>Signature:</b>

```typescript
static getParseTree(expression: string, opmeta: Uint8Array | string | object[], callback?: (error: Error) => void): ParseTree & {
        diagnostics: Diagnostic[];
        comments: Comment[];
    } | undefined;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  expression | `string` | the text expression |
|  opmeta | `Uint8Array \| string \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |
|  callback | `(error: Error) => void` | (optional) A callback fn to handle runtime errors |

<b>Returns:</b>

`ParseTree & {
        diagnostics: Diagnostic[];
        comments: Comment[];
    } | undefined`

A parse tree object

