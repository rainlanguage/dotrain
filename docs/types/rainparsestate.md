[Home](../index.md) &gt; [RainParseState](./rainparsestate.md)

# Type RainParseState

Type of Parser's State

<b>Signature:</b>

```typescript
type RainParseState = {
    parse: {
        tree: RDNode[];
        expAliases: RDAliasNode[][];
        subExpAliases: RDAliasNode[];
    };
    track: {
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    operandArgsErr: boolean;
    runtimeError: Error | undefined;
};
```
