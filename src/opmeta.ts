import { AllStandardOps, pnp, IOpMeta } from './types'

/**
 * @public
 */
export const rainOpMeta: Map<number, IOpMeta> = new Map([
    [
        0,
        {
            enum: AllStandardOps.CONSTANT,
            name: 'CONSTANT',
            description:
                'Takes an item from constants array and insert it into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: false,
            aliases: ['CONST'],
            data: {
                description: 'Insert a constant into the expression.',
                category: 'core',
                example: 'constant(100)',
                parameters: [
                    {
                        spread: false,
                        name: 'index',
                        description: 'The constant value to insert.',
                    },
                ],
            },
        },
    ],
    [
        1,
        {
            enum: AllStandardOps.STACK,
            name: 'STACK',
            description:
                'Copies an item from a position in the current stack state to the top of the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: false,
            data: {
                description: 'Insert a value from elsewhere in the stack.',
                category: 'core',
                example: 'stack(1)',
                parameters: [
                    {
                        spread: false,
                        name: 'index',
                        description:
                            'The stack position of the value to insert.',
                    },
                ],
            },
        },
    ],
    [
        2,
        {
            enum: AllStandardOps.CONTEXT,
            name: 'CONTEXT',
            description:
                'Inserts an argument passed to a contracts function into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: false,
            data: {
                description:
                    "Insert a value from the calling function's context",
                category: 'core',
                example: 'context(0)',
                parameters: [
                    {
                        spread: false,
                        name: 'index',
                        description:
                            'The index of the context value to insert.',
                    },
                ],
            },
        },
    ],
    [
        3,
        {
            enum: AllStandardOps.STORAGE,
            name: 'STORAGE',
            description: 'Insert a value from contract storage into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: false,
            aliases: ['MEMORY'],
            data: {
                description: 'Insert a value from contract storage.',
                category: 'core',
                example: 'storage(0)',
                parameters: [
                    {
                        spread: false,
                        name: 'index',
                        description:
                            'The index of the storage value to insert.',
                    },
                ],
            },
        },
    ],
    [
        4,
        {
            enum: AllStandardOps.ZIPMAP,
            name: 'ZIPMAP',
            description:
                'Takes some items from the stack and splits them into loopSize sub-values and loops over them by executing script in another sources item',
            pushes: pnp.zpush,
            pops: pnp.derived,
            isZeroOperand: false,
            data: {
                description:
                    'Takes N values off the stack, interprets them as an array then zips and maps a source from `sources` over them. The source has access to the original constants using `1 0` and to zipped arguments as `1 1`.',
                category: 'core',
                example: 'zipmap(0, 0)',
                parameters: [
                    {
                        spread: false,
                        name: 'index',
                        description:
                            'The index of the sources array to zip values with.',
                    },
                    {
                        spread: false,
                        name: 'loopSize',
                        description:
                            'Defines the number of times the values are split into half, 256bit(0)-> 128bit(1) -> 64bit(2) -> 32bit(3)',
                    },
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to zipmap and loop over.',
                    },
                ],
            },
        },
    ],
    [
        5,
        {
            enum: AllStandardOps.DEBUG,
            name: 'DEBUG',
            description:
                'ABI encodes the entire stack and logs it to the hardhat console.',
            pushes: pnp.zero,
            pops: pnp.zero,
            isZeroOperand: false,
            aliases: ['LOG', 'CONSOLE', 'CONSOLE_LOG'],
            data: {
                description:
                    'ABI encodes the entire stack and logs it to the hardhat console.',
                category: 'core',
                example: 'debug()',
                parameters: [],
            },
        },
    ],
    [
        6,
        {
            enum: AllStandardOps.IERC20_BALANCE_OF,
            name: 'IERC20_BALANCE_OF',
            description:
                'Get the balance of an ERC20 token for an account by taking the contract and account address from stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['ERC20_BALANCE_OF', 'ERC20BALANCEOF', 'IERC20BALANCEOF'],
            data: {
                description:
                    'Get the balance of an ERC20 token for an account.',
                category: 'ERC20',
                example: 'ierc20_balance_of(0x..., 0x...)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC20 address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account to get the balance of.',
                    },
                ],
            },
        },
    ],
    [
        7,
        {
            enum: AllStandardOps.IERC20_TOTAL_SUPPLY,
            name: 'IERC20_TOTAL_SUPPLY',
            description:
                'Get the supply of an ERC20 token by taking the contract address from stack',
            pushes: pnp.one,
            pops: pnp.one,
            isZeroOperand: true,
            aliases: [
                'ERC20_TOTAL_SUPPLY',
                'ERC20TOTALSUPPLY',
                'IERC20TOTALSUPPLY',
            ],
            data: {
                description: 'Get the totalSupply of an ERC20 token.',
                category: 'ERC20',
                example: 'ierc20_total_supply(0x...)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC20 address.',
                    },
                ],
            },
        },
    ],
    [
        8,
        {
            enum: AllStandardOps.IERC20_SNAPSHOT_BALANCE_OF_AT,
            name: 'IERC20_SNAPSHOT_BALANCE_OF_AT',
            description:
                'Get the snapshot balance of an ERC20 token for an account by taking the contract and account address and snapshot id from stack',
            pushes: pnp.one,
            pops: pnp.three,
            isZeroOperand: true,
            aliases: [
                'ERC20_SNAPSHOT_BALANCE_OF_AT',
                'ERC20SNAPSHOTBALANCEOFAT',
                'IERC20SNAPSHOTBALANCEOFAT',
            ],
            data: {
                description:
                    'Retrieves the balance of an account at the time a snapshotId was created.',
                category: 'ERC20',
                example: 'ierc20_snapshot_balance_of_at(0x..., 0x..., 1)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC20 address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account to get the balance of.',
                    },
                    {
                        spread: false,
                        name: 'snapshotId',
                        description: 'The id of the snapshot.',
                    },
                ],
            },
        },
    ],
    [
        9,
        {
            enum: AllStandardOps.IERC20_SNAPSHOT_TOTAL_SUPPLY_AT,
            name: 'IERC20_SNAPSHOT_TOTAL_SUPPLY_AT',
            description:
                'Get the snapshot supply of an ERC20 token by taking the contract address and snapshot id from stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: [
                'ERC20_SNAPSHOT_TOTAL_SUPPLY_AT',
                'ERC20SNAPSHOTTOTALSUPPLYAT',
                'IERC20SNAPSHOTTOTALSUPPLYAT',
            ],
            data: {
                description:
                    'Retrieves the total supply of a token at the time a snapshotId was created.',
                category: 'ERC20',
                example: 'ierc20_snapshot_total_supply_at(0x..., 1)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC20 address.',
                    },
                    {
                        spread: false,
                        name: 'snapshotId',
                        description: 'The id of the snapshot.',
                    },
                ],
            },
        },
    ],
    [
        10,
        {
            enum: AllStandardOps.IERC721_BALANCE_OF,
            name: 'IERC721_BALANCE_OF',
            description:
                'Get the balance of an ERC721 token for an account by taking the contract and account address from stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: [
                'ERC721_BALANCE_OF',
                'ERC721BALANCEOF',
                'IERC721BALANCEOF',
            ],
            data: {
                description:
                    'Get the balance of an ERC721 token for an account.',
                category: 'ERC721',
                example: 'ierc721_balance_of(0x..., 0x...)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC721 address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account to get the balance of.',
                    },
                ],
            },
        },
    ],
    [
        11,
        {
            enum: AllStandardOps.IERC721_OWNER_OF,
            name: 'IERC721_OWNER_OF',
            description:
                'Get the owner of an ERC20 token for an account by taking the contract address and token id from stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['ERC721_OWNER_OF', 'ERC721OWNEROF', 'IERC721OWNEROF'],
            data: {
                description: 'Returns the owner of the tokenId token.',
                category: 'ERC721',
                example: 'ierc721_owner_of(0x..., 1)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC721 address.',
                    },
                    {
                        spread: false,
                        name: 'id',
                        description: 'The id to get the owner of.',
                    },
                ],
            },
        },
    ],
    [
        12,
        {
            enum: AllStandardOps.IERC1155_BALANCE_OF,
            name: 'IERC1155_BALANCE_OF',
            description:
                'Get the balance of an ERC1155 token for an account by taking the contract and account address and token id from stack',
            pushes: pnp.one,
            pops: pnp.three,
            isZeroOperand: true,
            aliases: [
                'ERC1155_BALANCE_OF',
                'ERC1155BALANCEOF',
                'IERC1155BALANCEOF',
            ],
            data: {
                description: 'Batched version of balanceOf.',
                category: 'ERC1155',
                example: 'ierc1155_balance_of(0x..., 0x..., 1)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC1155 address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account to get the balance of.',
                    },
                    {
                        spread: false,
                        name: 'id',
                        description: 'The id to get the balance of.',
                    },
                ],
            },
        },
    ],
    [
        13,
        {
            enum: AllStandardOps.IERC1155_BALANCE_OF_BATCH,
            name: 'IERC1155_BALANCE_OF_BATCH',
            description:
                'Get the batch balances of an ERC1155 token for an account by taking the contract address and array of account addresses and token ids from stack',
            pushes: pnp.oprnd,
            pops: pnp.derived,
            isZeroOperand: false,
            aliases: [
                'ERC1155_BALANCE_OF_BATCH',
                'ERC1155BALANCEOFBATCH',
                'IERC1155BALANCEOFBATCH',
            ],
            data: {
                description: 'Inserts the current block number.',
                category: 'ERC1155',
                example:
                    'ierc1155_balance_of_batch(2, 0x..., 0x..., 0x..., 1, 2)',
                parameters: [
                    {
                        spread: false,
                        name: 'token',
                        description: 'The ERC1155 address.',
                    },
                    {
                        spread: true,
                        name: 'accounts',
                        description: 'The accounts to get the balance of.',
                    },
                    {
                        spread: true,
                        name: 'ids',
                        description:
                            'The corresponding ids to get the balance of.',
                    },
                ],
            },
        },
    ],
    [
        14,
        {
            enum: AllStandardOps.BLOCK_NUMBER,
            name: 'BLOCK_NUMBER',
            description: 'Inserts the current block number into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: true,
            aliases: ['CURRENT_BLOCK', 'CURRENTBLOCK', 'BLOCKNUMBER'],
            data: {
                description: 'Inserts the current block number.',
                category: 'EVM',
                example: 'block_number()',
                parameters: [],
            },
        },
    ],
    [
        15,
        {
            enum: AllStandardOps.SENDER,
            name: 'SENDER',
            description: 'Inserts the msg.sender address into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: true,
            aliases: ['MSG_SENDER', 'MSGSENDER', 'SIGNER'],
            data: {
                description: 'The sender of the current transaction.',
                category: 'EVM',
                example: 'sender()',
                parameters: [],
            },
        },
    ],
    [
        16,
        {
            enum: AllStandardOps.THIS_ADDRESS,
            name: 'THIS_ADDRESS',
            description: 'Inserts this contract address into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: true,
            aliases: ['THISADDRESS'],
            data: {
                description:
                    'The address of the contract this expression is being evaluated in.',
                category: 'EVM',
                example: 'this_address()',
                parameters: [],
            },
        },
    ],
    [
        17,
        {
            enum: AllStandardOps.BLOCK_TIMESTAMP,
            name: 'BLOCK_TIMESTAMP',
            description: 'Insert the current block timestamp into the stack',
            pushes: pnp.one,
            pops: pnp.zero,
            isZeroOperand: true,
            aliases: [
                'CURRENT_TIMESTAMP',
                'CURRENTTIMESTAMP',
                'BLOCKTIMESTAMP',
                'CURRENTTIME',
                'CURRENT_TIME',
            ],
            data: {
                description: 'The timestamp of the current block (in seconds).',
                category: 'EVM',
                example: 'block_timestamp()',
                parameters: [],
            },
        },
    ],
    [
        18,
        {
            enum: AllStandardOps.SCALE18,
            name: 'SCALE18',
            description: 'Rescale some fixed point number to 18 OOMs in situ.',
            pushes: pnp.one,
            pops: pnp.one,
            isZeroOperand: false,
            aliases: ['SCALE_18'],
            data: {
                description:
                    'Rescale some fixed point number to 18 OOMs in situ.',
                category: 'math',
                example: 'scale18(10 47850000000)',
                parameters: [
                    {
                        spread: false,
                        name: 'decimal point',
                        description:
                            'The decimals of the value to convert into 18 fixed point decimals.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description:
                            'The values to convert into 18 fixed point decimals.',
                    },
                ],
            },
        },
    ],
    [
        19,
        {
            enum: AllStandardOps.SCALE18_DIV,
            name: 'SCALE18_DIV',
            description:
                'Inserts the result of dividing the 2 items of the stack by keeping the 18 fixed point decimals into the stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: false,
            aliases: ['SCALE18DIV', 'SCALE_18_DIV'],
            data: {
                description:
                    'Inserts the result of dividing the 2 items of the stack by keeping the 18 fixed point decimals into the stack',
                category: 'math',
                example: 'scale_div(6 0x123450000 4)',
                parameters: [
                    {
                        spread: false,
                        name: 'first value decimal point',
                        description:
                            'The decimals of the first value to keep the 18 fixed point decimals.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The first value.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The second value.',
                    },
                ],
            },
        },
    ],
    [
        20,
        {
            enum: AllStandardOps.SCALE18_MUL,
            name: 'SCALE18_MUL',
            description:
                'Inserts the result of multiplying the 2 items of the stack by keeping the 18 fixed point decimals into the stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: false,
            aliases: ['SCALE18MUL', 'SCALE_18_MUL'],
            data: {
                description:
                    'Inserts the result of dividing the 2 items of the stack by keeping the 18 fixed point decimals into the stack',
                category: 'math',
                example: 'scale_mul(6 0x123450000 4)',
                parameters: [
                    {
                        spread: false,
                        name: 'first value decimal point',
                        description:
                            'The decimals of the first value to keep the 18 fixed point decimals.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The first value.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The second value.',
                    },
                ],
            },
        },
    ],
    [
        21,
        {
            enum: AllStandardOps.SCALE_BY,
            name: 'SCALE_BY',
            description: 'Scale a fixed point up or down by opernad.',
            pushes: pnp.one,
            pops: pnp.one,
            isZeroOperand: false,
            aliases: ['SCALEBY'],
            data: {
                escription:
                    'Rescale an arbitrary fixed point number by some OOMs.',
                category: 'math',
                example: 'scale_by(2 10000000)',
                parameters: [
                    {
                        spread: false,
                        name: 'decimal point to scale up/down with',
                        description:
                            "The decimal point to up or down by, this value is complement 2's.",
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The value to scale by.',
                    },
                ],
            },
        },
    ],
    [
        22,
        {
            enum: AllStandardOps.SCALEN,
            name: 'SCALEN',
            description: 'Rescale an 18 OOMs fixed point number to scale N.',
            pushes: pnp.one,
            pops: pnp.one,
            isZeroOperand: false,
            aliases: ['SCALE_N'],
            data: {
                description:
                    'Rescale an 18 OOMs fixed point number to scale N.',
                category: 'math',
                example: 'scalen(4 1000000000)',
                parameters: [
                    {
                        spread: false,
                        name: 'target fixed decimals point',
                        description:
                            'The targeted fixed decimals point to convert the value to.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The value to scale to N.',
                    },
                ],
            },
        },
    ],
    [
        23,
        {
            enum: AllStandardOps.ANY,
            name: 'ANY',
            description:
                'Inserts the first non-zero value of all the values it checks if there exists one, else inserts zero into the stack.',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['OR', 'ANY_OF', 'ANYOF', '|', '||'],
            data: {
                description:
                    'Returns the first non-zero value if any of N number of sub-expressions are non-zero',
                category: 'logic',
                example: 'any(2, {expression}, {expression})',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to check.',
                    },
                ],
            },
        },
    ],
    [
        24,
        {
            enum: AllStandardOps.EAGER_IF,
            name: 'EAGER_IF',
            description:
                'Takes 3 items from the stack and check if the first item is non-zero the inserts the second item into the stack, else inserts the 3rd item',
            pushes: pnp.one,
            pops: pnp.three,
            isZeroOperand: true,
            aliases: ['EAGERIF', 'IF'],
            data: {
                description: 'If statement',
                category: 'logic',
                example: 'eager_if(1, 100, 200)',
                parameters: [
                    {
                        spread: false,
                        name: 'condition',
                        description: 'The condition to evaluate.',
                    },
                    {
                        spread: false,
                        name: 'then',
                        description:
                            'The value if the condition is non-zero/true.',
                    },
                    {
                        spread: false,
                        name: 'else',
                        description:
                            'The value if the condition is zero/false.',
                    },
                ],
            },
        },
    ],
    [
        25,
        {
            enum: AllStandardOps.EQUAL_TO,
            name: 'EQUAL_TO',
            description:
                'Comapres the last 2 items of the stack together and inserts true/1 into stack if they are euqal, else inserts false/0',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['EQ', 'EQUALTO', '=', '==', '==='],
            data: {
                description: 'Returns true if two values are equal.',
                category: 'logic',
                example: 'equal_to(100, 200)',
                parameters: [
                    {
                        spread: false,
                        name: 'value1',
                        description: 'The first value.',
                    },
                    {
                        spread: false,
                        name: 'value2',
                        description: 'The second value.',
                    },
                ],
            },
        },
    ],
    [
        26,
        {
            enum: AllStandardOps.EVERY,
            name: 'EVERY',
            description:
                'Inserts the first value of all the values it checks if all of them are non-zero, else inserts zero into the stack.',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['AND', 'ALL_OF', 'ALLOF', '&', '&&'],
            data: {
                description:
                    'Returns the first value if all of N number of sub-expressions are non-zero',
                category: 'logic',
                example: 'every(2, {expression}, {expression})',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to check.',
                    },
                ],
            },
        },
    ],
    [
        27,
        {
            enum: AllStandardOps.GREATER_THAN,
            name: 'GREATER_THAN',
            description:
                'Takes last 2 values from stack and puts true/1 into the stack if the first value is greater than the second value and false/0 if not.',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['GT', 'GREATERTHAN', 'BIGGERTHAN', 'BIGGER_THAN', '>'],
            data: {
                description: 'Returns true if value X is greater than value Y.',
                category: 'logic',
                example: 'greater_than(X, Y)',
                parameters: [
                    {
                        spread: false,
                        name: 'value',
                        description: 'The first value.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The second value.',
                    },
                ],
            },
        },
    ],
    [
        28,
        {
            enum: AllStandardOps.ISZERO,
            name: 'ISZERO',
            description:
                'Checks if the value is zero and inserts true/1 into the stack if it is, else inserts false/0',
            pushes: pnp.one,
            pops: pnp.one,
            isZeroOperand: true,
            aliases: ['IS_ZERO', 'FALSE', 'IS_FALSE', 'ISFALSE'],
            data: {
                description: 'Returns true if a value is zero.',
                category: 'logic',
                example: 'iszero(1)',
                parameters: [
                    {
                        spread: false,
                        name: 'value',
                        description: 'The value to check.',
                    },
                ],
            },
        },
    ],
    [
        29,
        {
            enum: AllStandardOps.LESS_THAN,
            name: 'LESS_THAN',
            description:
                'Takes last 2 values from stack and puts true/1 into the stack if the first value is less than the second value and false/0 if not.',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['LT', 'LESSTHAN', 'LITTLETHAN', 'LITTLE_THAN', '<'],
            data: {
                description: 'Returns true if value X is less than value Y.',
                category: 'logic',
                example: 'less_than(X, Y)',
                parameters: [
                    {
                        spread: false,
                        name: 'value',
                        description: 'The first value.',
                    },
                    {
                        spread: false,
                        name: 'value',
                        description: 'The second value.',
                    },
                ],
            },
        },
    ],
    [
        30,
        {
            enum: AllStandardOps.SATURATING_ADD,
            name: 'SATURATING_ADD',
            description:
                'Inserts sum of the specified items from the stack and if prevernts reverts if the result goes above max 256 bit size',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: [
                'SATURATINGADD',
                'SAT_ADD',
                'SATADD',
                'SATURATING_SUM',
                'SATURATINGSUM',
                'SATSUM',
                'SAT_SUM',
            ],
            data: {
                description:
                    'Sum of N values and prevernts from the result going above max uint 256',
                category: 'math',
                example: 'saturating_add(1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to sum.',
                    },
                ],
            },
        },
    ],
    [
        31,
        {
            enum: AllStandardOps.SATURATING_MUL,
            name: 'SATURATING_MUL',
            description:
                'Inserts multiplied result of the specified items from the stack and if prevernts reverts if the result goes above max 256 bit size',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['SATURATINGMUL', 'SAT_MUL', 'SATMUL'],
            data: {
                description:
                    'Multiplication of N values and prevernts from the result going above max uint 256',
                category: 'math',
                example: 'saturating_mul(1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to sum.',
                    },
                ],
            },
        },
    ],
    [
        32,
        {
            enum: AllStandardOps.SATURATING_SUB,
            name: 'SATURATING_SUB',
            description:
                'Inserts subtraction of the specified items from the stack and if prevernts reverts if the result goes blow zero',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: [
                'SATURATINGSUB',
                'SAT_SUB',
                'SATSUB',
                'SATURATING_MINUS',
                'SATURATINGMINUS',
                'SATMINUS',
                'SAT_MINUS',
            ],
            data: {
                description:
                    'Subtraction of N values and prevernts from the result going below zero',
                category: 'math',
                example: '',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to sum.',
                    },
                ],
            },
        },
    ],
    [
        33,
        {
            enum: AllStandardOps.ADD,
            name: 'ADD',
            description:
                'Inserts the result of sum of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['+', 'SUM'],
            data: {
                description: 'Sums N number of values.',
                category: 'math',
                example: 'add(3, 1, 3, 2)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to sum.',
                    },
                ],
            },
        },
    ],
    [
        34,
        {
            enum: AllStandardOps.DIV,
            name: 'DIV',
            description:
                'Inserts the result of divide of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['/', '÷', 'DIVIDE'],
            data: {
                description: 'Divides N number of values.',
                category: 'math',
                example: 'div(3 1 3 1)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to divide.',
                    },
                ],
            },
        },
    ],
    [
        35,
        {
            enum: AllStandardOps.EXP,
            name: 'EXP',
            description:
                'Inserts the result of exponention of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: [
                '^',
                '**',
                'POW',
                'POWER',
                'POWER_OF',
                'POWEROF',
                'EXPONENTION',
            ],
            data: {
                category: 'math',
                example: 'Powers N number of values sequentialy',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to power.',
                    },
                ],
            },
        },
    ],
    [
        36,
        {
            enum: AllStandardOps.MAX,
            name: 'MAX',
            description:
                'Inserts the maximum of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['MAXIMUM', 'MAXIMUM_OF', 'MAXIMUMOF', 'MAX_OF', 'MAXOF'],
            data: {
                description: 'Returns the maximum of N number of values',
                category: 'math',
                example: 'max(1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to get the max of.',
                    },
                ],
            },
        },
    ],
    [
        37,
        {
            enum: AllStandardOps.MIN,
            name: 'MIN',
            description:
                'Inserts the minimum of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['MINIMUM', 'MINIMUM_OF', 'MINIMUMOF', 'MIN_OF', 'MINOF'],
            data: {
                description: 'Returns the minimum of N number of values',
                category: 'math',
                example: 'min(1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to get the min of.',
                    },
                ],
            },
        },
    ],
    [
        38,
        {
            enum: AllStandardOps.MOD,
            name: 'MOD',
            description:
                'Inserts the mod of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['%'],
            data: {
                description: 'Mod of N number of values.',
                category: 'math',
                example: 'mod(8 3 2)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to mod.',
                    },
                ],
            },
        },
    ],
    [
        39,
        {
            enum: AllStandardOps.MUL,
            name: 'MUL',
            description:
                'Inserts the multiplication of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['*', 'X'],
            data: {
                description: 'Multiplies N number of values',
                category: 'math',
                example: 'mul(3 1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to multiply.',
                    },
                ],
            },
        },
    ],
    [
        40,
        {
            enum: AllStandardOps.SUB,
            name: 'SUB',
            description:
                'Inserts the subtraction of N values taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.oprnd,
            isZeroOperand: false,
            aliases: ['-', 'MINUS'],
            data: {
                description: 'Subtracts N number of values',
                category: 'math',
                example: 'sub(3 1 2 3)',
                parameters: [
                    {
                        spread: true,
                        name: 'values',
                        description: 'The values to subtract.',
                    },
                ],
            },
        },
    ],
    [
        41,
        {
            enum: AllStandardOps.ITIERV2_REPORT,
            name: 'ITIERV2_REPORT',
            description:
                'Inserts the report of an account of a tier contract and optionally contexts which are taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.derived,
            isZeroOperand: false,
            aliases: [
                'REPORT',
                'ITIERV2REPORT',
                'TIERREPORT',
                'TIER_REPORT',
                'ITIERREPORT',
                'ITIER_REPORT',
            ],
            data: {
                description:
                    'Return the report of a tier contract for an account',
                category: 'tier',
                example: 'itierv2_report(tierContractAddress account)',
                parameters: [
                    {
                        spread: false,
                        name: 'tier contract',
                        description: 'The tier contract address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account address.',
                    },
                    {
                        spread: true,
                        name: 'context',
                        description: 'The contextual values.',
                    },
                ],
            },
        },
    ],
    [
        42,
        {
            enum: AllStandardOps.ITIERV2_REPORT_TIME_FOR_TIER,
            name: 'ITIERV2_REPORT_TIME_FOR_TIER',
            description:
                'Inserts the specified tier level report of an account of a tier contract and optionally contexts which are taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.derived,
            isZeroOperand: false,
            aliases: [
                'ITIERV2REPORTTIMEFORTIER',
                'SINGLE_REPORT',
                'SINGLEREPORT',
                'SINGLE_TIER_REPORT',
                'SINGLETIERREPORT',
            ],
            data: {
                description:
                    'Return the specified tier level report of a tier contract for an account',
                category: 'tier',
                example:
                    'itierv2_report_time_for_tier(tierAddress account tierLevel)',
                parameters: [
                    {
                        spread: false,
                        name: 'tier contract',
                        description: 'The tier contract address.',
                    },
                    {
                        spread: false,
                        name: 'account',
                        description: 'The account address.',
                    },
                    {
                        spread: false,
                        name: 'tier',
                        description: 'The tier level.',
                    },
                    {
                        spread: true,
                        name: 'context',
                        description: 'The contextual values.',
                    },
                ],
            },
        },
    ],
    [
        43,
        {
            enum: AllStandardOps.SATURATING_DIFF,
            name: 'SATURATING_DIFF',
            description:
                'Inserts the saturating difference of 2 reports taken from the stack into the stack and prevents reverts if the result below zero',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: true,
            aliases: ['SAT_DIFF', 'SATDIFF', 'SATURATINGDIFF'],
            data: {
                description:
                    'Returns the saturating difference of reports, prevernt the result to go below zero',
                category: 'tier',
                example: 'saturating_diff(report1 report2)',
                parameters: [
                    {
                        spread: false,
                        name: 'report1',
                        description: 'The firts report.',
                    },
                    {
                        spread: false,
                        name: 'report2',
                        description: 'The second report.',
                    },
                ],
            },
        },
    ],
    [
        44,
        {
            enum: AllStandardOps.SELECT_LTE,
            name: 'SELECT_LTE',
            description:
                'Inserts the result of selecting the less than equal to specified value taken from stack among number of reports by a logic and mode into the stack',
            pushes: pnp.one,
            pops: pnp.derived,
            isZeroOperand: false,
            aliases: ['SELECTLTE', 'SELECT'],
            data: {
                description:
                    'Returns the result of selecting the less than equal to a value among number of reports defnied by the mode and logic',
                category: 'tier',
                example:
                    'select_lte(0 1 block_timestamp() itierv2_report(tierAddress account) itierv2_report(tierAddress account))',
                parameters: [
                    {
                        spread: false,
                        name: 'logic',
                        description: 'The logic of selectLte (every, any).',
                    },
                    {
                        spread: false,
                        name: 'mode',
                        description: 'The mode of selectLte (min, max, first).',
                    },
                    {
                        spread: false,
                        name: 'referrence value',
                        description:
                            'The value to check the tier reports against.',
                    },
                    {
                        spread: true,
                        name: 'reports',
                        description: 'The reports to selectLte from.',
                    },
                ],
            },
        },
    ],
    [
        45,
        {
            enum: AllStandardOps.UPDATE_TIMES_FOR_TIER_RANGE,
            name: 'UPDATE_TIMES_FOR_TIER_RANGE',
            description:
                'Inserts the result of updating the range of tiers of a report taken from stack by a value taken from the stack into the stack',
            pushes: pnp.one,
            pops: pnp.two,
            isZeroOperand: false,
            aliases: [
                'UPDATETIMESFORTIERRANGE',
                'UPDATE_TIER_RANGE',
                'UPDATETIERRANGE',
                'UPDATE_TIERS',
                'UPDATETIERS',
                'UPDATE_REPORT',
                'UPDATEREPORT',
            ],
            data: {
                description:
                    'Returns the updated report with a value applied to range of tier levels',
                category: 'tier',
                example:
                    'update_times_for_tier_range(0 8 block_timestamp() itierv2_report(0x....1 0x....2))',
                parameters: [
                    {
                        spread: false,
                        name: 'start tier',
                        description: 'The start tier range',
                    },
                    {
                        spread: false,
                        name: 'end tier',
                        description: 'The end tier range',
                    },
                    {
                        spread: false,
                        name: 'updateValue',
                        description: 'The value to update tier range to',
                    },
                    {
                        spread: false,
                        name: 'report',
                        description: 'The report to update its tier range',
                    },
                ],
            },
        },
    ],
])
