[Home](../index.md) &gt; [exclusiveParse](./exclusiveparse_1.md)

# Function exclusiveParse()

Parses an string by extracting the strings outside of matches

<b>Signature:</b>

```typescript
function exclusiveParse(str: string, pattern: RegExp, offset?: number, includeEmptyEnds?: boolean): ParsedChunk[];
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  str | `string` | The string to parse |
|  pattern | `RegExp` | The pattern to search and extract |
|  offset | `number` | (optional) The offset to factor in for returning matched positions |
|  includeEmptyEnds | `boolean` | (optional) Includes start/end empty matches in the results if true |

<b>Returns:</b>

`ParsedChunk[]`

An array of strings outside of matchings and their position inclusive at both ends

