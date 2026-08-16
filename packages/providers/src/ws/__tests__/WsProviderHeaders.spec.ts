// @vitest-environment node
import { IncomingHttpHeaders } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocketServer } from 'ws';
import { WsProvider } from '../WsProvider.js';

/**
 * Unlike WsProvider.spec.ts, this suite does not mock the underlying websocket implementation,
 * it verifies that custom headers are actually sent over the wire with the opening handshake,
 * regardless of whether `@polkadot/x-ws` resolves to the `ws` package (Node.js < 22)
 * or the native WebSocket implementation (Node.js >= 22).
 *
 * A `node` environment is required here, the default `happy-dom` environment
 * provides its own global WebSocket which does not support custom headers.
 */
describe('WsProvider request headers (real websocket server)', () => {
  let server: WebSocketServer;
  let endpoint: string;
  let receivedHeaders: IncomingHttpHeaders;

  beforeAll(async () => {
    server = new WebSocketServer({ port: 0 });

    server.on('connection', (socket, request) => {
      receivedHeaders = request.headers;

      socket.on('message', (data) => {
        const { id } = JSON.parse(data.toString());
        socket.send(JSON.stringify({ id, jsonrpc: '2.0', result: 'ok' }));
      });
    });

    await new Promise<void>((resolve) => server.once('listening', resolve));

    const { port } = server.address() as { port: number };
    endpoint = `ws://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('sends custom headers with the opening handshake', async () => {
    const provider = new WsProvider({
      endpoint,
      headers: {
        Authorization: 'Bearer secret-token',
        'X-Client-ID': 'example-client',
      },
    });

    try {
      await provider.connect();

      expect(receivedHeaders['authorization']).toBe('Bearer secret-token');
      expect(receivedHeaders['x-client-id']).toBe('example-client');

      // Make sure the connection is fully functional with headers attached
      await expect(provider.send('test_method', [])).resolves.toBe('ok');
    } finally {
      await provider.disconnect().catch(() => {});
    }
  });

  it('sends no custom headers & no bogus subprotocol when headers are not provided', async () => {
    const provider = new WsProvider(endpoint);

    try {
      await provider.connect();

      expect(receivedHeaders['authorization']).toBeUndefined();
      expect(receivedHeaders['sec-websocket-protocol']).toBeUndefined();

      await expect(provider.send('test_method', [])).resolves.toBe('ok');
    } finally {
      await provider.disconnect().catch(() => {});
    }
  });
});
