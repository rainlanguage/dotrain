[Home](../index.md) &gt; [callOperand](./calloperand_1.md)

# Function callOperand()

Builds the operand for RainInterpreter's `CALL` opcode by packing 3 numbers into a single byte.

<b>Signature:</b>

```typescript
function callOperand(inputSize: number, outputSize: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  inputSize | `number` | number of inputs being passed to the source |
|  outputSize | `number` | number of outputs returned by the source |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

