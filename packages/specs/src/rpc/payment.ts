import { RpcModuleSpec } from '@delightfuldot/types';
import { atBlockHashParam } from './shared';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/36957d676033b23b46edb66e6d7dcd13da11e19a/substrate/frame/transaction-payment/rpc/src/lib.rs#L38-L48
 * TODO add deprecation warning message
 */
export const payment: RpcModuleSpec = {
  queryInfo: {
    docs: 'Retrieves the fee information for an encoded extrinsic',
    params: [
      {
        name: 'extrinsic',
        type: 'Bytes',
      },
      atBlockHashParam,
    ],
    type: 'RuntimeDispatchInfo',
  },
  queryFeeDetails: {
    docs: 'Query the detailed fee of a given encoded extrinsic',
    params: [
      {
        name: 'extrinsic',
        type: 'Bytes',
      },
      atBlockHashParam,
    ],
    type: 'FeeDetails',
  },
};
