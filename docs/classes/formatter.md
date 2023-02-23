[Home](../index.md) &gt; [Formatter](./formatter.md)

# Class Formatter

The generator of human friendly readable source.

Parse an ExpressionConfig to a more human readable form, making easier to understand. This form allows users read exactly what the Script will do, like the conditions, values used, etc. Also, anyone can learn to write their own scripts if use the Human Form to see the output for each combination that they made.

<b>Signature:</b>

```typescript
class Formatter 
```

## Static Methods

|  Method | Description |
|  --- | --- |
|  [get(\_state, \_opmeta, \_config)](./formatter.md#get-method-static-1) | Obtain the friendly output from an ExpressionConfig |
|  [prettify(\_text, \_config)](./formatter.md#prettify-method-static-1) | Make the output from the HumanFriendly Source more readable by adding indenting following the parenthesis |
|  [set(opmeta)](./formatter.md#set-method-static-1) | Method to set the op meta |

## Static Method Details

<a id="get-method-static-1"></a>

### get(\_state, \_opmeta, \_config)

Obtain the friendly output from an ExpressionConfig

<b>Signature:</b>

```typescript
static get(_state: ExpressionConfig, _opmeta: string | Uint8Array | object[], _config?: Config): string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  \_state | [ExpressionConfig](../types/expressionconfig.md) | The ExpressionConfig to generate the friendly version |
|  \_opmeta | `string \| Uint8Array \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |
|  \_config | [Config](../types/config.md) | The configuration that will run the generator |

<b>Returns:</b>

`string`


<a id="prettify-method-static-1"></a>

### prettify(\_text, \_config)

Make the output from the HumanFriendly Source more readable by adding indenting following the parenthesis

If the string is already indentend, the method will wrongly generate the string

<b>Signature:</b>

```typescript
static prettify(_text: string, _config?: PrettifyConfig): string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  \_text | `string` | The output from the HumanFriendlySource |
|  \_config | [PrettifyConfig](../types/prettifyconfig.md) | The configuration of the prettify method (experimental) |

<b>Returns:</b>

`string`

A prettified output

<a id="set-method-static-1"></a>

### set(opmeta)

Method to set the op meta

<b>Signature:</b>

```typescript
static set(opmeta: string | Uint8Array | object[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  opmeta | `string \| Uint8Array \| object[]` | Ops meta as bytes ie hex string or Uint8Array or json content as string or array of object (json parsed) |

<b>Returns:</b>

`void`

