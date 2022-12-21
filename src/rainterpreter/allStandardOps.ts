/**
 * @public
 * All the standard Op Codes
 */
export enum AllStandardOps {
      /**
       * Get price from Chainlink Oracle
       */
      CHAINLINK_PRICE,
      /**
       * Execute a source with some inputs taken from the main stack and put the outputs
       * back into the stack.
       */
      CALL,
      /**
       * stacks an item of the contextual 2D array of values of an underlying contract
       * passed by caller when calling the contract's methods. operand is 2 bytes, each 
       * used to index 2D array to access the desired item.
       */
      CONTEXT,
      /**
       * 
       */
      CONTEXT_ROW,
      /**
       * ABI encodes the entire stack and logs it to the hardhat console.
       */
      DEBUG,
      /**
       * Execute a source until a condition is no longer true
       */
      DO_WHILE,
      /**
       * 
       */
      FOLD_CONTEXT,
      /**
       * Loop over a source for n times
       */
      LOOP_N,
      /**
       * Copies a value either off `stack` or `constants` to the top of
       * the stack.
       */
      READ_MEMORY,
      /**
       * Opcode to write a key/value pair into storage
       */
      SET,
      /**
       * Hash (solidty kecca256) item(s) of the stack
       */
      HASH,
      /**
       * Opcode for `IERC20` `balanceOf`.
       */
      ERC20_BALANCE_OF,
      /**
       * Opcode for `IERC20` `totalSupply`.
       */
      ERC20_TOTAL_SUPPLY,
      /**
       * Opcode for `IERC20` use an Snapshot `balanceOfAt`.
       */
      ERC20_SNAPSHOT_BALANCE_OF_AT,
      /**
       * Opcode for `IERC20` use an Snapshot `totalSupplyAt`.
       */
      ERC20_SNAPSHOT_TOTAL_SUPPLY_AT,
      /**
       * Opcode for `IERC721` `balanceOf`.
       */
      IERC721_BALANCE_OF,
      /**
       * Number of provided opcodes for `IERC721Ops`.
       */
      IERC721_OWNER_OF,
      /**
       * Opcode for `IERC1155` `balanceOf`.
       */
      IERC1155_BALANCE_OF,
      /**
       * Number of provided opcodes for `IERC1155Ops`.
       */
      IERC1155_BALANCE_OF_BATCH,
      /**
       * Require item(s) ot be true or revert, i.e. greater than zero
       */
      ENSURE,
      /**
       * Opcode for the block number.
       */
      BLOCK_NUMBER,
      /**
       * Opcode for the `msg.sender`.
       */
      CALLER,
      /**
       * Opcode for `this` address of the current contract.
       */
      THIS_ADDRESS,
      /**
       * Opcode for the block timestamp.
       */
      BLOCK_TIMESTAMP,
      /**
       * Splite an uint256 value into 8 seperate 1 byte size values as uint256 each.
       */
      EXPLODE32,
      /**
       * Opcode to rescale some fixed point number to 18 OOMs in situ.
       */
      SCALE18,
      /**
       * Opcode for division.
       */
      SCALE18_DIV,
      /**
       * Opcode for multiplication.
       */
      SCALE18_MUL,
      /**
       * Opcode to rescale an arbitrary fixed point number by some OOMs.
       */
      SCALE_BY,
      /**
       * Opcode to rescale an 18 OOMs fixed point number to scale N.
       */
      SCALEN,
      /**
       * Opcode for ANY.
       */
      ANY,
      /**
       * Eager because BOTH x_ and y_ must be eagerly evaluated
       * before EAGER_IF will select one of them. If both x_ and y_
       * are cheap (e.g. constant values) then this may also be the
       * simplest and cheapest way to select one of them. If either
       * x_ or y_ is expensive consider using the conditional form
       * of OP_SKIP to carefully avoid it instead.
       */
      EAGER_IF,
      /**
       * Opcode for EQUAL_TO.
       */
      EQUAL_TO,
      /**
       * Opcode for EVERY.
       */
      EVERY,
      /**
       * Opcode for GREATER_THAN.
       */
      GREATER_THAN,
      /**
       * Opcode for ISZERO.
       */
      ISZERO,
      /**
       * Opcode for LESS_THAN.
       */
      LESS_THAN,
      /**
       * Opcode for saturating addition.
       */
      SATURATING_ADD,
      /**
       * Opcode for saturating multiplication.
       */
      SATURATING_MUL,
      /**
       * Opcode for saturating subtraction.
       */
      SATURATING_SUB,
      /**
       * Opcode for addition.
       */
      ADD,
      /**
       * Opcode for division
       */
      DIV,
      /**
       * Opcode for exponentiation.
       */
      EXP,
      /**
       * Opcode for maximum.
       */
      MAX,
      /**
       * Opcode for minimum.
       */
      MIN,
      /**
       * Opcode for modulo.
       */
      MOD,
      /**
       * Opcode for multiplication.
       */
      MUL,
      /**
       * Opcode for subtraction.
       */
      SUB,
      /**
       * Opcode to get balance of an orderbook vault
       */
      IORDERBOOKV1_VAULT_BALANCE,
      /**
       * Put the remaining number of rTKNs of a SaleV2 into the stack. in order words
       * the balance of rTKN of the SaleV2 contract
       */
      ISALEV2_REMAINING_TOKEN_INVENTORY,
      /**
       * Address of the reserve of a SaleV2 contract 
       */
      ISALEV2_RESERVE,
      /**
       * Status of the a SaleV2 contract, PENDING, LIVE etc
       */
      ISALEV2_SALE_STATUS,
      /**
       * Address of the rTKN of a SaleV2 contract
       */
      ISALEV2_TOKEN,
      /**
       * Put the total number of reserve tokens received by a SaleV2 into the stack. 
       * in order words the balance of reserve token of the SaleV2 contract
       */
      ISALEV2_TOTAL_RESERVE_RECEIVED,
      /**
       * Verify status of an account from an IVerifyV1 contract
       */
      IVERIFYV1_ACCOUNT_STATUS_AT_TIME,
      /**
       * Opcode to call `report` on an `ITierV2` contract.
       */
      ITIERV2_REPORT,
      /**
       * Opcode to call `reportTimeForTier` on an `ITierV2` contract.
       */
      ITIERV2_REPORT_TIME_FOR_TIER,
      /**
       * Opcode to calculate the tierwise diff of two reports.
       */
      SATURATING_DIFF,
      /**
       * Opcode to tierwise select the best block lte a reference block.
       */
      SELECT_LTE,
      /**
       * Opcode to update the timestamp over a range of tiers for a report.
       */
      UPDATE_TIMES_FOR_TIER_RANGE,
      /**
       * Opcode to read the value of storage key/value pair which is set by SET opcode
       */
      GET,
      /**
       * length of available opcodes
       */
      length,
}
