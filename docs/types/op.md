[Home](../index.md) &gt; [Op](./op.md)

# Type Op

Type of Parser's Opcode node

<b>Signature:</b>

```typescript
type Op = {
    opcode: {
        name: string;
        description: string;
        position: Position;
    };
    operand: number;
    output: number;
    position: Position;
    parens: Position;
    parameters: Node[];
    operandArgs?: {
        position: Position;
        args: {
            value: number;
            name: string;
            position: Position;
            description?: string;
        }[];
    };
    tags?: Tag[];
};
```
