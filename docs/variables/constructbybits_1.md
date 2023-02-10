[Home](../index.md) &gt; [constructByBits](./constructbybits_1.md)

# Function constructByBits()

Method to construct the operand from operand args

<b>Signature:</b>

```typescript
function constructByBits(args: {
    value: number;
    bits: [number, number];
    computation?: string;
    validRange?: ([number] | [number, number])[];
    computationVar?: string;
}[]): number | number[];
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  args | <pre>{&#010;    value: number;&#010;    bits: [number, number];&#010;    computation?: string;&#010;    validRange?: ([number] \| [number, number])[];&#010;    computationVar?: string;&#010;}[]</pre> | Operand arguments |

<b>Returns:</b>

`number | number[]`

operand value

