[Home](../index.md) &gt; [execBytecode](./execbytecode_1.md)

# Function execBytecode()

Executes a contract bytecode given the contract abi, fnunction name and args

<b>Signature:</b>

```typescript
function execBytecode(bytecode: BytesLike, abi: any, fn: string, args: any[], evm?: EVM): Promise<utils.Result>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  bytecode | `BytesLike` | The contract deployed byetcode |
|  abi | `any` | The contract ABI |
|  fn | `string` | The contract function name |
|  args | `any[]` | The function args |
|  evm | `EVM` | (optional) An EVM instance |

<b>Returns:</b>

`Promise<utils.Result>`

A promise that resolves with a execution returned value or rejects if an exception error

