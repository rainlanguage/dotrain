[Home](../index.md) &gt; [Formatter](./formatter.md)

# Class Formatter

The generator of human friendly readable source.

Parse an StateConfig/Script to a more human readable form, making easier to understand. This form allows users read exactly what the Script will do, like the conditions, values used, etc. Also, anyone can learn to write their own scripts if use the Human Form to see the output for each combination that they made.

<b>Signature:</b>

```typescript
class Formatter 
```

## Static Methods

|  Method | Description |
|  --- | --- |
|  [get(\_state, \_opmeta, \_config)](./formatter.md#get-method-static-1) | Obtain the friendly output from an StateConfig/script. |
|  [prettify(\_text, \_config)](./formatter.md#prettify-method-static-1) | Make the output from the HumanFriendly Source more readable by adding indenting following the parenthesis |
|  [set(opmeta\_)](./formatter.md#set-method-static-1) | Method to set the opmeta with more than AllStandardOps opcodes or with other name/aliases for this instance of the Formatter |

## Static Method Details

<a id="get-method-static-1"></a>

### get(\_state, \_opmeta, \_config)

Obtain the friendly output from an StateConfig/script.

<b>Signature:</b>

```typescript
static get(_state: StateConfig, _opmeta?: string | Uint8Array, _config?: Config): string;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  \_state | [StateConfig](../types/stateconfig.md) | The StateConfig/script to generate the friendly version |
|  \_opmeta | `string \| Uint8Array` |  |
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

### set(opmeta\_)

Method to set the opmeta with more than AllStandardOps opcodes or with other name/aliases for this instance of the Formatter

<b>Signature:</b>

```typescript
static set(opmeta_: OpMeta[]): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  opmeta\_ | `OpMeta[]` | The OpMeta array |

<b>Returns:</b>

`void`

