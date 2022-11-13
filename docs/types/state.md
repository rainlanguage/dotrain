[Home](../index.md) &gt; [State](./state.md)

# Type State

Type of Parser's State

<b>Signature:</b>

```typescript
type State = {
    parse: {
        tree: Node[];
        moCache: (Op | Value)[][];
    };
    track: {
        notation: number[];
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
    ambiguity: boolean;
};
```
