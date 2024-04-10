import { GenericJsonRpcApis } from '@dedot/types';
import { HexString } from '@dedot/utils';

export interface TransactionUnstable extends GenericJsonRpcApis {
  /**
   * Broadcast an extrinsic to the chain.
   *
   * @rpcname transaction_unstable_broadcast
   */
  transaction_unstable_broadcast: (tx: HexString) => Promise<string | null>;
  /**
   * Stop a broadcasting extrinsic operation
   *
   * @rpcname transaction_unstable_stop
   */
  transaction_unstable_stop: () => Promise<void>;
}
