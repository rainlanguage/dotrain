[Home](../index.md) &gt; [IOpMeta](./iopmeta.md)

# Type IOpMeta


<b>Signature:</b>

```typescript
type IOpMeta = {
    enum: number;
    name: string;
    pushes: (opcode: number, operand: number) => number;
    pops: (opcode: number, operand: number) => number;
    isZeroOperand: boolean;
    description?: string;
    aliases?: string[];
    data?: any;
};
```
