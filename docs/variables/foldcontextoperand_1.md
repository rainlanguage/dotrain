[Home](../index.md) &gt; [foldContextOperand](./foldcontextoperand_1.md)

# Function foldContextOperand()

Builds the operand for RainInterpreter's `FOLD_CONTEXT` opcode by packing 4 numbers into 2 bytes.

<b>Signature:</b>

```typescript
function foldContextOperand(inputs: number, width: number, foldColumn: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  inputs | `number` | accumulator input count |
|  width | `number` | width of the column |
|  foldColumn | `number` | column to start from |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

a 2 bytes size number

