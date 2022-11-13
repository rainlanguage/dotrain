[Home](../index.md) &gt; [AllStandardOps](./allstandardops.md)

# Enum AllStandardOps

All the standard Op Codes

<b>Signature:</b>

```typescript
enum AllStandardOps 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  ADD | `33` | Opcode for addition. |
|  ANY | `23` | Opcode for ANY. |
|  BLOCK\_NUMBER | `14` | Opcode for the block number. |
|  BLOCK\_TIMESTAMP | `17` | Opcode for the block timestamp. |
|  CONSTANT | `0` | Copies a value either off `constants` or `arguments` to the top of the stack. arguments will go at the end of the constants array. |
|  CONTEXT | `2` | stacks an item of the contextual array of values of an underlying contract passed by caller when calling the contract's methods. operand is the index to access the desired item in the array. |
|  DEBUG | `5` | ABI encodes the entire stack and logs it to the hardhat console. |
|  DIV | `34` | Opcode for division |
|  EAGER\_IF | `24` | Eager because BOTH x\_ and y\_ must be eagerly evaluated before EAGER\_IF will select one of them. If both x\_ and y\_ are cheap (e.g. constant values) then this may also be the simplest and cheapest way to select one of them. If either x\_ or y\_ is expensive consider using the conditional form of OP\_SKIP to carefully avoid it instead. |
|  EQUAL\_TO | `25` | Opcode for EQUAL\_TO. |
|  EVERY | `26` | Opcode for EVERY. |
|  EXP | `35` | Opcode for exponentiation. |
|  GREATER\_THAN | `27` | Opcode for GREATER\_THAN. |
|  IERC1155\_BALANCE\_OF | `12` | Opcode for `IERC1155` `balanceOf`<!-- -->. |
|  IERC1155\_BALANCE\_OF\_BATCH | `13` | Number of provided opcodes for `IERC1155Ops`<!-- -->. |
|  IERC20\_BALANCE\_OF | `6` | Opcode for `IERC20` `balanceOf`<!-- -->. |
|  IERC20\_SNAPSHOT\_BALANCE\_OF\_AT | `8` | Opcode for `IERC20` use an Snapshot `balanceOfAt`<!-- -->. |
|  IERC20\_SNAPSHOT\_TOTAL\_SUPPLY\_AT | `9` | Opcode for `IERC20` use an Snapshot `totalSupplyAt`<!-- -->. |
|  IERC20\_TOTAL\_SUPPLY | `7` | Opcode for `IERC20` `totalSupply`<!-- -->. |
|  IERC721\_BALANCE\_OF | `10` | Opcode for `IERC721` `balanceOf`<!-- -->. |
|  IERC721\_OWNER\_OF | `11` | Number of provided opcodes for `IERC721Ops`<!-- -->. |
|  ISZERO | `28` | Opcode for ISZERO. |
|  ITIERV2\_REPORT | `41` | Opcode to call `report` on an `ITierV2` contract. |
|  ITIERV2\_REPORT\_TIME\_FOR\_TIER | `42` | Opcode to call `reportTimeForTier` on an `ITierV2` contract. |
|  length | `46` | length of available opcodes |
|  LESS\_THAN | `29` | Opcode for LESS\_THAN. |
|  MAX | `36` | Opcode for maximum. |
|  MIN | `37` | Opcode for minimum. |
|  MOD | `38` | Opcode for modulo. |
|  MUL | `39` | Opcode for multiplication. |
|  SATURATING\_ADD | `30` | Opcode for saturating addition. |
|  SATURATING\_DIFF | `43` | Opcode to calculate the tierwise diff of two reports. |
|  SATURATING\_MUL | `31` | Opcode for saturating multiplication. |
|  SATURATING\_SUB | `32` | Opcode for saturating subtraction. |
|  SCALE\_BY | `21` | Opcode to rescale an arbitrary fixed point number by some OOMs. |
|  SCALE18 | `18` | Opcode to rescale some fixed point number to 18 OOMs in situ. |
|  SCALE18\_DIV | `19` | Opcode for division. |
|  SCALE18\_MUL | `20` | Opcode for multiplication. |
|  SCALEN | `22` | Opcode to rescale an 18 OOMs fixed point number to scale N. |
|  SELECT\_LTE | `44` | Opcode to tierwise select the best block lte a reference block. |
|  SENDER | `15` | Opcode for the `msg.sender`<!-- -->. |
|  STACK | `1` | Duplicates any value in the stack to the top of the stack. The operand specifies the index to copy from. |
|  STORAGE | `3` | used as local opcodes i.e. opcodes to stack the contract's storage contents i.e. porperties/variables. operand determines the storage location to be stacked. |
|  SUB | `40` | Opcode for subtraction. |
|  THIS\_ADDRESS | `16` | Opcode for `this` address of the current contract. |
|  UPDATE\_TIMES\_FOR\_TIER\_RANGE | `45` | Opcode to update the timestamp over a range of tiers for a report. |
|  ZIPMAP | `4` | Takes N values off the stack, interprets them as an array then zips and maps a source from `sources` over them. The source has access to the original constants using `1 0` and to zipped arguments as `1 1`<!-- -->. |

