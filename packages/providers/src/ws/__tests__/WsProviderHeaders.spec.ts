// @vitest-environment node
import { createHash } from 'node:crypto';
import { createServer, IncomingHttpHeaders, Server } from 'node:http';
import { Socket } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WsProvider } from '../WsProvider.js';

// https://datatracker.ietf.org/doc/html/rfc6455#section-1.3
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const acceptKey = (key: string = '') => {
  return createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');
};

/**
 * Unlike WsProvider.spec.ts, this suite does not mock the underlying websocket implementation,
 * it verifies that custom headers are actually sent over the wire with the opening handshake,
 * regardless of whether `@polkadot/x-ws` resolves to the `ws` package or to a global
 * WebSocket implementation, which depends on the Node.js version running the tests.
 *
 * A minimal handshake-only server is used here so that no extra dependency is needed,
 * `@polkadot/x-ws` only ships a websocket client.
 *
 * A `node` environment is required, the default `happy-dom` environment
 * provides its own global WebSocket which does not support custom headers.
 */
describe('WsProvider request headers (real websocket handshake)', () => {
  let server: Server;
  let endpoint: string;
  let sockets: Socket[] = [];
  let receivedHeaders: IncomingHttpHeaders;

  beforeAll(async () => {
    server = createServer();

    server.on('upgrade', (request, socket) => {
      receivedHeaders = request.headers;
      sockets.push(socket as Socket);

      // Ignore errors from clients going away abruptly
      socket.on('error', () => {});

      socket.write(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${acceptKey(request.headers['sec-websocket-key'])}`,
          '\r\n',
        ].join('\r\n'),
      );
    });

    server.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const { port } = server.address() as { port: number };
    endpoint = `ws://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.destroy());
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
    } finally {
      await provider.disconnect().catch(() => {});
    }
  });
});
