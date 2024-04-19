import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TransactionWatchEvent } from '../types/index.js';

/**
 * transactionWatch-prefixed JSON-RPC methods.
 *
 * @version v1
 */
export interface TransactionWatchV1 extends GenericJsonRpcApis {
  /**
   * Submit an extrinsic to watch.
   *
   * @subscription transactionWatch_v1_submitAndWatch, transactionWatch_v1_watchEvent, transactionWatch_v1_unwatch
   * @version v1
   */
  transactionWatch_v1_submitAndWatch(tx: HexString, callback: Callback<TransactionWatchEvent>): Promise<Unsub>;
}
