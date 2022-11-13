[Home](../index.md) &gt; [Op](./op.md)

# Type Op

Type of Parser's Opcode node

<b>Signature:</b>

```typescript
type Op = {
    opcode: {
        name: string;
        position: number[];
    };
    operand: number;
    output: number;
    position: number[];
    parens: number[];
    parameters: Node[];
    data?: any;
    error?: string;
    infixOp?: boolean;
};
```
