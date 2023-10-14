[Home](../index.md) &gt; [execBytecode](./execbytecode_2.md)

# Function execBytecode()

Executes a bytecode with given data

<b>Signature:</b>

```typescript
function execBytecode(bytecode: BytesLike, data: BytesLike, evm?: EVM): Promise<Uint8Array>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  bytecode | `BytesLike` | The bytecode to execute |
|  data | `BytesLike` | The data |
|  evm | `EVM` | (optional) An EVM instance |

<b>Returns:</b>

`Promise<Uint8Array>`

The execution results as Uint8Array

