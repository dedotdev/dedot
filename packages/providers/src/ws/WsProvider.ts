import { WebSocket } from '@polkadot/x-ws';
import { assert, DedotError, waitFor } from '@dedot/utils';
import { SubscriptionProvider } from '../base/index.js';
import { MaxRetryAttemptedError } from '../error.js';
import { JsonRpcRequest } from '../types.js';
import { pickRandomItem, validateEndpoint } from '../utils.js';

export interface WsConnectionState {
  /**
   * Connection attempt counter (1 for initial, increments on reconnects)
   * Resets to 1 after a successful connection
   */
  attempt: number;

  /**
   * The current endpoint being connected to or the last successfully connected endpoint
   */
  currentEndpoint?: string;
}

/**
 * Function that returns an endpoint string when called
 * @param info Connection attempt information
 * @returns A valid websocket endpoint string
 */
export type WsEndpointSelector = (info: WsConnectionState) => string | Promise<string>;

export interface WsProviderOptions {
  /**
   * The websocket endpoint to connect to. Can be:
   * - A single endpoint string (e.g., 'wss://rpc.polkadot.io')
   * - An array of endpoints for automatic failover
   * - A function that returns an endpoint for advanced endpoint selection logic
   *
   * Valid endpoints must start with `wss://` or `ws://`.
   *
   * When an array is provided, endpoints are randomly selected on initial connection
   * and reconnection attempts will prefer different endpoints when possible.
   *
   * @required
   */
  endpoint: string | string[] | WsEndpointSelector;
  /**
   * Delay in milliseconds before retrying to connect
   * If the value is <= 0, retry will be disabled
   *
   * @default 2500
   */
  retryDelayMs?: number;
  /**
   * Maximum number of retry attempts before giving up
   * If not provided or set to undefined, will retry to connect forever (current behavior)
   * If set to 0, no retries will be attempted
   *
   * @default undefined (retry forever)
   */
  maxRetryAttempts?: number;
  /**
   * Timeout in milliseconds for the request,
   * an error will be thrown if the request takes longer than this value
   *
   * @default 30000
   */
  timeout?: number;
}

const DEFAULT_OPTIONS: Partial<WsProviderOptions> = {
  retryDelayMs: 2500,
  timeout: 30_000,
};

// No resubscribe subscriptions these prefixes on reconnect
const NO_RESUBSCRIBE_PREFIXES = ['author_', 'chainHead_', 'transactionWatch_'];

/**
 * @name WsProvider
 * @description A JSON-RPC provider that connects to WebSocket endpoints with support for
 * single endpoint, multiple endpoints for failover, and custom endpoint selection logic.
 *
 * @example
 * ```ts
 * // Single endpoint
 * const provider = new WsProvider('wss://rpc.polkadot.io');
 *
 * // Multiple endpoints for automatic failover
 * const provider = new WsProvider([
 *   'wss://rpc.polkadot.io',
 *   'wss://polkadot-rpc.dwellir.com',
 *   'wss://polkadot.api.onfinality.io/public-ws'
 * ]);
 *
 * // With retry limit - stop after 5 failed attempts
 * const provider = new WsProvider({
 *   endpoint: 'wss://rpc.polkadot.io',
 *   maxRetryAttempts: 5,
 *   retryDelayMs: 3000
 * });
 *
 * // Custom endpoint selector
 * const provider = new WsProvider((info) => {
 *   console.log(`Connection attempt ${info.attempt}`);
 *   return info.attempt >= 3 ? 'wss://backup.rpc' : 'wss://primary.rpc';
 * });
 *
 * await provider.connect();
 *
 * // Fetch the genesis hash
 * const genesisHash = await provider.send('chain_getBlockHash', [0]);
 * console.log(genesisHash);
 *
 * // Subscribe to new heads
 * await provider.subscribe(
 *   {
 *     subname: 'chain_newHead',
 *     subscribe: 'chain_subscribeNewHeads',
 *     params: [],
 *     unsubscribe: 'chain_unsubscribeNewHeads',
 *   },
 *   (error, newHead, subscription) => {
 *     console.log('newHead', newHead);
 *   },
 * );
 *
 * await provider.disconnect();
 * ```
 */
