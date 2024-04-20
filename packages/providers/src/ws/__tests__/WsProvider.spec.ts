import { JsonRpcRequest, JsonRpcResponse } from '@dedot/providers';
import { Client, Server } from 'mock-socket';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { WsProvider } from '../WsProvider.js';

const FAKE_WS_URL = 'ws://127.0.0.1:9944';

vi.mock('@polkadot/x-ws', async (importOriginal) => {
  const { WebSocket } = await import('mock-socket');
  const mod = await importOriginal<typeof import('@polkadot/x-ws')>();
  return {
    ...mod,
    WebSocket,
  };
});

describe('WsProvider', () => {
  let mockServer: Server;

  beforeAll(() => {
    const sendResponse = (socket: Client, message: JsonRpcRequest) => {
      socket.send(JSON.stringify({ id: message.id, jsonrpc: '2.0', result: 'ok' } as JsonRpcResponse<string>));
    };

    mockServer = new Server(FAKE_WS_URL);

    mockServer.on('connection', (socket) => {
      socket.on('message', (data) => {
        const message: JsonRpcRequest = JSON.parse(data.toString());
        if (message.method === 'delayed_method') {
          setTimeout(() => {
            sendResponse(socket, message);
          }, 60_000);
        } else {
          sendResponse(socket, message);
        }
      });
    });
  });

  afterAll(() => {
    mockServer.stop();
  });

  it('connects to a valid websocket endpoint', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await expect(provider.connect()).resolves.toBe(provider);
  });

  it('throws an error when connecting to an invalid websocket endpoint', async () => {
    const provider = new WsProvider({ endpoint: 'ws://localhost:1234', retryDelayMs: -1 });
    await expect(provider.connect()).rejects.toThrow();
  });

  it('sends a JSON-RPC request over the websocket connection', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await provider.connect();
    await expect(provider.send('method', ['param1', 'param2'])).resolves.toEqual('ok');
  });

  it('subscribes to a JSON-RPC method over the websocket connection', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await provider.connect();
    const subscription = await provider.subscribe(
      { subname: 'subname', subscribe: 'subscribe_method', params: [], unsubscribe: 'unsubscribe_method' },
      () => {},
    );
    expect(subscription).toBeDefined();
  });

  it('unsubscribes from a JSON-RPC method over the websocket connection', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await provider.connect();
    const subscription = await provider.subscribe(
      { subname: 'subname', subscribe: 'subscribe_method', params: [], unsubscribe: 'unsubscribe_method' },
      () => {},
    );
    await expect(subscription.unsubscribe()).resolves.toBeUndefined();
  });

  it('disconnects from the websocket endpoint', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await provider.connect();
    await expect(provider.disconnect()).resolves.toBeUndefined();
  });

  it('throws an error when the request is timed out', () =>
    new Promise<void>(async (resolve, reject) => {
      vi.useFakeTimers();

      const provider = new WsProvider({ endpoint: FAKE_WS_URL, timeout: 10_000 });

      provider.connect().then(() => {
        provider
          .send('delayed_method', [])
          .then(reject)
          .catch((error: Error) => {
            error.message === 'Request timed out after 10000ms' ? resolve() : reject();
          });

        vi.advanceTimersByTime(20_000);
      });

      // Advance the timers to resolve the provider connection
      // before start sending test requests
      vi.advanceTimersByTime(1000);
    }));
});
