import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TransactionEvent } from '../types/index.js';

export interface TransactionWatchUnstable extends GenericJsonRpcApis {
  /**
   * Submit an extrinsic to watch.
   *
   * @subscription transactionWatch_unstable_submitAndWatch, transactionWatch_unstable_watchEvent, transactionWatch_unstable_unwatch
   */
  transactionWatch_unstable_submitAndWatch: (tx: HexString, callback: Callback<TransactionEvent>) => Promise<Unsub>;
}
