[Home](../index.md) &gt; [memoryOperand](./memoryoperand_1.md)

# Function memoryOperand()

Constructs operand for standard STATE opecode

<b>Signature:</b>

```typescript
function memoryOperand(offset: number, type: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  offset | `number` | the position of the item in respect to its type |
|  type | `number` | Type of the opcode, either 'stack' or 'constant' |

<b>Returns:</b>

`number`

