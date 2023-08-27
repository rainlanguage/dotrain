[Home](../index.md) &gt; [Import](./import.md)

# Interface Import

Type of import statements specified in a RainDocument

<b>Signature:</b>

```typescript
interface Import 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [hash](./import.md#hash-property) | `string` |  |
|  [hashPosition](./import.md#hashPosition-property) | [PositionOffset](../types/positionoffset.md) |  |
|  [name](./import.md#name-property) | `string` |  |
|  [namePosition](./import.md#namePosition-property) | [PositionOffset](../types/positionoffset.md) |  |
|  [position](./import.md#position-property) | [PositionOffset](../types/positionoffset.md) |  |
|  [problems](./import.md#problems-property) | `Problem[]` |  |
|  [reconfigs](./import.md#reconfigs-property) | `[ParsedChunk, ParsedChunk][]` |  |
|  [sequence](./import.md#sequence-property) | <pre>{&#010;    opmeta?: OpMeta[];&#010;    ctxmeta?: ContextAlias[];&#010;    dotrain?: RainDocument;&#010;}</pre> |  |

## Property Details

<a id="hash-property"></a>

### hash

<b>Signature:</b>

```typescript
hash: string;
```

<a id="hashPosition-property"></a>

### hashPosition

<b>Signature:</b>

```typescript
hashPosition: PositionOffset;
```

<a id="name-property"></a>

### name

<b>Signature:</b>

```typescript
name: string;
```

<a id="namePosition-property"></a>

### namePosition

<b>Signature:</b>

```typescript
namePosition: PositionOffset;
```

<a id="position-property"></a>

### position

<b>Signature:</b>

```typescript
position: PositionOffset;
```

<a id="problems-property"></a>

### problems

<b>Signature:</b>

```typescript
problems: Problem[];
```

<a id="reconfigs-property"></a>

### reconfigs

<b>Signature:</b>

```typescript
reconfigs?: [ParsedChunk, ParsedChunk][];
```

<a id="sequence-property"></a>

### sequence

<b>Signature:</b>

```typescript
sequence?: {
        opmeta?: OpMeta[];
        ctxmeta?: ContextAlias[];
        dotrain?: RainDocument;
    };
```
