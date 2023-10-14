[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [Import](./import.md)

# Interface AST.Import

Type of import statements specified in a RainDocument

<b>Signature:</b>

```typescript
interface Import 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [hash](./import.md#hash-property) | `string` |  |
|  [hashPosition](./import.md#hashPosition-property) | [Offsets](../types/offsets.md) |  |
|  [name](./import.md#name-property) | `string` |  |
|  [namePosition](./import.md#namePosition-property) | [Offsets](../types/offsets.md) |  |
|  [position](./import.md#position-property) | [Offsets](../types/offsets.md) |  |
|  [problems](./import.md#problems-property) | `Problem[]` |  |
|  [reconfigProblems](./import.md#reconfigProblems-property) | `Problem[]` |  |
|  [reconfigs](./import.md#reconfigs-property) | `[ParsedChunk, ParsedChunk][]` |  |
|  [sequence](./import.md#sequence-property) | <pre>{&#010;    dispair?: {&#010;        bytecode: string;&#010;        authoringMeta?: Meta.Authoring[];&#010;    };&#010;    ctxmeta?: ContextAlias[];&#010;    dotrain?: RainDocument;&#010;}</pre> |  |

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
hashPosition: Offsets;
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
namePosition: Offsets;
```

<a id="position-property"></a>

### position

<b>Signature:</b>

```typescript
position: Offsets;
```

<a id="problems-property"></a>

### problems

<b>Signature:</b>

```typescript
problems: Problem[];
```

<a id="reconfigProblems-property"></a>

### reconfigProblems

<b>Signature:</b>

```typescript
reconfigProblems?: Problem[];
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
            dispair?: {
                bytecode: string;
                authoringMeta?: Meta.Authoring[];
            };
            ctxmeta?: ContextAlias[];
            dotrain?: RainDocument;
        };
```
