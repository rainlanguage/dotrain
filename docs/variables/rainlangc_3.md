[Home](../index.md) &gt; [rainlangc](./rainlangc_3.md)

# Function rainlangc()

Rain Language Compiler (rainlangc), compiles a rainlang instance into valid ExpressionConfig (deployable bytes)

<b>Signature:</b>

```typescript
function rainlangc(rainlang: Rainlang): Promise<ExpressionConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  rainlang | [Rainlang](../classes/rainlang.md) | The Rainlang instance |

<b>Returns:</b>

`Promise<ExpressionConfig>`

A promise that resolves with ExpressionConfig and rejects with problems found in text

