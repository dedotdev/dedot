import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { IJsonRpcClient, TxBroadcaster } from '../../types.js';
import { OperationId } from '@dedot/specs';
import { assert, HexString } from '@dedot/utils';
import { Unsub } from '@dedot/types';

export class Transaction extends JsonRpcGroup implements TxBroadcaster {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'transaction', supportedVersions: ['unstable', 'v1'], ...options });
  }

  async broadcastTx(tx: HexString): Promise<Unsub> {
    const operationId = await this.broadcast(tx);

    return () => {
      return this.stop(operationId);
    };
  }

  async broadcast(tx: string): Promise<OperationId> {
    const operationId = await this.send('broadcast', tx);
    assert(operationId, 'Maximum number of broadcasted transactions has been reached');

    return operationId;
  }

  stop(operationId: OperationId): Promise<void> {
    return this.send('stop', operationId);
  }
}
