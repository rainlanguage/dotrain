[Home](../index.md) &gt; [Opcode](./opcode.md)

# Interface Opcode

<b>Signature:</b>

```typescript
interface Opcode 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [isCtx](./opcode.md#isCtx-property) | `[number, number \| undefined] \| undefined` |  |
|  [lhsAlias](./opcode.md#lhsAlias-property) | `Alias[]` |  |
|  [opcode](./opcode.md#opcode-property) | [OpcodeDetails](./opcodedetails.md) |  |
|  [operand](./opcode.md#operand-property) | `number \| undefined` |  |
|  [operandArgs](./opcode.md#operandArgs-property) | [OperandArg](./operandarg.md) |  |
|  [output](./opcode.md#output-property) | `number \| undefined` |  |
|  [parameters](./opcode.md#parameters-property) | `Node[]` |  |
|  [parens](./opcode.md#parens-property) | [Offsets](../types/offsets.md) |  |
|  [position](./opcode.md#position-property) | [Offsets](../types/offsets.md) |  |

## Property Details

<a id="isCtx-property"></a>

### isCtx

<b>Signature:</b>

```typescript
isCtx: [number, number | undefined] | undefined;
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
opcode: OpcodeDetails;
```

<a id="operand-property"></a>

### operand

<b>Signature:</b>

```typescript
operand: number | undefined;
```

<a id="operandArgs-property"></a>

### operandArgs

<b>Signature:</b>

```typescript
operandArgs?: OperandArg;
```

<a id="output-property"></a>

### output

<b>Signature:</b>

```typescript
output: number | undefined;
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
