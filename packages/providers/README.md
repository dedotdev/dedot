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
