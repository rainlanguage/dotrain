[Home](../index.md) &gt; [OpMeta](./opmeta.md)

# Type OpMeta

Type Definitions for opcodes metadata used by RainLang.

<b>Signature:</b>

```typescript
type OpMeta = {
    name: string;
    desc: string;
    operand: OperandMeta;
    inputs: InputMeta;
    outputs: OutputMeta;
    aliases?: string[];
};
```
