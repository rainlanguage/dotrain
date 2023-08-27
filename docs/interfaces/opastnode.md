[Home](../index.md) &gt; [OpASTNode](./opastnode.md)

# Interface OpASTNode

Type for Rainlang AST Opcode node

<b>Signature:</b>

```typescript
interface OpASTNode 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [isCtx](./opastnode.md#isCtx-property) | `boolean` |  |
|  [lhsAlias](./opastnode.md#lhsAlias-property) | `AliasASTNode[]` |  |
|  [opcode](./opastnode.md#opcode-property) | <pre>{&#010;    name: string;&#010;    description: string;&#010;    position: PositionOffset;&#010;}</pre> |  |
|  [operand](./opastnode.md#operand-property) | `number` |  |
|  [operandArgs](./opastnode.md#operandArgs-property) | <pre>{&#010;    position: PositionOffset;&#010;    args: {&#010;        value: string;&#010;        name: string;&#010;        position: PositionOffset;&#010;        description: string;&#010;    }[];&#010;}</pre> |  |
|  [output](./opastnode.md#output-property) | `number` |  |
|  [parameters](./opastnode.md#parameters-property) | `ASTNode[]` |  |
|  [parens](./opastnode.md#parens-property) | [PositionOffset](../types/positionoffset.md) |  |
|  [position](./opastnode.md#position-property) | [PositionOffset](../types/positionoffset.md) |  |

## Property Details

<a id="isCtx-property"></a>

### isCtx

<b>Signature:</b>

```typescript
isCtx?: boolean;
```

<a id="lhsAlias-property"></a>

### lhsAlias

<b>Signature:</b>

```typescript
lhsAlias?: AliasASTNode[];
```

<a id="opcode-property"></a>

### opcode

<b>Signature:</b>

```typescript
opcode: {
        name: string;
        description: string;
        position: PositionOffset;
    };
```

<a id="operand-property"></a>

### operand

<b>Signature:</b>

```typescript
operand: number;
```

<a id="operandArgs-property"></a>

### operandArgs

<b>Signature:</b>

```typescript
operandArgs?: {
        position: PositionOffset;
        args: {
            value: string;
            name: string;
            position: PositionOffset;
            description: string;
        }[];
    };
```

<a id="output-property"></a>

### output

<b>Signature:</b>

```typescript
output: number;
```

<a id="parameters-property"></a>

### parameters

<b>Signature:</b>

```typescript
parameters: ASTNode[];
```

<a id="parens-property"></a>

### parens

<b>Signature:</b>

```typescript
parens: PositionOffset;
```

<a id="position-property"></a>

### position

<b>Signature:</b>

```typescript
position: PositionOffset;
```
