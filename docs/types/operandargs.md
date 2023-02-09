[Home](../index.md) &gt; [OperandArgs](./operandargs.md)

# Type OperandArgs

Data type for computed operand that consists of some arguments

<b>Signature:</b>

```typescript
type OperandArgs = {
    bits: [number, number];
    name: "inputs" | string;
    desc?: string;
    computation?: string;
    validRange?: ([number] | [number, number])[];
}[];
```
