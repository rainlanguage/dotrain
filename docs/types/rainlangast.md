[Home](../index.md) &gt; [RainlangAST](./rainlangast.md)

# Type RainlangAST

Type of a Rainlang AST

<b>Signature:</b>

```typescript
type RainlangAST = {
    lines: {
        nodes: ASTNode[];
        position: PositionOffset;
        aliases: AliasASTNode[];
    }[];
};
```
