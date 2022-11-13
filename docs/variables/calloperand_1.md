[Home](../index.md) &gt; [callOperand](./calloperand_1.md)

# Function callOperand()

Constructs the operand for RainInterpreter's `CALL` opcode by packing 3 numbers into a single byte.

<b>Signature:</b>

```typescript
function callOperand(inputSize: number, outputSize: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  inputSize | `number` | number of inputs being passed to the source (range 0-7) |
|  outputSize | `number` | number of output returned by the source (range 1-3) |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

