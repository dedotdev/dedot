import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TransactionWatchEvent } from '../types/index.js';

/**
 * transactionWatch-prefixed JSON-RPC methods.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/7430f413503f8008fe60eb2e4ebd76d14af12ea9/substrate/client/rpc-spec-v2/src/transaction/api.rs#L26-L41
 *
 * @version unstable
 */
export interface TransactionWatchUnstable extends GenericJsonRpcApis {
  /**
   * Submit an extrinsic to watch.
   *
   * @subscription transactionWatch_unstable_submitAndWatch, transactionWatch_unstable_watchEvent, transactionWatch_unstable_unwatch
   * @version unstable
   */
  transactionWatch_unstable_submitAndWatch(tx: HexString, callback: Callback<TransactionWatchEvent>): Promise<Unsub>;
}
