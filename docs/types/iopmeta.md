[Home](../index.md) &gt; [IOpMeta](./iopmeta.md)

# Type IOpMeta


<b>Signature:</b>

```typescript
type IOpMeta = {
    enum: number;
    name: string;
    outputs: IOpIO;
    inputs: IOpIO;
    operand: IOperand;
    paramsValidRange: ParamsValidRange;
    description?: string;
    aliases?: string[];
    data?: any;
};
```
