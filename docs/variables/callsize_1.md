[Home](../index.md) &gt; [callSize](./callsize_1.md)

# Function callSize()

Constructs the operand for RainVM's `zipmap` opcode by packing 3 numbers into a single byte. All parameters use zero-based counting i.e. an `fnSize` of 0 means to allocate one element (32 bytes) on the stack to define your functions, while an `fnSize` of 3 means to allocate all four elements (4 \* 32 bytes) on the stack.

<b>Signature:</b>

```typescript
function callSize(sourceIndex: number, loopSize: number, valSize: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  sourceIndex | `number` | index of function source in `immutableSourceConfig.sources` |
|  loopSize | `number` | number of times to subdivide vals, reduces uint size but allows for more vals (range 0-7) |
|  valSize | `number` | number of vals in outer stack (range 0-7) |

<b>Returns:</b>

`number`

