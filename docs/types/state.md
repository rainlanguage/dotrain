[Home](../index.md) &gt; [State](./state.md)

# Type State

Type of Parser's State

<b>Signature:</b>

```typescript
type State = {
    parse: {
        tree: Node[];
        aliases: Tag[][];
        subExpAliases: Tag[];
    };
    track: {
        parens: {
            open: number[];
            close: number[];
        };
    };
    depthLevel: number;
};
```
