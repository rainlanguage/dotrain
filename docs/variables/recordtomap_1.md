[Home](../index.md) &gt; [recordToMap](./recordtomap_1.md)

# Function recordToMap()

Conver a Record (a key/value pair object) to a equivelant Map. Map keys will be of type acceptable by Record constructor, which are string, number or symbol.

<b>Signature:</b>

```typescript
function recordToMap<K extends string | number | symbol>(record: Record<K, any>, properties?: string | string[]): Map<K, any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  record | `Record<K, any>` | The Record to convert to a Map |
|  properties | `string \| string[]` | (optional) properties to pick from the values of key/value pair items of the Record object. |

<b>Returns:</b>

`Map<K, any>`


