[Home](../index.md) &gt; [ParseTree](./parsetree.md)

# Type ParseTree

Type of a parse tree object

<b>Signature:</b>

```typescript
type ParseTree = Record<number, {
    tree: Node[];
    position: Position;
}>;
```
