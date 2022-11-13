[Home](../index.md) &gt; [extractFromRecord](./extractfromrecord_1.md)

# Function extractFromRecord()

Extract some of the properties from a Record as new Record with same keys.

<b>Signature:</b>

```typescript
function extractFromRecord<T extends string | number | symbol>(record: Record<T, any>, properties: string | string[]): Record<T, any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  record | `Record<T, any>` | the record to extract from. |
|  properties | `string \| string[]` | name of the properties in value item of the key/va;ue pair of a Record object |

<b>Returns:</b>

`Record<T, any>`

a new Record i.e. a new key/value pair object

