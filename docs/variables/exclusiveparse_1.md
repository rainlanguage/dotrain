[Home](../index.md) &gt; [exclusiveParse](./exclusiveparse_1.md)

# Function exclusiveParse()

Parses an string by extracting the strings outside of matches

<b>Signature:</b>

```typescript
function exclusiveParse(str: string, pattern: RegExp, offset?: number): [string, [number, number]][];
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  str | `string` | The string to parse |
|  pattern | `RegExp` | The pattern to search and extract |
|  offset | `number` | (optional) The offset to factor in for returning matched positions |

<b>Returns:</b>

`[string, [number, number]][]`

An array of strings outside of matchings and their position inclusive at both ends

