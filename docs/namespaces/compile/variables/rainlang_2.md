[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [Rainlang](./rainlang_2.md)

# Function Compile.Rainlang()

Rain Language Compiler, compiles a text into valid ExpressionConfig

<b>Signature:</b>

```typescript
function Rainlang(text: string, bytecodeHash: string, entrypoints: number, options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  text | `string` | The raw string to compile |
|  bytecodeHash | `string` | The ExpressionDeployerNP deployed bytecode meta hash |
|  entrypoints | `number` | The number of entrypoints |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with problems found in text

