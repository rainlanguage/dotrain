[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [Rainlang](./rainlang_1.md)

# Function Compile.Rainlang()

Rain Language Compiler, compiles a text into valid ExpressionConfig

<b>Signature:</b>

```typescript
function Rainlang(text: string, bytecode: string, entrypoints: number, options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  bytecode | `string` | ExpressionDeployerNP deployed bytecode |
|  entrypoints | `number` | The number of entrypoints |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with NPError

