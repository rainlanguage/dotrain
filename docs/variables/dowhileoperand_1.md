[Home](../index.md) &gt; [doWhileOperand](./dowhileoperand_1.md)

# Function doWhileOperand()

Builds the operand for RainInterpreter's `DO_WHILE` opcode by packing 3 numbers into a single byte.

<b>Signature:</b>

```typescript
function doWhileOperand(inputSize: number, reserved: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  inputSize | `number` | number of inputs being passed to the source |
|  reserved | `number` | reserved bytes |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

