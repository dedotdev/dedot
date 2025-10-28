import { Unsub } from '@dedot/types';
import { OperationId } from '@dedot/types/json-rpc';
import { assert, HexString } from '@dedot/utils';
import { IJsonRpcClient, TxBroadcaster } from '../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';

export class Transaction extends JsonRpcGroup implements TxBroadcaster {
  constructor(client: IJsonRpcClient<any>, options?: Partial<JsonRpcGroupOptions>) {
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
