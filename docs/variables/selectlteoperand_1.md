[Home](../index.md) &gt; [selectLteOperand](./selectlteoperand_1.md)

# Function selectLteOperand()

function to set up the operand for a SELECT\_LTE opcode

<b>Signature:</b>

```typescript
function selectLteOperand(logic: number, mode: number, inputSize: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  logic | `number` | 0 = every, 1 = any, acts like a logical and/or for the check against BLOCK\_NUMBER |
|  mode | `number` | 0 = min, 1 = max, 2 = first, the way to select the reports that pass the check against BLOCK\_NUMBER |
|  inputSize | `number` | the number of reports to stack for SELECT\_LTE opcode |

<b>Returns:</b>

`number`

a byte size number

