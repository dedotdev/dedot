import { GenericJsonRpcApis } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { OperationId } from '../types/index.js';

/**
 * transaction-prefixed JSON-RPC methods.
 *
 * @version unstable
 */
export interface TransactionUnstable extends GenericJsonRpcApis {
  /**
   * Broadcast an extrinsic to the chain.
   *
   * @rpcname transaction_unstable_broadcast
   * @version unstable
   */
  transaction_unstable_broadcast(tx: HexString): Promise<OperationId | null>;
  /**
   * Stop a broadcasting extrinsic operation
   *
   * @rpcname transaction_unstable_stop
   * @version unstable
   */
  transaction_unstable_stop(operationId: OperationId): Promise<void>;
}
