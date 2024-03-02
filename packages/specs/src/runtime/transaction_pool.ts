import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/primitives/transaction-pool/src/runtime_api.rs#L25-L30
 */
export const TaggedTransactionQueue: RuntimeApiSpec[] = [
  {
    methods: {
      validateTransaction: {
        docs: 'Validate the transaction.',
        params: [
          {
            name: 'source',
            type: 'TransactionSource',
          },
          {
            name: 'tx',
            type: 'OpaqueExtrinsic',
          },
          {
            name: 'blockHash',
            type: 'BlockHash',
          },
        ],
        type: 'TransactionValidity',
      },
    },
    version: 3,
  },
  {
    methods: {
      validateTransaction: {
        docs: 'Validate the transaction.',
        params: [
          {
            name: 'source',
            type: 'TransactionSource',
          },
          {
            name: 'tx',
            type: 'OpaqueExtrinsic',
          },
        ],
        type: 'TransactionValidity',
      },
    },
    version: 2,
  },
  {
    methods: {
      validateTransaction: {
        docs: 'Validate the transaction.',
        params: [
          {
            name: 'tx',
            type: 'OpaqueExtrinsic',
          },
        ],
        type: 'TransactionValidity',
      },
    },
    version: 1,
  },
];
