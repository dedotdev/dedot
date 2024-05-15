import { GenericJsonRpcApis } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { OperationId } from '../types/index.js';

/**
 * transaction-prefixed JSON-RPC methods.
 *
 * @version v1
 */
export interface TransactionV1 extends GenericJsonRpcApis {
  /**
   * Broadcast an extrinsic to the chain.
   *
   * @rpcname transaction_v1_broadcast
   * @version v1
   */
  transaction_v1_broadcast(tx: HexString): Promise<OperationId | null>;
  /**
   * Stop a broadcasting extrinsic operation
   *
   * @rpcname transaction_v1_stop
   * @version v1
   */
  transaction_v1_stop(operationId: OperationId): Promise<void>;
}
