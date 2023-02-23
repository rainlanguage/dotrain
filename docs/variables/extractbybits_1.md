[Home](../index.md) &gt; [extractByBits](./extractbybits_1.md)

# Function extractByBits()

Method to extract value from operand by specified bits indexes

<b>Signature:</b>

```typescript
function extractByBits(value: number, bits: [number, number], computation?: string, computationVar?: string): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | `number` | Operand value |
|  bits | `[number, number]` | Bits indexes to extract |
|  computation | `string` | Any arethmetical operation to apply to extracted value |
|  computationVar | `string` | The variavle in compuation to solve for, default is "bits" |

<b>Returns:</b>

`number`

Extracted value

