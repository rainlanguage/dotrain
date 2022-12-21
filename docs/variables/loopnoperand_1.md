[Home](../index.md) &gt; [loopNOperand](./loopnoperand_1.md)

# Function loopNOperand()

Builds the operand for RainInterpreter's `LOOP_N` opcode by packing 4 numbers into a single byte.

<b>Signature:</b>

```typescript
function loopNOperand(n: number, inputSize: number, outputSize: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  n | `number` | loop the source for n times |
|  inputSize | `number` | number of inputs being passed to the source |
|  outputSize | `number` | number of outputs returned by the source |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

