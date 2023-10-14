[Home](../../../index.md) &gt; [AST](../../ast.md) &gt; [Opcode](./opcode.md)

# Interface AST.Opcode

Type for Rainlang AST Opcode node

<b>Signature:</b>

```typescript
interface Opcode 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [isCtx](./opcode.md#isCtx-property) | `boolean` |  |
|  [lhsAlias](./opcode.md#lhsAlias-property) | `Alias[]` |  |
|  [opcode](./opcode.md#opcode-property) | <pre>{&#010;    name: string;&#010;    description: string;&#010;    position: Offsets;&#010;}</pre> |  |
|  [operand](./opcode.md#operand-property) | `number` |  |
|  [operandArgs](./opcode.md#operandArgs-property) | <pre>{&#010;    position: Offsets;&#010;    args: {&#010;        value: string;&#010;        name: string;&#010;        position: Offsets;&#010;        description: string;&#010;    }[];&#010;}</pre> |  |
|  [output](./opcode.md#output-property) | `number` |  |
|  [parameters](./opcode.md#parameters-property) | `Node[]` |  |
|  [parens](./opcode.md#parens-property) | [Offsets](../types/offsets.md) |  |
|  [position](./opcode.md#position-property) | [Offsets](../types/offsets.md) |  |

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
lhsAlias?: Alias[];
```

<a id="opcode-property"></a>

### opcode

<b>Signature:</b>

```typescript
opcode: {
            name: string;
            description: string;
            position: Offsets;
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
            position: Offsets;
            args: {
                value: string;
                name: string;
                position: Offsets;
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
parameters: Node[];
```

<a id="parens-property"></a>

### parens

<b>Signature:</b>

```typescript
parens: Offsets;
```

<a id="position-property"></a>

### position

<b>Signature:</b>

```typescript
position: Offsets;
```
