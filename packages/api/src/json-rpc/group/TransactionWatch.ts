import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { IJsonRpcClient, TxBroadcaster } from '../../types.js';
import { TransactionEvent } from '@dedot/specs';
import { HexString, noop } from '@dedot/utils';
import { Callback, Unsub } from '@dedot/types';

export class TransactionWatch extends JsonRpcGroup implements TxBroadcaster {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'transactionWatch', supportedVersions: ['unstable'], ...options });
  }

  broadcastTx(tx: HexString): Promise<Unsub> {
    return this.submitAndWatch(tx, noop);
  }

  async submitAndWatch(tx: HexString, callback: Callback<TransactionEvent>): Promise<Unsub> {
    return this.send('submitAndWatch', tx, callback);
  }
}
