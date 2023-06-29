[Home](../index.md) &gt; [NamedExpression](./namedexpression.md)

# Type NamedExpression

Type for a named expression

<b>Signature:</b>

```typescript
type NamedExpression = {
    name: string;
    namePosition: PositionOffset;
    content: string;
    contentPosition: PositionOffset;
    position: PositionOffset;
    rainlang?: Rainlang;
};
```
