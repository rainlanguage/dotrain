[Home](../index.md) &gt; [memoryOperand](./memoryoperand_1.md)

# Function memoryOperand()

Constructs operand for standard STATE opecode

<b>Signature:</b>

```typescript
function memoryOperand(type: number, offset: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  type | `number` | Type of the opcode, either 'stack' or 'constant' |
|  offset | `number` | the position of the item in respect to its type |

<b>Returns:</b>

`number`

