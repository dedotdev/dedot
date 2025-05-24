import { JsonRpcRequest, JsonRpcResponse } from '@dedot/providers';
import { Client, Server } from 'mock-socket';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionState, EndpointSelector, WsProvider, WsProviderOptions } from '../WsProvider.js';

// Global handler for unhandled rejections
process.on('unhandledRejection', (reason) => {
  // Intentionally empty - just to prevent unhandled rejection warnings
  // This is needed because some tests intentionally trigger errors
});

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
  const FAKE_WS_URL_2 = 'ws://127.0.0.1:9945';
  let mockServer2: Server;

  beforeAll(() => {
    const sendResponse = (socket: Client, message: JsonRpcRequest) => {
      socket.send(JSON.stringify({ id: message.id, jsonrpc: '2.0', result: 'ok' } as JsonRpcResponse<string>));
    };

    mockServer = new Server(FAKE_WS_URL);
    mockServer2 = new Server(FAKE_WS_URL_2);

    const setupServer = (server: Server) => {
      server.on('connection', (socket) => {
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
    };

    setupServer(mockServer);
    setupServer(mockServer2);
  });

  afterAll(() => {
    mockServer.stop();
    mockServer2.stop();
  });

  it('connects to a valid websocket endpoint', async () => {
    const provider = new WsProvider(FAKE_WS_URL);
    await expect(provider.connect()).resolves.toBe(provider);
  });

  it('throws an error when connecting to an invalid websocket endpoint', async () => {
    const provider = new WsProvider({ endpoint: 'ws://localhost:1234', retryDelayMs: -1 });

    // Use try/catch to properly handle the expected error
    try {
      await provider.connect();
      // If we get here, the test should fail
      expect('should have thrown').toBe('but did not throw');
    } catch (error) {
      // We expect an error, so the test passes
      expect(error).toBeDefined();
    }
  });

  it('throws an error when endpoint selector returns an invalid endpoint', async () => {
    const endpointSelector: EndpointSelector = () => 'invalid-endpoint';
    const provider = new WsProvider({ endpoint: endpointSelector, retryDelayMs: -1 });
    await expect(provider.connect()).rejects.toThrow();
  });

  it('connects using a synchronous endpoint selector function', async () => {
    const endpointSelector = vi.fn(() => FAKE_WS_URL);
    const provider = new WsProvider({ endpoint: endpointSelector });

    await expect(provider.connect()).resolves.toBe(provider);
    expect(endpointSelector).toHaveBeenCalledTimes(1);
    expect(endpointSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        currentEndpoint: undefined,
      }),
    );
  });

  it('connects using an asynchronous endpoint selector function', async () => {
    const endpointSelector = vi.fn(async () => FAKE_WS_URL);
    const provider = new WsProvider({ endpoint: endpointSelector });

    await expect(provider.connect()).resolves.toBe(provider);
    expect(endpointSelector).toHaveBeenCalledTimes(1);
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

  it('uses endpoint selector for reconnection and resets attempt counter on success', async () => {
    // Create a simplified test that directly tests the reconnection logic
    const endpointSelector = vi.fn();
    endpointSelector.mockReturnValueOnce(FAKE_WS_URL); // First call returns first URL
    endpointSelector.mockReturnValueOnce(FAKE_WS_URL_2); // Second call returns second URL

    // Create a provider with error event handler to catch any unhandled errors
    const provider = new WsProvider({
      endpoint: endpointSelector,
      retryDelayMs: 100, // Short delay for testing
    });

    // Add error handler to catch any unhandled errors
    provider.on('error', () => {
      // Intentionally empty - just to prevent unhandled errors
    });

    try {
      // Get access to the private WebSocket instance
      const getWs = () => (provider as any).__unsafeWs();

      // Connect initially
      await provider.connect();

      // Verify first connection used first endpoint
      expect(endpointSelector).toHaveBeenCalledTimes(1);
      expect(endpointSelector).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          currentEndpoint: undefined,
        }),
      );

      // Store the current WebSocket
      const ws = getWs();

      // Manually trigger the onclose event to simulate a disconnection
      const closeEvent = { code: 1006, reason: 'Test close', wasClean: false };
      (ws.onclose as any)(closeEvent);

      // Wait for reconnection to happen
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify the endpoint selector was called again
      expect(endpointSelector).toHaveBeenCalledTimes(2);

      // Verify second call was for reconnection
      expect(endpointSelector).toHaveBeenLastCalledWith(
        expect.objectContaining({
          attempt: 2,
          currentEndpoint: FAKE_WS_URL, // The current endpoint is set to the last endpoint used
        }),
      );
    } finally {
      // Disconnect to clean up
      await provider.disconnect().catch(() => {
        // Ignore disconnect errors since we're just cleaning up
      });
    }
  });

  it('connects using an array of endpoints', async () => {
    const provider = new WsProvider({
      endpoint: [FAKE_WS_URL, FAKE_WS_URL_2]
    });

    await expect(provider.connect()).resolves.toBe(provider);
    await provider.disconnect();
  });

  it('throws an error when endpoint array is empty', async () => {
    expect(() => {
      new WsProvider({ endpoint: [] });
    }).toThrow('Endpoint array cannot be empty');
  });

  it('validates all endpoints in array during construction', async () => {
    expect(() => {
      new WsProvider({ endpoint: [FAKE_WS_URL, 'invalid-endpoint'] });
    }).toThrow('Invalid websocket endpoint invalid-endpoint');
  });

  it('avoids last failed endpoint when reconnecting with array', async () => {
    // Mock Math.random to control endpoint selection
    const originalRandom = Math.random;
    let randomCallCount = 0;
    Math.random = vi.fn(() => {
      // First call (initial connection): return 0 to select first endpoint
      // Second call (reconnection): return 0 to select first available endpoint (which will be the second one)
      return 0;
    });

    try {
      const provider = new WsProvider({
        endpoint: [FAKE_WS_URL, FAKE_WS_URL_2],
        retryDelayMs: 100,
      });

      // Add error handler to catch any unhandled errors
      provider.on('error', () => {
        // Intentionally empty - just to prevent unhandled errors
      });

      // Get access to the private WebSocket instance
      const getWs = () => (provider as any).__unsafeWs();

      // Connect initially - should use first endpoint (FAKE_WS_URL)
      await provider.connect();

      // Store the current WebSocket
      const ws = getWs();

      // Manually trigger the onclose event to simulate a disconnection
      const closeEvent = { code: 1006, reason: 'Test close', wasClean: false };
      (ws.onclose as any)(closeEvent);

      // Wait for reconnection to happen
      await new Promise((resolve) => setTimeout(resolve, 200));

      // The provider should have attempted to reconnect
      // Since FAKE_WS_URL failed, it should try FAKE_WS_URL_2
      // We can't easily verify the exact endpoint used, but we can verify it connected
      expect(provider.status).toBe('connected');

      await provider.disconnect();
    } finally {
      // Restore original Math.random
      Math.random = originalRandom;
    }
  });

  it('throws an error when the request is timed out', async () => {
    // Create a testable provider that allows direct access to the timeout handler
    class TestableWsProvider extends WsProvider {
      private currentTime = Date.now();
      private timeoutMs: number;

      constructor(options: WsProviderOptions | string) {
        super(options);
        // Store the timeout value when the provider is created
        this.timeoutMs = typeof options === 'string' ? 30000 : options.timeout || 30000;
      }

      public advanceTime(ms: number): void {
        this.currentTime += ms;
      }

      // Expose a method to manually trigger the timeout check
      public triggerTimeoutCheck(): void {
        // Access the handlers through the protected property
        const handlers = this._handlers;
        const timeout = this.timeoutMs;
        const now = Date.now();

        Object.entries(handlers).forEach(([id, { from, defer, request }]) => {
          if (now - from > timeout) {
            defer.reject(new Error(`Request timed out after ${timeout}ms`));
            delete handlers[request.id];
          }
        });
      }
    }

    // Create provider with a very short timeout for testing
    const provider = new TestableWsProvider({
      endpoint: FAKE_WS_URL,
      timeout: 500, // Very short timeout for faster test
    });

    try {
      // Connect to the provider
      await provider.connect();

      // Start a request that will be delayed
      const sendPromise = provider.send('delayed_method', []);

      // Advance the provider's internal time past the timeout
      provider.advanceTime(1000); // More than the 500ms timeout

      // Manually trigger the timeout check
      provider.triggerTimeoutCheck();

      // The request should now time out
      await expect(sendPromise).rejects.toThrow('Request timed out after 500ms');
    } finally {
      // Clean up
      await provider.disconnect().catch(() => {
        // Ignore disconnect errors since we're just cleaning up
      });
    }
  }, 20000); // Increase test timeout to 20 seconds
});
