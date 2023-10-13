[Home](../index.md) &gt; [ValueASTNode](./valueastnode.md)

# Interface ValueASTNode

Type Rainlang AST Value node

<b>Signature:</b>

```typescript
interface ValueASTNode 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [id](./valueastnode.md#id-property) | `string` |  |
|  [lhsAlias](./valueastnode.md#lhsAlias-property) | `AliasASTNode[]` |  |
|  [position](./valueastnode.md#position-property) | [PositionOffset](../types/positionoffset.md) |  |
|  [value](./valueastnode.md#value-property) | `string` |  |

## Property Details

<a id="id-property"></a>

### id

<b>Signature:</b>

```typescript
id?: string;
```

<a id="lhsAlias-property"></a>

### lhsAlias

<b>Signature:</b>

```typescript
lhsAlias?: AliasASTNode[];
```

<a id="position-property"></a>

### position

<b>Signature:</b>

```typescript
position: PositionOffset;
```

<a id="value-property"></a>

### value

<b>Signature:</b>

```typescript
value: string;
```
