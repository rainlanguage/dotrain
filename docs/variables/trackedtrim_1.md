[Home](../index.md) &gt; [trackedTrim](./trackedtrim_1.md)

# Function trackedTrim()

Trims a text (removing start/end whitespaces) with reporting the number of deletions

<b>Signature:</b>

```typescript
function trackedTrim(str: string): {
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

