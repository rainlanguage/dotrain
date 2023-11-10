[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [NamespaceNode](./namespacenode.md)

# Type AST.NamespaceNode

Type for a namespace node

<b>Signature:</b>

```typescript
type NamespaceNode = {
        Hash: string;
        ImportIndex: number;
        Element: Meta.Authoring | Meta.Authoring[] | Binding | ContextAlias;
    };
```
