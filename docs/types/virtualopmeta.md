[Home](../index.md) &gt; [virtualOpMeta](./virtualopmeta.md)

# Type virtualOpMeta

OpMeta-like type

<b>Signature:</b>

```typescript
type virtualOpMeta = {
    name: string;
    pushes: (opcode: number, operand: number) => number;
    pops: (opcode: number, operand: number) => number;
    description?: string;
    aliases?: string[];
    data?: any;
};
```
