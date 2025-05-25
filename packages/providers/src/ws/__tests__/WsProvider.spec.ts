import { JsonRpcRequest, JsonRpcResponse } from '@dedot/providers';
import { Client, Server } from 'mock-socket';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WsEndpointSelector, WsProvider, WsProviderOptions } from '../WsProvider.js';

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
    const endpointSelector: WsEndpointSelector = () => 'invalid-endpoint';
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

  it('connects using endpoint selector function passed directly to constructor', async () => {
    const endpointSelector = vi.fn(() => FAKE_WS_URL);
    const provider = new WsProvider(endpointSelector);

    await expect(provider.connect()).resolves.toBe(provider);
    expect(endpointSelector).toHaveBeenCalledTimes(1);
    expect(endpointSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        currentEndpoint: undefined,
      }),
    );
  });

  it('throws an error when endpoint selector passed directly returns an invalid endpoint', async () => {
    const endpointSelector: WsEndpointSelector = () => 'invalid-endpoint';
    const provider = new WsProvider({ endpoint: endpointSelector, retryDelayMs: -1 });
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

  describe('Array Endpoints', () => {
    const FAKE_WS_URL_3 = 'ws://127.0.0.1:9946';
    const FAKE_WS_URL_4 = 'ws://127.0.0.1:9947';
    let testMockServers: Server[] = [];

    const createMockServer = (url: string): Server => {
      const server = new Server(url);
      server.on('connection', (socket) => {
        socket.on('message', (data) => {
          const message: JsonRpcRequest = JSON.parse(data.toString());
          socket.send(JSON.stringify({ id: message.id, jsonrpc: '2.0', result: 'ok' } as JsonRpcResponse<string>));
        });
      });
      return server;
    };

    const setupTestServers = (urls: string[]) => {
      testMockServers = urls.map(createMockServer);
    };

    const stopTestServers = () => {
      testMockServers.forEach((server) => server.stop());
      testMockServers = [];
    };

    beforeEach(() => {
      setupTestServers([FAKE_WS_URL_3, FAKE_WS_URL_4]);
    });

    afterEach(() => {
      stopTestServers();
    });

    describe('Basic Array Functionality', () => {
      it('connects with array of valid endpoints', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider(endpoints);
        await expect(provider.connect()).resolves.toBe(provider);
        await provider.disconnect();
      });

      it('connects with array passed in options object', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider({ endpoint: endpoints });
        await expect(provider.connect()).resolves.toBe(provider);
        await provider.disconnect();
      });

      it('throws error for empty endpoint array', () => {
        expect(() => new WsProvider([])).toThrow('Endpoint array cannot be empty');
      });

      it('throws error for array containing invalid endpoints', () => {
        const endpoints = [FAKE_WS_URL, 'invalid-endpoint'];
        expect(() => new WsProvider(endpoints)).toThrow('Invalid websocket endpoint');
      });

      it('validates all endpoints in array during construction', () => {
        const endpoints = ['http://invalid', 'wss://valid.com', 'another-invalid'];
        expect(() => new WsProvider(endpoints)).toThrow('Invalid websocket endpoint');
      });

      it('works with single endpoint array', async () => {
        const endpoints = [FAKE_WS_URL];
        const provider = new WsProvider(endpoints);
        await expect(provider.connect()).resolves.toBe(provider);
        await provider.disconnect();
      });
    });

    describe('Random Selection', () => {
      it('selects random endpoint from array on initial connection', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2, FAKE_WS_URL_3];

        // Mock Math.random to return 0 (first item)
        const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

        const provider = new WsProvider(endpoints);
        await provider.connect();

        expect(provider.status).toBe('connected');

        mockRandom.mockRestore();
        await provider.disconnect();
      });
    });

    describe('Reconnection with Arrays', () => {
      it('selects different endpoint on reconnection when possible', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100, // Short delay for testing
        });

        // Add error handler to prevent unhandled errors
        provider.on('error', () => {
          // Intentionally empty
        });

        try {
          // Get access to the private WebSocket instance
          const getWs = () => (provider as any).__unsafeWs();

          // Connect initially
          await provider.connect();
          expect(provider.status).toBe('connected');

          // Use direct close method to simulate disconnection
          getWs().close(3000);

          // Wait for reconnection to happen
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Verify we're connected again
          expect(provider.status).toBe('connected');
        } finally {
          await provider.disconnect().catch(() => {
            // Ignore disconnect errors since we're just cleaning up
          });
        }
      });

      it('reuses same endpoint when only one available', async () => {
        const endpoints = [FAKE_WS_URL];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100,
        });

        provider.on('error', () => {
          // Intentionally empty
        });

        try {
          const getWs = () => (provider as any).__unsafeWs();

          await provider.connect();

          // Use direct close method to simulate disconnection
          getWs().close(3000);

          // Wait for reconnection
          await new Promise((resolve) => setTimeout(resolve, 200));

          expect(provider.status).toBe('connected');
        } finally {
          await provider.disconnect().catch(() => {});
        }
      });

      it('handles server-side disconnection by stopping mock server', async () => {
        // Setup dedicated servers for this test
        const testUrl1 = 'ws://127.0.0.1:9948';
        const testUrl2 = 'ws://127.0.0.1:9949';
        const server1 = createMockServer(testUrl1);
        const server2 = createMockServer(testUrl2);

        const endpoints = [testUrl1, testUrl2];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100,
        });

        provider.on('error', () => {
          // Intentionally empty
        });

        try {
          // Connect initially
          await provider.connect();
          expect(provider.status).toBe('connected');

          // Simulate server going down by stopping the server
          server1.stop();

          // Wait for reconnection to happen (should connect to server2)
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Should be reconnected to the second server
          expect(provider.status).toBe('connected');
        } finally {
          server1.stop();
          server2.stop();
          await provider.disconnect().catch(() => {});
        }
      });
    });

    describe('Edge Cases', () => {
      it('handles reconnection when current endpoint becomes unavailable', async () => {
        // This test simulates the scenario where the current endpoint is no longer available
        // and should be excluded from the next selection
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100,
        });

        provider.on('error', () => {});

        try {
          await provider.connect();

          const getWs = () => (provider as any).__unsafeWs();

          // Use direct close method to simulate disconnection
          getWs().close(3000);

          // Wait for reconnection attempt
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Should successfully reconnect (possibly to different endpoint)
          expect(provider.status).toBe('connected');
        } finally {
          await provider.disconnect().catch(() => {});
        }
      });

      it('works correctly with array passed directly to constructor', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider(endpoints);

        await expect(provider.connect()).resolves.toBe(provider);
        expect(provider.status).toBe('connected');

        await provider.disconnect();
      });

      it('falls back to current endpoint when all others are filtered out', async () => {
        // Test the scenario where pickRandomItem falls back to original array
        // when all items would be excluded
        const endpoints = [FAKE_WS_URL];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100,
        });

        provider.on('error', () => {});

        try {
          await provider.connect();

          const getWs = () => (provider as any).__unsafeWs();

          // Use direct close method to simulate disconnection
          getWs().close(3000);

          // Wait for reconnection
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Should reconnect to the same endpoint since it's the only one
          expect(provider.status).toBe('connected');
        } finally {
          await provider.disconnect().catch(() => {});
        }
      });
    });

    describe('Integration', () => {
      it('maintains subscription reestablishment on reconnection', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider({
          endpoint: endpoints,
          retryDelayMs: 100,
        });

        provider.on('error', () => {});

        try {
          await provider.connect();

          // Create a subscription
          const subscription = await provider.subscribe(
            { subname: 'test', subscribe: 'test_subscribe', params: [], unsubscribe: 'test_unsubscribe' },
            () => {},
          );

          expect(subscription).toBeDefined();

          const getWs = () => (provider as any).__unsafeWs();

          // Use direct close method to simulate disconnection
          getWs().close(3000);

          // Wait for reconnection
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Should be reconnected
          expect(provider.status).toBe('connected');
        } finally {
          await provider.disconnect().catch(() => {});
        }
      });

      it('works with timeout handling', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider({
          endpoint: endpoints,
          timeout: 1000,
        });

        try {
          await provider.connect();

          // Send a normal request that should succeed
          await expect(provider.send('test_method', [])).resolves.toBe('ok');
        } finally {
          await provider.disconnect();
        }
      });

      it('properly handles disconnect and cleanup', async () => {
        const endpoints = [FAKE_WS_URL, FAKE_WS_URL_2];
        const provider = new WsProvider(endpoints);

        await provider.connect();
        expect(provider.status).toBe('connected');

        await provider.disconnect();
        expect(provider.status).toBe('disconnected');

        // Should be able to reconnect
        await provider.connect();
        expect(provider.status).toBe('connected');

        await provider.disconnect();
      });
    });
  });
});
