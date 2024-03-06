import { RuntimeApiSpec } from '@dedot/types';
import { $BlockHash, $OpaqueExtrinsic, $TransactionSource, $TransactionValidity } from '@dedot/codecs';

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
            codec: $TransactionSource,
          },
          {
            name: 'tx',
            type: 'OpaqueExtrinsic',
            codec: $OpaqueExtrinsic,
          },
          {
            name: 'blockHash',
            type: 'BlockHash',
            codec: $BlockHash,
          },
        ],
        type: 'TransactionValidity',
        codec: $TransactionValidity,
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
            codec: $TransactionSource,
          },
          {
            name: 'tx',
            type: 'OpaqueExtrinsic',
            codec: $OpaqueExtrinsic,
          },
        ],
        type: 'TransactionValidity',
        codec: $TransactionValidity,
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
            codec: $OpaqueExtrinsic,
          },
        ],
        type: 'TransactionValidity',
        codec: $TransactionValidity,
      },
    },
    version: 1,
  },
];
