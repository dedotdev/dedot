import { Callback, Unsub } from '@dedot/types';
import { TransactionWatchEvent } from '@dedot/types/json-rpc';
import { HexString, noop } from '@dedot/utils';
import { IJsonRpcClient, TxBroadcaster } from '../../public-types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';

export class TransactionWatch extends JsonRpcGroup implements TxBroadcaster {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'transactionWatch', supportedVersions: ['unstable'], ...options });
  }

  broadcastTx(tx: HexString): Promise<Unsub> {
    return this.submitAndWatch(tx, noop);
  }

  async submitAndWatch(tx: HexString, callback: Callback<TransactionWatchEvent>): Promise<Unsub> {
    return this.send('submitAndWatch', tx, callback);
  }
}
