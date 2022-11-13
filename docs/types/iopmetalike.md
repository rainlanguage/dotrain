[Home](../index.md) &gt; [iOpMetaLike](./iopmetalike.md)

# Type iOpMetaLike

OpMeta-like type

<b>Signature:</b>

```typescript
type iOpMetaLike = {
    name: string;
    pushes: (opcode: number, operand: number) => number;
    pops: (opcode: number, operand: number) => number;
    description?: string;
    aliases?: string[];
    data?: any;
};
```
