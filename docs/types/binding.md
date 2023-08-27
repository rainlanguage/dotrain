[Home](../index.md) &gt; [Binding](./binding.md)

# Type Binding

Type for a binding (named expressions)

<b>Signature:</b>

```typescript
type Binding = {
    name: string;
    namePosition: PositionOffset;
    content: string;
    contentPosition: PositionOffset;
    position: PositionOffset;
    problems: Problem[];
    dependencies: string[];
    elided?: string;
    constant?: string;
    exp?: Rainlang;
};
```
