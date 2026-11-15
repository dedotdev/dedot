import { MaxRetryAttemptedError, WsProvider, type WsProviderOptions } from '@dedot/providers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseSubstrateClient } from '../BaseSubstrateClient.js';

type Responder = (endpoint: string, method: string, params: any[]) => any;

// A websocket that opens on its own and answers every request through the responder,
// so the real WsProvider reconnection logic runs without any network
class FakeSocket {
  onopen: any = null;
  onclose: any = null;
  onmessage: any = null;
  onerror: any = null;
  readyState = 0;

  constructor(
    public url: string,
    private respond: Responder,
  ) {
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.({});
    }, 0);
  }

  send(data: string) {
    const { id, method, params } = JSON.parse(data);

    setTimeout(() => {
      if (this.readyState !== 1) return;

      this.onmessage?.({
        data: JSON.stringify({ jsonrpc: '2.0', id, result: this.respond(this.url, method, params) }),
      });
    }, 0);
  }

  close(code?: number) {
    if (this.readyState === 3) return;
    this.readyState = 3;

    // No status code is what a real socket reports for `close()` without arguments
    setTimeout(() => this.onclose?.({ code: code ?? 1005, reason: '' }), 0);
  }
}

class FakeWsProvider extends WsProvider {
  sockets: FakeSocket[] = [];

  constructor(
    options: WsProviderOptions,
    private respond: Responder,
  ) {
    super(options);
  }

  protected override createWebSocket(endpoint: string): any {
    const socket = new FakeSocket(endpoint, this.respond);
    this.sockets.push(socket);
    return socket;
  }

  get visited(): string[] {
    return this.sockets.map((s) => s.url);
  }
}

const BAD_1 = 'ws://bad-1';
const BAD_2 = 'ws://bad-2';
const GOOD = 'ws://good';

// Every endpoint connects and answers, the bad ones just answer with something unusable
const respond: Responder = (endpoint) => (endpoint === GOOD ? 'good' : 'bad');

class TestClient extends BaseSubstrateClient {
  subscribed = false;
  initializations = 0;

  constructor(provider: WsProvider) {
    super('legacy', { provider, cacheMetadata: false, stalingDetectionTimeout: 0 });
  }

  // Same shape as the real clients: one-off setup is only done on the first initialization,
  // which is recognized by the genesis hash not being known yet
  protected override async doInitialize() {
    this.initializations += 1;
    const shouldInitialize = !this._genesisHash;

    this._genesisHash = '0x00';

    const chain = await this.rpc.system_chain();
    if (chain !== 'good') throw new Error(`cannot initialize, endpoint answered: ${chain}`);

    if (shouldInitialize) {
      this.subscribed = true;
    }
  }

  get query(): any {
    return {};
  }

  get tx(): any {
    return {};
  }

  protected callAt(): any {
    return {};
  }

  at(): any {
    return Promise.resolve({});
  }
}

describe('Endpoint failover on initialization failures', () => {
  let client: TestClient | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await client?.disconnect().catch(() => {});
    client = undefined;
  });

  const silenceLogs = () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  };

  it('moves on to a healthy endpoint when the first one cannot be initialized', async () => {
    silenceLogs();
    // Always pick the first candidate, so the bad endpoint is tried first
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const provider = new FakeWsProvider({ endpoint: [BAD_1, GOOD], retryDelayMs: 20 }, respond);
    client = new TestClient(provider);

    await expect(client.connect()).resolves.toBe(client);
    expect(provider.visited).toEqual([BAD_1, GOOD]);
  });

  it('starts over from scratch on the next endpoint after a half-finished initialization', async () => {
    silenceLogs();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const provider = new FakeWsProvider({ endpoint: [BAD_1, GOOD], retryDelayMs: 20 }, respond);
    client = new TestClient(provider);

    await client.connect();

    // The failed attempt already recorded the genesis hash; if that leaked into the second attempt
    // it would be mistaken for a reconnect and the one-off setup would be skipped for good
    expect(client.initializations).toBe(2);
    expect(client.subscribed).toBe(true);
  });

  it('does not bounce between unusable endpoints when a healthy one is left to try', async () => {
    silenceLogs();
    // Worst case: always pick the first candidate
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const provider = new FakeWsProvider({ endpoint: [BAD_1, BAD_2, GOOD], retryDelayMs: 20 }, respond);
    client = new TestClient(provider);

    await client.connect();

    // Both bad endpoints answer requests, which must not make the provider forget
    // the one that failed before - otherwise it would go BAD_1, BAD_2, BAD_1, BAD_2, ...
    expect(provider.visited).toEqual([BAD_1, BAD_2, GOOD]);
  });

  it('gives up after maxRetryAttempts when no endpoint can be initialized', async () => {
    silenceLogs();

    const retryDelayMs = 100;
    const provider = new FakeWsProvider({ endpoint: [BAD_1, BAD_2], retryDelayMs, maxRetryAttempts: 2 }, respond);
    client = new TestClient(provider);

    const startedAt = Date.now();
    await expect(client.connect()).rejects.toThrow('cannot initialize, endpoint answered: bad');

    // Initial attempt + 2 switches. The endpoints answer every request, which keeps resetting the
    // provider's own attempt counter, so the client has to do the counting.
    expect(provider.sockets.length).toBe(3);
    // The first switch is immediate, the second one waits for the retry delay
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(retryDelayMs - 10);
  }, 5_000);

  it('still rejects with MaxRetryAttemptedError when the endpoints cannot even be reached', async () => {
    silenceLogs();

    class UnreachableProvider extends FakeWsProvider {
      protected override createWebSocket(endpoint: string): any {
        const socket = super.createWebSocket(endpoint);
        // Fail the handshake instead of opening
        socket.readyState = 3;
        setTimeout(() => socket.onclose?.({ code: 1006, reason: '' }), 0);
        return socket;
      }
    }

    const provider = new UnreachableProvider(
      { endpoint: [BAD_1, BAD_2], retryDelayMs: 20, maxRetryAttempts: 2 },
      respond,
    );
    client = new TestClient(provider);

    await expect(client.connect()).rejects.toThrow(MaxRetryAttemptedError);
  }, 5_000);
});
