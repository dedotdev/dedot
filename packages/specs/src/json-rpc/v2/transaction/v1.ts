import { GenericJsonRpcApis } from '@dedot/types';
import { HexString } from '@dedot/utils';

export interface TransactionV1 extends GenericJsonRpcApis {
  /**
   * Broadcast an extrinsic to the chain.
   *
   * @rpcname transaction_v1_broadcast
   */
  transaction_v1_broadcast: (tx: HexString) => Promise<string | null>;
  /**
   * Stop a broadcasting extrinsic operation
   *
   * @rpcname transaction_v1_stop
   */
  transaction_v1_stop: () => Promise<void>;
}
