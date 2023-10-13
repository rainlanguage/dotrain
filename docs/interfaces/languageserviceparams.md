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
|  [noMetaSearch](./languageserviceparams.md#noMetaSearch-property) | `boolean` | If should not search for metas (for lang services except diagnostics) |

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

<a id="noMetaSearch-property"></a>

### noMetaSearch

If should not search for metas (for lang services except diagnostics)

<b>Signature:</b>

```typescript
noMetaSearch?: boolean;
```
