[Home](../index.md) &gt; [selectLte](./selectlte_1.md)

# Function selectLte()

function to set up the operand for a SELECT\_LTE opcode

<b>Signature:</b>

```typescript
function selectLte(logic: number, mode: number, length: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  logic | `number` | 0 = every, 1 = any, acts like a logical and/or for the check against BLOCK\_NUMBER |
|  mode | `number` | 0 = min, 1 = max, 2 = first, the way to select the reports that pass the check against BLOCK\_NUMBER |
|  length | `number` | the number of reports to stack for SELECT\_LTE opcode |

<b>Returns:</b>

`number`

a byte size number

