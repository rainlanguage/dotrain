[Home](../index.md) &gt; [loopNOperand](./loopnoperand_1.md)

# Function loopNOperand()

Constructs the operand for RainInterpreter's `LOOP_N` opcode by packing 2 numbers into a single byte.

<b>Signature:</b>

```typescript
function loopNOperand(n: number, sourceIndex: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  n | `number` | loop the source for n times (range 0-15) |
|  sourceIndex | `number` | index of function source |

<b>Returns:</b>

`number`

