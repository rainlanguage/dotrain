import { BigNumberish, BytesLike } from 'ethers'

/**
 * @public
 *
 * All the standard Op Codes
 */
export enum AllStandardOps {
    /**
     * Copies a value either off `constants` or `arguments` to the top of
     * the stack. arguments will go at the end of the constants array.
     */
    CONSTANT,
    /**
     * Duplicates any value in the stack to the top of the stack. The operand
     * specifies the index to copy from.
     */
    STACK,
    /**
     * stacks an item of the contextual array of values of an underlying contract
     * passed by caller when calling the contract's methods. operand is the index
     * to access the desired item in the array.
     */
    CONTEXT,
    /**
     * used as local opcodes i.e. opcodes to stack the contract's storage contents i.e.
     * porperties/variables. operand determines the storage location to be stacked.
     */
    STORAGE,
    /**
     * Takes N values off the stack, interprets them as an array then zips
     * and maps a source from `sources` over them. The source has access to
     * the original constants using `1 0` and to zipped arguments as `1 1`.
     */
    ZIPMAP,
    /**
     * ABI encodes the entire stack and logs it to the hardhat console.
     */
    DEBUG,
    /**
     * Opcode for `IERC20` `balanceOf`.
     */
    IERC20_BALANCE_OF,
    /**
     * Opcode for `IERC20` `totalSupply`.
     */
    IERC20_TOTAL_SUPPLY,
    /**
     * Opcode for `IERC20` use an Snapshot `balanceOfAt`.
     */
    IERC20_SNAPSHOT_BALANCE_OF_AT,
    /**
     * Opcode for `IERC20` use an Snapshot `totalSupplyAt`.
     */
    IERC20_SNAPSHOT_TOTAL_SUPPLY_AT,
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
     * Opcode for the block number.
     */
    BLOCK_NUMBER,
    /**
     * Opcode for the `msg.sender`.
     */
    SENDER,
    /**
     * Opcode for `this` address of the current contract.
     */
    THIS_ADDRESS,
    /**
     * Opcode for the block timestamp.
     */
    BLOCK_TIMESTAMP,
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
     * length of available opcodes
     */
    length,
}

/**
 * @public
 *
 * Config required to build a new `State`.
 */
export interface StateConfig {
    /**
     * Sources verbatim.
     */
    sources: BytesLike[];
    /**
     * Constants verbatim.
     */
    constants: BigNumberish[];
}

/**
 * @public
 * Interface for accessible by vm storage's slots range available for a contract to be
 * used as local opcodes.
 */
export interface StorageOpcodesRange {
    /**
     * pointer to the storage slot of the first property of properties of a contract used
     * as STORAGE opcode.
     */
    pointer: BigNumberish;
    /**
     * Length of the storage opcodes of a contract, i.e. the number of local opcodes
     */
    length: BigNumberish;
}

/**
 * @public
 */
export type IOpMeta = {
    enum: number;
    name: string;
    pushes: (opcode: number, operand: number) => number;
    pops: (opcode: number, operand: number) => number;
    isZeroOperand: boolean;
    description?: string;
    aliases?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
};

/**
 * @public
 * Class for Opcodes number of stack pushes and pops
 */
export const pnp: Record<
    string,
    (_opcode: number, _operand: number) => number
> = {
    /**
     * @public
     */
    zero: (_opcode: number, _operand: number) => 0,

    /**
     * @public
     */
    one: (_opcode: number, _operand: number) => 1,

    /**
     * @public
     */
    two: (_opcode: number, _operand: number) => 2,

    /**
     * @public
     */
    three: (_opcode: number, _operand: number) => 3,

    /**
     * @public
     */
    oprnd: (_opcode: number, _operand: number) => _operand,

    /**
     * @public
     */
    derived: (_opcode: number, _operand: number) => {
        if (_opcode === AllStandardOps.ZIPMAP) {
            return (_operand >> 5) + 1
        }
        if (_opcode === AllStandardOps.SELECT_LTE) {
            return (_operand & 31) + 1
        }
        if (_opcode === AllStandardOps.IERC1155_BALANCE_OF_BATCH) {
            return _operand * 2 + 1
        }
        if (_opcode === AllStandardOps.ITIERV2_REPORT) {
            return _operand + 2
        }
        if (_opcode === AllStandardOps.ITIERV2_REPORT_TIME_FOR_TIER) {
            return _operand + 3
        }
        return NaN
    },

    /**
     * @public
     */
    zpush: (_opcode: number, _operand: number) => {
        return 2 ** ((_operand >> 3) & 3)
    },
}