export class WsProvider extends SubscriptionProvider {
  #options: Required<WsProviderOptions>;
  #ws?: WebSocket;
  #timeoutTimer?: ReturnType<typeof setInterval>;

  // Connection state tracking
  #attempt: number = 0;
  #currentEndpoint?: string;
  #initialized: boolean = false;

  constructor(options: WsProviderOptions | string | string[] | WsEndpointSelector) {
    super();

    this.#options = this.#normalizeOptions(options);
  }

  async connect(): Promise<this> {
    this.#connectAndRetry().catch(console.error);
    return this.#untilConnected();
  }

  #untilConnected = (): Promise<this> => {
    return new Promise((resolve, reject) => {
      const doResolve = () => {
        this.#initialized = true;
        resolve(this);
        this.off('error', attemptReject);
      };

      const doReject = (error: Error) => {
        reject(error);
        this.off('connected', doResolve);
      };

      this.once('connected', doResolve);

      const attemptReject = (e: Error) => {
        if (this.#retryEnabled) {
          if (e instanceof MaxRetryAttemptedError) {
            doReject(e);
          }
        } else {
          doReject(e);
        }
      };

      this.on('error', attemptReject);
    });
  };

  get #retryEnabled() {
    return this.#options.retryDelayMs > 0;
  }

  get #canRetry() {
    if (!this.#retryEnabled) return false;

    const { maxRetryAttempts } = this.#options;

    if (maxRetryAttempts === undefined) return true;

    // if the provider is not yet initialized,
    // the first initial connect attempt will not be counted as a retry
    const initialAttempt = this.#initialized ? 0 : 1;
    return this.#attempt - initialAttempt < maxRetryAttempts;
  }

  /**
   * Get the current endpoint, either directly or by calling the endpoint selector function
   */
  async #getEndpoint(): Promise<string> {
    const endpoint = this.#options.endpoint;

    if (typeof endpoint === 'function') {
      // Create a connection state object to pass to the endpoint selector
      const info: WsConnectionState = {
        attempt: this.#attempt,
        currentEndpoint: this.#currentEndpoint,
      };

      return validateEndpoint(
        await endpoint(info), // --
      );
    }

    // If endpoint is an array, this should not happen as arrays are converted to functions in #normalizeOptions
    // But we add this check for type safety
    if (Array.isArray(endpoint)) {
      throw new DedotError('Endpoint array should have been converted to a selector function');
    }

    return endpoint;
  }

  async #doConnect() {
    assert(!this.#ws, 'Websocket connection already exists');

    try {
      this.#currentEndpoint = await this.#getEndpoint();

      this.#ws = new WebSocket(this.#currentEndpoint);
      this.#ws.onopen = this.#onSocketOpen;
      this.#ws.onclose = this.#onSocketClose;
      this.#ws.onmessage = this.#onSocketMessage;
      this.#ws.onerror = this.#onSocketError;

      this.#setupRequestTimeoutHandler();
    } catch (e: any) {
      console.error('Error connecting to websocket', e);
      this.emit('error', e);
      throw e;
    }
  }

  async #connectAndRetry() {
    assert(!this.#ws, 'Websocket connection already exists');

    this.#attempt += 1;

    try {
      await this.#doConnect();
    } catch (e) {
      if (!this.#canRetry) {
        throw e;
      }

      this.#retry();
    }
  }

  #retry() {
    if (!this.#retryEnabled) return;

    if (this.#canRetry) {
      setTimeout(() => {
        this._setStatus('reconnecting');
        this.#connectAndRetry().catch(console.error);
      }, this.#options.retryDelayMs);
    } else {
      const error = new MaxRetryAttemptedError(
        `Cannot reconnect to network after ${this.#options.maxRetryAttempts} retry attempts`,
      );

      this.emit('error', error);
      this._setStatus('disconnected');
    }
  }

  #onSocketOpen = async (event: Event) => {
    // Connection successful - reset attempt counter
    this.#attempt = 0;

    this._setStatus('connected', this.#currentEndpoint);

    // re-subscribe to previous subscriptions if this is a reconnect
    Object.keys(this._subscriptions).forEach((subkey) => {
      const { input, callback, subscription } = this._subscriptions[subkey];

      if (NO_RESUBSCRIBE_PREFIXES.some((prefix) => input.subscribe.startsWith(prefix))) {
        delete this._subscriptions[subkey];
        return;
      }

      this.subscribe(input, callback).then((newsub) => {
        // Remove the old subscription record
        delete this._subscriptions[subkey];

        // This is a bit of a hack, but we need to update the subscription object
        // So that the old/prev-unsubscribe method will work correctly
        Object.assign(subscription, newsub);
      });
    });
  };

  #clearWs() {
    if (!this.#ws) return;

    this.#ws.onclose = null;
    this.#ws.onerror = null;
    this.#ws.onmessage = null;
    this.#ws.onopen = null;
    this.#ws = undefined;
  }

  #setupRequestTimeoutHandler() {
    const timeout = this.#options.timeout;
    if (timeout <= 0) return;

    this.#clearTimeoutHandler();

    this.#timeoutTimer = setInterval(() => {
      const now = Date.now();

      Object.values(this._handlers).forEach(({ from, defer, request }) => {
        if (now - from > timeout) {
          defer.reject(new DedotError(`Request timed out after ${timeout}ms`));
          delete this._handlers[request.id];
        }
      });
    }, 5_000);
  }

  #clearTimeoutHandler() {
    if (!this.#timeoutTimer) return;

    clearInterval(this.#timeoutTimer);
    this.#timeoutTimer = undefined;
  }

  protected override _cleanUp() {
    super._cleanUp();
    this.#clearWs();
    this.#clearTimeoutHandler();
  }

  #onSocketClose = (event: CloseEvent) => {
    this.#clearWs();

    const error = new DedotError(`disconnected from ${this.#currentEndpoint}: ${event.code} - ${event.reason}`);

    // Reject all pending requests
    Object.values(this._handlers).forEach(({ defer }) => {
      defer.reject(error);
    });

    this._handlers = {};
    this._pendingNotifications = {};

    this._setStatus('disconnected');

    // attempt to reconnect if the connection was not closed manually (via .disconnect())
    const normalClosure = event.code === 1000;
    if (!normalClosure) {
      console.error(error.message);
      this.#retry();
    }
  };

  #onSocketError = (error: Event) => {
    this.emit('error', error);
  };

  #onSocketMessage = (message: MessageEvent<string>) => {
    this._onReceiveResponse(message.data);
  };

  #normalizeOptions(options: WsProviderOptions | string | string[] | WsEndpointSelector): Required<WsProviderOptions> {
    const normalizedOptions =
      typeof options === 'string' || typeof options === 'function' || Array.isArray(options)
        ? {
            ...DEFAULT_OPTIONS,
            endpoint: options,
          }
        : {
            ...DEFAULT_OPTIONS,
            ...options,
          };

    // Handle different endpoint types
    const { endpoint } = normalizedOptions;

    if (typeof endpoint === 'string') {
      validateEndpoint(endpoint);
    } else if (Array.isArray(endpoint)) {
      if (endpoint.length === 0) {
        throw new DedotError('Endpoint array cannot be empty');
      }

      endpoint.forEach(validateEndpoint);

      normalizedOptions.endpoint = (info: WsConnectionState) => {
        return pickRandomItem(endpoint, info.currentEndpoint);
      };
    }

    return normalizedOptions as Required<WsProviderOptions>;
  }

  async disconnect(): Promise<void> {
    try {
      assert(this.#ws, 'Websocket connection does not exist');
      // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
      this.#ws.close(1000); // Normal closure
      this._setStatus('disconnected');
      this._cleanUp();
    } catch (error: any) {
      console.error('Error disconnecting from websocket', error);
      this.emit('error', error);

      throw error;
    }
  }

  protected override async doSend(request: JsonRpcRequest): Promise<void> {
    assert(this.#ws && this.status === 'connected', 'Websocket connection is not connected');
    this.#ws.send(JSON.stringify(request));
  }

  /**
   * Unsafe access to the websocket instance, use with caution.
   * Currently only used for testing
   */
  protected __unsafeWs(): WebSocket | undefined {
    return this.#ws;
  }
}
