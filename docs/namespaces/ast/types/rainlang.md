[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [Rainlang](./rainlang.md)

# Type AST.Rainlang

Type of a Rainlang AST

<b>Signature:</b>

```typescript
type Rainlang = {
        lines: {
            nodes: Node[];
            position: Offsets;
            aliases: Alias[];
        }[];
        position: Offsets;
    }[];
```
