[Home](../index.md) &gt; [RDOpNode](./rdopnode.md)

# Type RDOpNode

Type of RainDocument's Opcode node

<b>Signature:</b>

```typescript
type RDOpNode = {
    opcode: {
        name: string;
        description: string;
        position: RDPosition;
    };
    operand: number;
    output: number;
    position: RDPosition;
    parens: RDPosition;
    parameters: RDNode[];
    operandArgs?: {
        position: RDPosition;
        args: {
            value: number;
            name: string;
            position: RDPosition;
            description?: string;
        }[];
    };
    lhs?: RDAliasNode[];
};
```
