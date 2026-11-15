# @dedot/providers

JSON-RPC Providers

## Custom request headers (`WsProvider`)

Custom HTTP headers can be sent along with the websocket opening handshake,
e.g: to authenticate with a private RPC endpoint or proxy.

```ts
import { WsProvider } from '@dedot/providers';

const provider = new WsProvider({
  endpoint: 'wss://private.rpc',
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
    'X-Client-ID': 'example-client',
  },
});
```

Headers can also be resolved on each connection attempt (including reconnects),
which is helpful to refresh short-lived tokens or to use different credentials per endpoint:

```ts
const provider = new WsProvider({
  endpoint: ['wss://private.rpc', 'wss://private-backup.rpc'],
  headers: async ({ attempt, currentEndpoint }) => ({
    Authorization: `Bearer ${await fetchToken(currentEndpoint)}`,
  }),
});
```

> [!NOTE]
> Custom headers are only supported in non-browser environments (Node.js, Bun).
> Browsers do not allow setting headers for the websocket opening handshake,
> the headers are ignored and a warning is logged in that case.

## Connection retries and failover (`WsProvider`)

`WsProvider` reconnects on its own when a connection fails or drops, and when it is given several endpoints it moves on to a different one, avoiding the ones that failed recently.

```ts
const provider = new WsProvider({
  endpoint: ['wss://rpc.polkadot.io', 'wss://rpc.ibp.network/polkadot'],
  retryDelayMs: 2500, // delay between attempts, a value <= 0 disables retrying
  connectTimeoutMs: 30_000, // give up on a handshake that does not complete, then try the next endpoint
});
```

How long it keeps trying depends on `maxRetryAttempts`:

- **Not set (default)**: the first connection tries each endpoint once. A single endpoint is tried once, an array is tried until every endpoint has failed, then `connect()` rejects with a `MaxRetryAttemptedError` whose `cause` is the last connection error. Once a connection has been established, reconnection is retried forever.
- **Set to a number**: at most that many retries, for the first connection and for reconnections alike.
- **Endpoint selector function**: the function decides what to try next, so without `maxRetryAttempts` it is retried forever.

Connection errors are emitted on the `error` event as `WsConnectionError`, with the endpoint in the message.

