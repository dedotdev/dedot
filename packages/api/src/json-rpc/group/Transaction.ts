import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { IJsonRpcClient } from '../../types.js';
import { OperationId } from '@dedot/specs';
import { assert } from '@dedot/utils';

export class Transaction extends JsonRpcGroup {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'transaction', supportedVersions: ['unstable', 'v1'], ...options });
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
