import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TransactionWatchEvent } from '../types/index.js';

/**
 * transactionWatch-prefixed JSON-RPC methods.
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
