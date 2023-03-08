[Home](../index.md) &gt; [getOpMetaFromSg](./getopmetafromsg_2.md)

# Function getOpMetaFromSg()

Get the op meta from sg

<b>Signature:</b>

```typescript
function getOpMetaFromSg(deployerAddress: string, sgUrl: string): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  deployerAddress | `string` | The address of the deployer to get the op met from its emitted DISpair event |
|  sgUrl | `string` | The subgraph endpoint URL to query from |

<b>Returns:</b>

`Promise<string>`

The op meta bytes

