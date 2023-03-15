[Home](../index.md) &gt; [getOpMetaFromSg](./getopmetafromsg_1.md)

# Function getOpMetaFromSg()

Get the op meta from sg

<b>Signature:</b>

```typescript
function getOpMetaFromSg(deployerAddress: string, chainId?: number): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  deployerAddress | `string` | The address of the deployer to get the op met from its emitted DISpair event |
|  chainId | `number` | The chain id of the network where the deployer is deployed at. default is Mumbai network |

<b>Returns:</b>

`Promise<string>`

The op meta bytes

