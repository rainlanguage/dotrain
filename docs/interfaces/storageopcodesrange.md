[Home](../index.md) &gt; [StorageOpcodesRange](./storageopcodesrange.md)

# Interface StorageOpcodesRange

Interface for accessible by vm storage's slots range available for a contract to be used as local opcodes.

<b>Signature:</b>

```typescript
interface StorageOpcodesRange 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [length](./storageopcodesrange.md#length-property) | `BigNumberish` | Length of the storage opcodes of a contract, i.e. the number of local opcodes |
|  [pointer](./storageopcodesrange.md#pointer-property) | `BigNumberish` | pointer to the storage slot of the first property of properties of a contract used as STORAGE opcode. |

## Property Details

<a id="length-property"></a>

### length

Length of the storage opcodes of a contract, i.e. the number of local opcodes

<b>Signature:</b>

```typescript
length: BigNumberish;
```

<a id="pointer-property"></a>

### pointer

pointer to the storage slot of the first property of properties of a contract used as STORAGE opcode.

<b>Signature:</b>

```typescript
pointer: BigNumberish;
```
