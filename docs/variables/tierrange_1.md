[Home](../index.md) &gt; [tierRange](./tierrange_1.md)

# Function tierRange()

function to pack start/end tier range into a byte size number for the UPDATE\_BLOCKS\_FOR\_TIER\_RANGE opcode

<b>Signature:</b>

```typescript
function tierRange(startTier: number, endTier: number): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  startTier | `number` | the start tier of the updating which ranges between 0 to 8 (exclusive) |
|  endTier | `number` | the end tier of the updating which ranges between 0 to 8 (inclusive) |

<b>Returns:</b>

`number`

a byte size number

