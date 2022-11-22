[Home](../index.md) &gt; [virtualOpMeta](./virtualopmeta.md)

# Type virtualOpMeta

OpMeta-like type

<b>Signature:</b>

```typescript
type virtualOpMeta = {
    name: string;
    outputs: (opcode: number, operand: number) => number;
    inputs: (opcode: number, operand: number) => number;
    description?: string;
    aliases?: string[];
    data?: any;
};
```
