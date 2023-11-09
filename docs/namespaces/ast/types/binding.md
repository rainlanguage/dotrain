[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [Binding](./binding.md)

# Type AST.Binding

Type for a binding (named expressions)

<b>Signature:</b>

```typescript
type Binding = {
        name: string;
        namePosition: Offsets;
        content: string;
        contentPosition: Offsets;
        position: Offsets;
        problems: Problem[];
        dependencies: string[];
        elided?: string;
        constant?: string;
        exp?: RL;
    };
```
