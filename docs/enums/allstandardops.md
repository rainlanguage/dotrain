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
|  ADD | `38` | Opcode for addition. |
|  ANY | `28` | Opcode for ANY. |
|  BLOCK\_NUMBER | `18` | Opcode for the block number. |
|  BLOCK\_TIMESTAMP | `21` | Opcode for the block timestamp. |
|  CALL | `1` | Execute a source with some inputs taken from the main stack and put the outputs back into the stack. |
|  CALLER | `19` | Opcode for the `msg.sender`<!-- -->. |
|  CHAINLINK\_PRICE | `0` | Get price from Chainlink Oracle |
|  CONTEXT | `2` | stacks an item of the contextual 2D array of values of an underlying contract passed by caller when calling the contract's methods. operand is 2 bytes, each used to index 2D array to access the desired item. |
|  DEBUG | `3` | ABI encodes the entire stack and logs it to the hardhat console. |
|  DIV | `39` | Opcode for division |
|  DO\_WHILE | `4` | Execute a source until a condition is no longer true |
|  EAGER\_IF | `29` | Eager because BOTH x\_ and y\_ must be eagerly evaluated before EAGER\_IF will select one of them. If both x\_ and y\_ are cheap (e.g. constant values) then this may also be the simplest and cheapest way to select one of them. If either x\_ or y\_ is expensive consider using the conditional form of OP\_SKIP to carefully avoid it instead. |
|  ENSURE | `17` | Require item(s) ot be true or revert, i.e. greater than zero |
|  EQUAL\_TO | `30` | Opcode for EQUAL\_TO. |
|  ERC20\_BALANCE\_OF | `9` | Opcode for `IERC20` `balanceOf`<!-- -->. |
|  ERC20\_SNAPSHOT\_BALANCE\_OF\_AT | `11` | Opcode for `IERC20` use an Snapshot `balanceOfAt`<!-- -->. |
|  ERC20\_SNAPSHOT\_TOTAL\_SUPPLY\_AT | `12` | Opcode for `IERC20` use an Snapshot `totalSupplyAt`<!-- -->. |
|  ERC20\_TOTAL\_SUPPLY | `10` | Opcode for `IERC20` `totalSupply`<!-- -->. |
|  EVERY | `31` | Opcode for EVERY. |
|  EXP | `40` | Opcode for exponentiation. |
|  EXPLODE32 | `22` | Splite an uint256 value into 8 seperate 1 byte size values as uint256 each. |
|  GREATER\_THAN | `32` | Opcode for GREATER\_THAN. |
|  HASH | `8` | Hash (solidty kecca256) item(s) of the stack |
|  IERC1155\_BALANCE\_OF | `15` | Opcode for `IERC1155` `balanceOf`<!-- -->. |
|  IERC1155\_BALANCE\_OF\_BATCH | `16` | Number of provided opcodes for `IERC1155Ops`<!-- -->. |
|  IERC721\_BALANCE\_OF | `13` | Opcode for `IERC721` `balanceOf`<!-- -->. |
|  IERC721\_OWNER\_OF | `14` | Number of provided opcodes for `IERC721Ops`<!-- -->. |
|  ISALEV2\_REMAINING\_TOKEN\_INVENTORY | `46` | Put the remaining number of rTKNs of a SaleV2 into the stack. in order words the balance of rTKN of the SaleV2 contract |
|  ISALEV2\_RESERVE | `47` | Address of the reserve of a SaleV2 contract |
|  ISALEV2\_SALE\_STATUS | `48` | Status of the a SaleV2 contract, PENDING, LIVE etc |
|  ISALEV2\_TOKEN | `49` | Address of the rTKN of a SaleV2 contract |
|  ISALEV2\_TOTAL\_RESERVE\_RECEIVED | `50` | Put the total number of reserve tokens received by a SaleV2 into the stack. in order words the balance of reserve token of the SaleV2 contract |
|  ISZERO | `33` | Opcode for ISZERO. |
|  ITIERV2\_REPORT | `51` | Opcode to call `report` on an `ITierV2` contract. |
|  ITIERV2\_REPORT\_TIME\_FOR\_TIER | `52` | Opcode to call `reportTimeForTier` on an `ITierV2` contract. |
|  length | `56` | length of available opcodes |
|  LESS\_THAN | `34` | Opcode for LESS\_THAN. |
|  LOOP\_N | `5` | Loop over a source for n times |
|  MAX | `41` | Opcode for maximum. |
|  MIN | `42` | Opcode for minimum. |
|  MOD | `43` | Opcode for modulo. |
|  MUL | `44` | Opcode for multiplication. |
|  SATURATING\_ADD | `35` | Opcode for saturating addition. |
|  SATURATING\_DIFF | `53` | Opcode to calculate the tierwise diff of two reports. |
|  SATURATING\_MUL | `36` | Opcode for saturating multiplication. |
|  SATURATING\_SUB | `37` | Opcode for saturating subtraction. |
|  SCALE\_BY | `26` | Opcode to rescale an arbitrary fixed point number by some OOMs. |
|  SCALE18 | `23` | Opcode to rescale some fixed point number to 18 OOMs in situ. |
|  SCALE18\_DIV | `24` | Opcode for division. |
|  SCALE18\_MUL | `25` | Opcode for multiplication. |
|  SCALEN | `27` | Opcode to rescale an 18 OOMs fixed point number to scale N. |
|  SELECT\_LTE | `54` | Opcode to tierwise select the best block lte a reference block. |
|  STATE | `6` | Copies a value either off `stack` or `constants` to the top of the stack. |
|  STORAGE | `7` | used as local opcodes i.e. opcodes to stack the contract's storage contents i.e. porperties/variables. operand determines the storage location to be stacked. |
|  SUB | `45` | Opcode for subtraction. |
|  THIS\_ADDRESS | `20` | Opcode for `this` address of the current contract. |
|  UPDATE\_TIMES\_FOR\_TIER\_RANGE | `55` | Opcode to update the timestamp over a range of tiers for a report. |

