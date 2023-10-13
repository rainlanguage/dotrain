[Home](../index.md) &gt; [namespaceSearch](./namespacesearch_1.md)

# Function namespaceSearch()

Search in a Namespace for a given name

<b>Signature:</b>

```typescript
function namespaceSearch(name: string, namespace: Namespace): {
    child: Namespace | NamespaceNode;
    parent: Namespace;
};
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | `string` | The name |
|  namespace | [Namespace](../types/namespace.md) | The Namespace |

<b>Returns:</b>

`{
    child: Namespace | NamespaceNode;
    parent: Namespace;
}`

An object that contains the found item and the parent namespace

