import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/36957d676033b23b46edb66e6d7dcd13da11e19a/substrate/frame/transaction-payment/rpc/runtime-api/src/lib.rs#L26-L36
 */
export const payment: RuntimeApisModule = {
  TransactionPaymentApi: [
    {
      methods: {
        queryInfo: {
          docs: 'The transaction info',
          params: [
            {
              name: 'uxt',
              type: 'Bytes',
            },
            {
              name: 'len',
              type: 'u32',
            },
          ],
          type: 'RuntimeDispatchInfo',
        },
        queryFeeDetails: {
          docs: 'The transaction fee details',
          params: [
            {
              name: 'uxt',
              type: 'Bytes',
            },
            {
              name: 'len',
              type: 'u32',
            },
          ],
          type: 'FeeDetails',
        },
        queryLengthToFee: {
          docs: 'Query the output of the current LengthToFee given some input',
          params: [
            {
              name: 'length',
              type: 'u32',
            },
          ],
          type: 'Balance',
        },
        queryWeightToFee: {
          docs: 'Query the output of the current WeightToFee given some input',
          params: [
            {
              name: 'weight',
              type: 'Weight',
            },
          ],
          type: 'Balance',
        },
      },
      version: 4,
    },
  ],
};