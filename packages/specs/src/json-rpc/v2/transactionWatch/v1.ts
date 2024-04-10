import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TransactionEvent } from '../types/index.js';

export interface TransactionWatchV1 extends GenericJsonRpcApis {
  /**
   * Submit an extrinsic to watch.
   *
   * @subscription transactionWatch_v1_submitAndWatch, transactionWatch_v1_watchEvent, transactionWatch_v1_unwatch
   */
  transactionWatch_v1_submitAndWatch: (tx: HexString, callback: Callback<TransactionEvent>) => Promise<Unsub>;
}
