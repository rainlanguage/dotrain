[Home](../../../index.md) &gt; [Compile](../../compile.md) &gt; [Rainlang](./rainlang_3.md)

# Function Compile.Rainlang()

Rain Language Compiler, compiles a rainlang instance into valid ExpressionConfig

<b>Signature:</b>

```typescript
function Rainlang(rainlang: RL, entrypoints: number, options?: Options): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainlang | `RL` | The Rainlang instance |
|  entrypoints | `number` | The number of entrypoints |
|  options | [Options](../types/options.md) | (optional) Compiler options |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with problems found in text

