import { JsonRpcRequest } from '@dedot/providers';
import type { Chain } from 'smoldot';
import { SubscriptionProvider } from '../base/index.js';

/**
 * @name SmoldotProvider
 */
export class SmoldotProvider extends SubscriptionProvider {
  #chain: Chain;

  constructor(chain: Chain) {
    super();
    this.#chain = chain;
  }

  async connect(): Promise<this> {
    this._setStatus('connected');
    this.#startPullingResponses();

    return this;
  }

  #startPullingResponses() {
    (async () => {
      // TODO handle disconnection & clean up properly
      while (true) {
        if (this.status === 'disconnected') break;

        try {
          const rawResponse = await this.#chain.nextJsonRpcResponse();
          this._onReceiveResponse(rawResponse);
        } catch (e: any) {
          // TODO should we handle any specific errors from smoldot?
          //     AlreadyDestroyedError, JsonRpcDisabledError, QueueFullError
          this.emit('error', e);
        }
      }
    })();
  }

  async disconnect(): Promise<void> {
    this._setStatus('disconnected');
    // TODO how can we reconnect after disconnecting if we call `remove()` here?
    this.#chain.remove();
  }

  protected async doSend(request: JsonRpcRequest) {
    console.log('>> RPC:', request.method);
    this.#chain.sendJsonRpc(JSON.stringify(request));
  }
}
