[Home](../index.md) &gt; [npParse](./npparse_1.md)

# Function npParse()

Parse a text using NP bytecode

<b>Signature:</b>

```typescript
function npParse(text: string, deployedBytecode: BytesLike, entrypoints: number, options?: {
    abi?: any;
    evm?: EVM;
    minOutputs?: number[];
}): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | the text to parse |
|  deployedBytecode | `BytesLike` | The NP contract deployed bytecode |
|  entrypoints | `number` | The number of entrypoints |
|  options | <pre>{&#010;    abi?: any;&#010;    evm?: EVM;&#010;    minOutputs?: number[];&#010;}</pre> | options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A Promise that resolves with ExpressionConfig or rejects with NPError

