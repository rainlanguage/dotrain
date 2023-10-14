[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [RainlangAST](./rainlangast.md)

# Type AST.RainlangAST

Type of a Rainlang AST

<b>Signature:</b>

```typescript
type RainlangAST = {
        lines: {
            nodes: Node[];
            position: Offsets;
            aliases: Alias[];
        }[];
        position: Offsets;
    }[];
```
