import { JsonRpcRequest } from '@dedot/providers';
import { assert } from '@dedot/utils';
import type { Chain } from 'smoldot';
import { SubscriptionProvider } from '../base/index.js';

/**
 * @name SmoldotProvider
 */
export class SmoldotProvider extends SubscriptionProvider {
  #chain?: Promise<Chain>;

  constructor(chain: Chain | Promise<Chain>) {
    super();
    this.setChain(chain);
  }

  chain(): Promise<Chain> {
    assert(this.#chain, 'Smoldot chain is not available');
    return this.#chain;
  }

  setChain(chain: Chain | Promise<Chain>) {
    assert(this.status === 'disconnected', 'Smoldot chain cannot be changed while connected');
    this.#chain = chain instanceof Promise ? chain : Promise.resolve(chain);
  }

  async connect(): Promise<this> {
    await this.chain(); // make sure the chain promise is completely resolved
    this._setStatus('connected');
    this.#startPullingResponses();

    return this;
  }

  #startPullingResponses() {
    (async () => {
      while (true) {
        if (this.status === 'disconnected') break;

        try {
          const chain = await this.chain();
          const rawResponse = await chain.nextJsonRpcResponse();
          this._onReceiveResponse(rawResponse);
        } catch (e: any) {
          this.emit('error', e);
        }
      }
    })();
  }

  /**
   * Disconnect the provider & remove the chain
   *
   * To reconnect again, make sure set a new `smoldot.Chain` instance
   * via `setChain` first & call `connect`
   */
  async disconnect(): Promise<void> {
    this._setStatus('disconnected');
    (await this.chain()).remove();
    this.#chain = undefined;
    this._cleanUp();
  }

  protected async doSend(request: JsonRpcRequest) {
    assert(this.status === 'connected', 'The provider is not connected, please call .connect() first.');

    const chain = await this.chain();
    chain.sendJsonRpc(JSON.stringify(request));
  }
}
