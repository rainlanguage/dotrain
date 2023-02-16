[Home](../index.md) &gt; [Op](./op.md)

# Type Op

Type of Parser's Opcode node

<b>Signature:</b>

```typescript
type Op = {
    opcode: {
        name: string;
        description: string;
        position: number[];
    };
    operand: number;
    output: number;
    position: number[];
    parens: number[];
    parameters: Node[];
    operandArgs?: {
        position: number[];
        args: {
            value: number;
            name: string;
            position: number[];
            description?: string;
        }[];
    };
    tags?: Tag[];
};
```
