import { WebSocket } from '@polkadot/x-ws';
import { assert, DedotError, deferred, Deferred } from '@dedot/utils';
import { SubscriptionProvider } from '../base/index.js';
import { MaxRetryAttemptedError, NetworkDisconnectedError, WsConnectionError } from '../error.js';
import { JsonRpcRequest } from '../types.js';
import { canSendRequestHeaders, validateEndpoint } from '../utils.js';

export interface WsConnectionState {
  /**
   * Connection attempt counter (1 for initial, increments on reconnects)
   * Resets to 1 once a connection has proven healthy (received a message or stayed open long enough)
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

/**
 * A map of custom HTTP headers to send along with the websocket opening handshake
 */
export type WsRequestHeaders = Record<string, string>;

/**
 * Function that returns the request headers to use for a connection attempt
 * @param info Connection attempt information
 * @returns The headers to send along with the websocket opening handshake
 */
export type WsHeadersSelector = (info: WsConnectionState) => WsRequestHeaders | Promise<WsRequestHeaders>;

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
  /**
   * Timeout in milliseconds for establishing the websocket connection (handshake).
   * If the socket does not open within this time, it is force-closed so the next
   * reconnection attempt can rotate to a different endpoint.
   * If the value is <= 0, the connect timeout is disabled.
   *
   * @default 30000
   */
  connectTimeoutMs?: number;
  /**
   * Custom HTTP headers to send along with the websocket opening handshake,
   * e.g: an auth token for a private RPC endpoint or proxy.
   *
   * Can be either a static map of headers or a function returning the headers,
   * the function is called on every connection attempt (including reconnects),
   * which is helpful to refresh short-lived tokens or to use different
   * credentials per endpoint.
   *
   * Note: Custom headers are only supported in non-browser environments (Node.js, Bun),
   * browsers do not allow setting headers for the websocket opening handshake.
   * A warning will be logged and the headers ignored if the environment does not support this.
   *
   * @default undefined
   */
  headers?: WsRequestHeaders | WsHeadersSelector;
}

/**
 * Constructor signature of websocket implementations accepting connection options.
 *
 * `@polkadot/x-ws` resolves to the global WebSocket when one is available and falls back
 * to the `ws` package otherwise, so the implementation in use depends on the runtime:
 * Node.js only defines a global WebSocket from v22 onwards (or from v20.10 when started
 * with `--experimental-websocket`), while Bun always provides one.
 *
 * Both implementations accept an options object as the second constructor argument.
 */
type WebSocketWithOptions = new (url: string, options: { headers: WsRequestHeaders }) => WebSocket;

const DEFAULT_OPTIONS: Partial<WsProviderOptions> = {
  retryDelayMs: 2500,
  timeout: 30_000,
  connectTimeoutMs: 30_000,
};

// No resubscribe subscriptions these prefixes on reconnect
const NO_RESUBSCRIBE_PREFIXES = ['author_', 'chainHead_', 'transactionWatch_'];

// How long a connection must stay open before it is considered healthy and the
// retry attempt counter is reset. A connection that drops before this window
// (or before receiving any message) does not reset the attempt counter.
const HEALTHY_CONNECTION_THRESHOLD_MS = 10_000;

