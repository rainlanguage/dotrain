[Home](../index.md) &gt; [RainlangParser](./rainlangparser.md)

# Class RainlangParser

Rainlang Parser is a the main workhorse that does all the heavy work of parsing a document, written in TypeScript in order to parse a text document using an op meta into known types which later will be used in RainDocument object and Rain Language Services and Compiler

<b>Signature:</b>

```typescript
class RainlangParser 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ast](./rainlangparser.md#ast-property) | [RainlangAST](../types/rainlangast.md) |  |
|  [constants](./rainlangparser.md#constants-property) | `Record<string, string>` |  |
|  [namedExpressions](./rainlangparser.md#namedExpressions-property) | `NamedExpression[]` |  |
|  [problems](./rainlangparser.md#problems-property) | `Problem[]` |  |
|  [text](./rainlangparser.md#text-property) | `string` |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [parse(resolveQuotes)](./rainlangparser.md#parse-method-1) | Parses this instance of RainParser |

## Property Details

<a id="ast-property"></a>

### ast

<b>Signature:</b>

```typescript
ast: RainlangAST;
```

<a id="constants-property"></a>

### constants

<b>Signature:</b>

```typescript
constants: Record<string, string>;
```

<a id="namedExpressions-property"></a>

### namedExpressions

<b>Signature:</b>

```typescript
namedExpressions: NamedExpression[];
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

## Method Details

<a id="parse-method-1"></a>

### parse(resolveQuotes)

Parses this instance of RainParser

<b>Signature:</b>

```typescript
parse(resolveQuotes?: boolean): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  resolveQuotes | `boolean` |  |

<b>Returns:</b>

`void`

