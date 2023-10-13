[Home](../index.md) &gt; [mapToRecord](./maptorecord_1.md)

# Function mapToRecord()

Conver a Map to a equivalent Record (a key/value pair object). Map keys must be of type acceptable by Record constructor, which are string, number or symbol.

<b>Signature:</b>

```typescript
function mapToRecord<K extends string | number | symbol>(map: Map<K, any>, properties?: string[]): Record<K, any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  map | `Map<K, any>` | The Map to conver to Record |
|  properties | `string[]` | (optional) properties to pick from the second item of the Map's elements. |

<b>Returns:</b>

`Record<K, any>`

a new Record from Map