// How long an endpoint that failed is avoided by array failover. The memory is time-based
// rather than cleared by the next working connection: an endpoint that connects and answers
// can still be unusable for the client (which then asks for a switch), and it must not
// make the provider forget the endpoints that failed just before it.
const FAILED_ENDPOINT_COOLDOWN_MS = 60_000;

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
 * // With custom request headers (Node.js/Bun only), e.g: to authenticate with a private RPC
 * const provider = new WsProvider({
 *   endpoint: 'wss://private.rpc',
 *   headers: {
 *     Authorization: `Bearer ${process.env.API_TOKEN}`,
 *     'X-Client-ID': 'example-client',
 *   },
 * });
 *
 * // Headers can also be resolved on each connection attempt (e.g: to refresh short-lived tokens)
 * const provider = new WsProvider({
 *   endpoint: 'wss://private.rpc',
 *   headers: async () => ({ Authorization: `Bearer ${await fetchToken()}` }),
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
  #connectTimer?: ReturnType<typeof setTimeout>;
  #healthyTimer?: ReturnType<typeof setTimeout>;

  // Connection state tracking
  #attempt: number = 0;
  #currentEndpoint?: string;
  #initialized: boolean = false;

  // Endpoints that failed recently and when (for array failover).
  // Excluded from selection until they cool down or every endpoint has been excluded.
  #failedEndpoints: Map<string, number> = new Map();

  // Recovering promise for request queueing during reconnection
  #recovering?: Deferred<void>;

  // Only warn once per provider instance if custom headers are not supported by the environment
  #headersUnsupportedWarned: boolean = false;

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

  /**
   * Whether automatic reconnection/retry is enabled (retryDelayMs > 0)
   */
  get retryEnabled(): boolean {
    return this.#retryEnabled;
  }

  /**
   * Maximum number of retry attempts before giving up, `undefined` means retrying indefinitely
   */
  get maxRetryAttempts(): number | undefined {
    return this.#options.maxRetryAttempts;
  }

  /**
   * Delay in milliseconds between retry attempts
   */
  get retryDelayMs(): number {
    return this.#options.retryDelayMs;
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

    if (Array.isArray(endpoint)) {
      return this.#pickEndpointFromArray(endpoint);
    }

    return endpoint;
  }

  /**
   * Pick an endpoint from the array, preferring ones that haven't failed recently.
   * Excludes the current endpoint and any endpoint that failed within the cooldown
   * window. When every endpoint has been excluded, the failure memory is
   * reset so the full list becomes available again.
   */
  #pickEndpointFromArray(endpoints: string[]): string {
    const now = Date.now();
    const excluded = new Set<string>();
    this.#failedEndpoints.forEach((failedAt, endpoint) => {
      if (now - failedAt < FAILED_ENDPOINT_COOLDOWN_MS) {
        excluded.add(endpoint);
      } else {
        this.#failedEndpoints.delete(endpoint);
      }
    });
    if (this.#currentEndpoint) excluded.add(this.#currentEndpoint);

    let candidates = endpoints.filter((e) => !excluded.has(e));

    // Everything has been excluded - reset failure memory and retry the whole list,
    // still preferring an endpoint different from the current one when possible.
    if (candidates.length === 0) {
      this.#failedEndpoints.clear();

      candidates = this.#currentEndpoint ? endpoints.filter((e) => e !== this.#currentEndpoint) : endpoints;
      if (candidates.length === 0) candidates = endpoints;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Create the underlying WebSocket instance. Extracted so it can be overridden in tests.
   */
  protected createWebSocket(endpoint: string, headers?: WsRequestHeaders): WebSocket {
    // The options must be passed as the second constructor argument, which is accepted by
    // both the `ws` package and the native WebSocket implementation. Passing them as a third
    // argument only works for the `ws` package, the native implementation ignores it
    // and the headers would be dropped silently.
    // The type definitions from `@polkadot/x-ws` only expose the WHATWG (browser) signature
    return headers
      ? new (WebSocket as unknown as WebSocketWithOptions)(endpoint, { headers })
      : new WebSocket(endpoint);
  }

  /**
   * Get the custom request headers for the current connection attempt,
   * either directly or by calling the headers selector function
   *
   * @returns The headers to use, or `undefined` if no headers should be sent
   */
  async #getHeaders(): Promise<WsRequestHeaders | undefined> {
    const { headers } = this.#options;
    if (!headers) return undefined;

    if (!canSendRequestHeaders()) {
      if (!this.#headersUnsupportedWarned) {
        this.#headersUnsupportedWarned = true;
        console.warn(
          'Custom websocket request headers are not supported in this environment (e.g: browsers), headers will be ignored',
        );
      }

      return undefined;
    }

    const info: WsConnectionState = {
      attempt: this.#attempt,
      currentEndpoint: this.#currentEndpoint,
    };

    const resolved = typeof headers === 'function' ? await headers(info) : headers;
    if (!resolved || Object.keys(resolved).length === 0) return undefined;

    return resolved;
  }

  async #doConnect() {
    assert(!this.#ws, 'Websocket connection already exists');

    try {
      this.#currentEndpoint = await this.#getEndpoint();

      const headers = await this.#getHeaders();

      this.#ws = this.createWebSocket(this.#currentEndpoint, headers);
      this.#ws.onopen = this.#onSocketOpen;
      this.#ws.onclose = this.#onSocketClose;
      this.#ws.onmessage = this.#onSocketMessage;
      this.#ws.onerror = this.#onSocketError;

      this.#setupConnectTimeoutHandler();
      this.#setupRequestTimeoutHandler();
    } catch (e: any) {
      console.error('Error connecting to websocket', e);
      // The endpoint failed to connect - remember it so array failover avoids it
      if (this.#currentEndpoint) this.#failedEndpoints.set(this.#currentEndpoint, Date.now());
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
      if (!this.#retryEnabled) {
        throw e;
      }

      // Either schedules the next attempt, or emits a MaxRetryAttemptedError when the attempts
      // are exhausted so a pending connect() rejects instead of waiting forever
      this.#retry();
    }
  }

  #retry(immediate?: boolean) {
    if (immediate !== true && !this.#retryEnabled) return;

    if (this.#canRetry) {
      setTimeout(
        () => {
          this._setStatus('reconnecting');
          this.#connectAndRetry().catch(console.error);
        },
        immediate ? 0 : this.#options.retryDelayMs,
      );
    } else {
      const error = new MaxRetryAttemptedError(
        `Cannot reconnect to network after ${this.#options.maxRetryAttempts} retry attempts`,
      );

      // Reject the recovering promise, which will reject all queued requests
      if (this.#recovering) {
        this.#recovering.resolve();
        this.#recovering = undefined;
      }

      this.emit('error', error);
      this._setStatus('disconnected');
    }
  }

  #onSocketOpen = async () => {
    // The handshake completed - cancel the connect timeout
    this.#clearConnectTimeoutHandler();

    // Arm the healthy-connection timer. The attempt counter / failure memory are only
    // reset once the connection has proven healthy (stayed open long enough or received
    // a message), not merely because the socket opened - an endpoint that opens then
    // immediately drops must keep accumulating attempts.
    this.#armHealthyConnectionTimer();

    this._setStatus('connected', this.#currentEndpoint);

    // Resolve the recovering promise FIRST to allow queued requests to proceed
    if (this.#recovering) {
      this.#recovering.resolve();
      this.#recovering = undefined;
    }

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

    // retry pending requests that were queued during disconnection
    const pendingHandlers = Object.entries(this._handlers);
    if (pendingHandlers.length > 0) {
      for (const [oldIdStr, { defer, request }] of pendingHandlers) {
        const oldId = Number(oldIdStr);

        // Skip non-retryable requests - reject them with NetworkDisconnectedError
        if (NO_RESUBSCRIBE_PREFIXES.some((prefix) => request.method.startsWith(prefix))) {
          defer.reject(new NetworkDisconnectedError(`disconnected from ${this.#currentEndpoint}, request rejected`));
          delete this._handlers[oldId];
          continue;
        }

        // Retry retryable requests - call send() which creates a new handler entry
        this.send(request.method, request.params)
          .then((result) => defer.resolve(result))
          .catch((e) => defer.reject(e));

        // Remove old handler entry
        delete this._handlers[oldId];
      }
    }

    // Restart timeout handler for pending requests
    this.#setupRequestTimeoutHandler();
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
    this.#clearConnectTimeoutHandler();
    this.#clearHealthyConnectionTimer();
  }

  #onSocketClose = (event: CloseEvent) => {
    this.#clearWs();
    this.#clearTimeoutHandler();
    this.#clearConnectTimeoutHandler();
    this.#clearHealthyConnectionTimer();

    // Keep _handlers intact for retry on reconnect, they will be processed in #onSocketOpen
    this._pendingNotifications = {};

    this._setStatus('disconnected');

    // attempt to reconnect if the connection was not closed manually (via .disconnect())
    const normalClosure = event.code === 1000;
    if (!normalClosure) {
      // Remember the endpoint that just dropped so array failover prefers a different one
      if (this.#currentEndpoint) this.#failedEndpoints.set(this.#currentEndpoint, Date.now());

      // Initialize recovering promise to queue incoming requests during reconnection
      this.#recovering = deferred<void>();

      console.warn(`disconnected from ${this.#currentEndpoint}: ${event.code} - ${event.reason}, reconnecting...`);

      const shouldRetryImmediate = !event.code || event.code === 1005; // no code available or no status received
      this.#retry(shouldRetryImmediate);
    }
  };

  #onSocketError = (error: Event) => {
    this.emit('error', new WsConnectionError(`Websocket connection error from ${this.#currentEndpoint}`, error));
  };

  #onSocketMessage = (message: MessageEvent<string>) => {
    // Receiving a message proves the endpoint is responsive - mark the connection healthy
    this.#onHealthyConnection();
    this._onReceiveResponse(message.data);
  };

  #armHealthyConnectionTimer() {
    this.#clearHealthyConnectionTimer();

    const threshold = HEALTHY_CONNECTION_THRESHOLD_MS;
    if (threshold <= 0) {
      this.#onHealthyConnection();
      return;
    }

    this.#healthyTimer = setTimeout(() => this.#onHealthyConnection(), threshold);
  }

  #clearHealthyConnectionTimer() {
    if (!this.#healthyTimer) return;

    clearTimeout(this.#healthyTimer);
    this.#healthyTimer = undefined;
  }

  /**
   * Called once a connection has proven healthy. Resets the retry attempt counter.
   * The failed-endpoint memory is left alone, it expires on its own.
   */
  #onHealthyConnection() {
    this.#clearHealthyConnectionTimer();
    this.#attempt = 0;
  }

  #setupConnectTimeoutHandler() {
    const connectTimeout = this.#options.connectTimeoutMs;
    if (connectTimeout <= 0) return;

    this.#clearConnectTimeoutHandler();

    this.#connectTimer = setTimeout(() => {
      console.warn(`Connection to ${this.#currentEndpoint} timed out after ${connectTimeout}ms, reconnecting...`);
      // Force-close the half-open socket; the close handler will trigger a retry
      // that rotates to a different endpoint.
      this.#ws?.close();
    }, connectTimeout);
  }

  #clearConnectTimeoutHandler() {
    if (!this.#connectTimer) return;

    clearTimeout(this.#connectTimer);
    this.#connectTimer = undefined;
  }

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
      // Kept as an array - endpoint selection (with failure memory) happens in #getEndpoint
    }

    return normalizedOptions as Required<WsProviderOptions>;
  }

  async disconnect(switchEndpoint?: boolean): Promise<void> {
    try {
      assert(this.#ws, 'Websocket connection does not exist');

      if (!!switchEndpoint) {
        this.#ws.close();
      } else {
        // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
        this.#ws.close(1000); // Normal closure
        this._setStatus('disconnected');

        if (this.#recovering) {
          this.#recovering.resolve();
          this.#recovering = undefined;
        }

        this._cleanUp();
      }
    } catch (error: any) {
      console.error('Error disconnecting from websocket', error);
      this.emit('error', error);

      throw error;
    }
  }

  override async send<T = any>(method: string, params: any[]): Promise<T> {
    // Wait for recovery if reconnection is in progress
    if (this.#recovering) {
      await this.#recovering.promise;
    }

    return super.send(method, params);
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
