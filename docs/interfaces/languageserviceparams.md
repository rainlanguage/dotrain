[Home](../index.md) &gt; [LanguageServiceParams](./languageserviceparams.md)

# Interface LanguageServiceParams

Parameters for initiating Language Services

<b>Signature:</b>

```typescript
interface LanguageServiceParams 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientCapabilities](./languageserviceparams.md#clientCapabilities-property) | [ClientCapabilities](./clientcapabilities.md) | Describes the LSP capabilities the client supports. |
|  [metaStore](./languageserviceparams.md#metaStore-property) | [MetaStore](../classes/metastore.md) | Object that keeps cache of metas |

## Property Details

<a id="clientCapabilities-property"></a>

### clientCapabilities

Describes the LSP capabilities the client supports.

<b>Signature:</b>

```typescript
clientCapabilities?: ClientCapabilities;
```

<a id="metaStore-property"></a>

### metaStore

Object that keeps cache of metas

<b>Signature:</b>

```typescript
metaStore?: MetaStore;
```
