[Home](../index.md) &gt; [ClientCapabilities](./clientcapabilities.md)

# Interface ClientCapabilities

Describes what LSP capabilities the client supports

<b>Signature:</b>

```typescript
interface ClientCapabilities 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [textDocument](./clientcapabilities.md#textDocument-property) | <pre>{&#010;    completion?: {&#010;        completionItem?: {&#010;            documentationFormat?: MarkupKind[];&#010;        };&#010;    };&#010;    hover?: {&#010;        contentFormat?: MarkupKind[];&#010;    };&#010;}</pre> | The text document client capabilities |

## Property Details

<a id="textDocument-property"></a>

### textDocument

The text document client capabilities

<b>Signature:</b>

```typescript
textDocument?: {
        completion?: {
            completionItem?: {
                documentationFormat?: MarkupKind[];
            };
        };
        hover?: {
            contentFormat?: MarkupKind[];
        };
    };
```
