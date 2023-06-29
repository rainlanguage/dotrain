[Home](../index.md) &gt; [trim](./trim_1.md)

# Function trim()

Trims a text (removing start/end whitespaces) with reporting the number of deletions

<b>Signature:</b>

```typescript
function trim(str: string): {
    text: string;
    startDelCount: number;
    endDelCount: number;
};
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  str | `string` | The text to trim |

<b>Returns:</b>

`{
    text: string;
    startDelCount: number;
    endDelCount: number;
}`

