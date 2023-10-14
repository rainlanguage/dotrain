[Home](../index.md) &gt; [searchNamespace](./searchnamespace_1.md)

# Function searchNamespace()

Search in a Namespace for a given name

<b>Signature:</b>

```typescript
function searchNamespace(name: string, namespace: AST.Namespace): {
    child: AST.Namespace | AST.NamespaceNode;
    parent: AST.Namespace;
};
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | `string` | The name |
|  namespace | [AST.Namespace](../namespaces/ast/types/namespace.md) | The Namespace |

<b>Returns:</b>

`{
    child: AST.Namespace | AST.NamespaceNode;
    parent: AST.Namespace;
}`

An object that contains the found item and the parent namespace

