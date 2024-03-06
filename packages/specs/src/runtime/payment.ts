import * as $ from '@dedot/shape';
import { RuntimeApiSpec } from '@dedot/types';
import { $Balance, $FeeDetails, $OpaqueExtrinsic, $RawBytes, $RuntimeDispatchInfo, $Weight } from '@dedot/codecs';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/36957d676033b23b46edb66e6d7dcd13da11e19a/substrate/frame/transaction-payment/rpc/runtime-api/src/lib.rs#L26-L36
 */
export const TransactionPaymentApi: RuntimeApiSpec[] = [
  {
    methods: {
      queryInfo: {
        docs: 'The transaction info',
        params: [
          {
            name: 'uxt',
            type: 'OpaqueExtrinsic',
            codec: $OpaqueExtrinsic,
          },
          {
            name: 'len',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'RuntimeDispatchInfo',
        codec: $RuntimeDispatchInfo,
      },
      queryFeeDetails: {
        docs: 'The transaction fee details',
        params: [
          {
            name: 'uxt',
            type: 'OpaqueExtrinsic',
            codec: $OpaqueExtrinsic,
          },
          {
            name: 'len',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'FeeDetails',
        codec: $FeeDetails,
      },
      queryLengthToFee: {
        docs: 'Query the output of the current LengthToFee given some input',
        params: [
          {
            name: 'length',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'Balance',
        codec: $Balance,
      },
      queryWeightToFee: {
        docs: 'Query the output of the current WeightToFee given some input',
        params: [
          {
            name: 'weight',
            type: 'Weight',
            codec: $Weight,
          },
        ],
        type: 'Balance',
        codec: $Balance,
      },
    },
    version: 4,
  },
];

export const TransactionPaymentCallApi: RuntimeApiSpec[] = [
  {
    methods: {
      //TODO: Generate RuntimeCallLike for better suggestion when using.
      queryCallInfo: {
        docs: 'Query information of a dispatch class, weight, and fee of a given encoded `Call`.',
        params: [
          {
            name: 'call',
            type: 'RawBytes',
            codec: $RawBytes,
          },
          {
            name: 'len',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'RuntimeDispatchInfo',
        codec: $RuntimeDispatchInfo,
      },
      queryCallFeeDetails: {
        docs: 'Query fee details of a given encoded `Call`.',
        params: [
          {
            name: 'call',
            type: 'RawBytes',
            codec: $RawBytes,
          },
          {
            name: 'len',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'FeeDetails',
        codec: $FeeDetails,
      },
      queryLengthToFee: {
        docs: 'Query the output of the current LengthToFee given some input',
        params: [
          {
            name: 'length',
            type: 'u32',
            codec: $.u32,
          },
        ],
        type: 'Balance',
        codec: $Balance,
      },
      queryWeightToFee: {
        docs: 'Query the output of the current WeightToFee given some input',
        params: [
          {
            name: 'weight',
            type: 'Weight',
            codec: $Weight,
          },
        ],
        type: 'Balance',
        codec: $Balance,
      },
    },
    version: 3,
  },
];
