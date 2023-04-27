[Home](../index.md) &gt; [RainParseState](./rainparsestate.md)

# Type RainParseState

Type of RainParser state

<b>Signature:</b>

```typescript
type RainParseState = {
    parse: {
        tree: RDNode[];
        aliases: RDAliasNode[];
    };
    track: {
        char: number;
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    runtimeError: Error | undefined;
};
```
