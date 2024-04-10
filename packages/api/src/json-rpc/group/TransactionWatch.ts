import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { IJsonRpcClient } from '../../types.js';
import { TransactionEvent } from '@dedot/specs';
import { HexString } from '@dedot/utils';
import { Callback, Unsub } from '@dedot/types';

export class TransactionWatch extends JsonRpcGroup {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'transactionWatch', supportedVersions: ['unstable'], ...options });
  }

  async submitAndWatch(tx: HexString, callback: Callback<TransactionEvent>): Promise<Unsub> {
    return this.send('submitAndWatch', tx, callback);
  }
}
