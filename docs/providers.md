# Providers

Providers are means to provide connection to the network, Dedot comes by default with providers for connection via [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (`wss://`) and [smoldot](https://www.npmjs.com/package/smoldot) light client. But you can implement your own provider for your own needs.

### WsProvider

#### Initialize from single Websocket endpoint

```typescript
import { WsProvider } from 'dedot';

// Initialize the provider & connect to the network
const provider = new WsProvider('wss://rpc.polkadot.io');
await provider.connect();

// Fetch the genesis hash
const genesisHash = await provider.send('chain_getBlockHash', [0]);
console.log(genesisHash);

// Subscribe to runtimeVersion changes
await provider.subscribe({
  subname: 'chain_newHead', // subscription name for notification
  subscribe: 'chain_subscribeNewHeads', // subscribe method
  params: [], // params for subscribe method
  unsubscribe: 'chain_unsubscribeNewHeads', // unsubscribe method
}, (error, newHead, subscription) => {
  console.log('newHead', newHead);
});

// Disconnect from the network
await provider.disconnect();
```

#### Initialize from a list of endpoints

`WsProvider` can accept an array of WebSocket endpoints for automatic failover. Endpoints are randomly selected on initial connection, and reconnection attempts exclude previously failed endpoints when possible.

```typescript
import { WsProvider } from 'dedot';

const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://polkadot-rpc.dwellir.com',
  'wss://polkadot.api.onfinality.io/public-ws'
]);
```

#### Initialize from a customized endpoint selector method

For advanced use-cases, WebSocket endpoint to use can also control by an external endpoint selector method, e.g: a wallet might want to selectively pick a RPC to switch to and display the selected RPC to the UI.

```typescript
import { WsProvider, WsConnectionState } from 'dedot';

const provider = new WsProvider((info: WsConnectionState) => {
  console.log(`Connection attempt ${info.attempt}`);

  return info.attempt >= 3
     ? 'wss://backup.rpc'
     : 'wss://primary.rpc';
});
```

#### Disconnect and switch endpoint

The `disconnect` method accepts an optional `switchEndpoint` flag that allows you to disconnect from the current endpoint and automatically reconnect to a different one.

```typescript
import { WsProvider } from 'dedot';

const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://polkadot-rpc.dwellir.com',
]);

await provider.connect();

// Normal disconnect - closes connection and cleans up
await provider.disconnect();

// Disconnect and switch endpoint - automatically reconnects to a different endpoint
await provider.disconnect(true); // Provider will auto-reconnect to another endpoint
```

{% hint style="info" %}
When `switchEndpoint` is `true`, the provider automatically reconnects to a different endpoint from the list. When `false` or not provided, the provider performs a normal disconnection with cleanup.
{% endhint %}

### SmoldotProvider

`SmoldotProvider` take in a parameter of type [`Chain`](https://github.com/smol-dot/smoldot/blob/cde274e628e3f34cf05e1a73a46cf323b6702a94/wasm-node/javascript/src/public-types.ts#L127) from `smoldot`, so before initialize a `SmoldotProvider`, one should install `smoldot` package and following the [instruction](https://github.com/smol-dot/smoldot/tree/main/wasm-node/javascript#example) to instanciate a `Chain` connection to the network.

If you're building a browser dapp, it's highly recommended to setup a [worker](https://github.com/smol-dot/smoldot/tree/main/wasm-node/javascript#usage-with-a-worker) for `smoldot`

1. Install `smoldot`

```sh
npm i smoldot
```

2. Initialize `SmoldotProvider`

```typescript
import { SmoldotProvider } from 'dedot';
import * as smoldot from 'smoldot';
import chainSpec from './polkadot-chainspec.json';

// Start smoldot instance & initialize a chain
const client = smoldot.start();
const chain = await client.addChain({ chainSpec });

// Initialize providers & connect to the network
const provider = new SmoldotProvider(chain);

await provider.connect();

// Fetch the genesis hash
const genesisHash = await provider.send('chain_getBlockHash', [0]);
console.log(genesisHash);

// Subscribe to runtimeVersion changes
await provider.subscribe({
  subname: 'chain_newHead', // subscription name for notification
  subscribe: 'chain_subscribeNewHeads', // subscribe method
  params: [], // params for subscribe method
  unsubscribe: 'chain_unsubscribeNewHeads', // unsubscribe method
}, (error, newHead, subscription) => {
  console.log('newHead', newHead);
});

// Disconnect from the network
await provider.disconnect();
```

### Add your own custom provider?

Every provider must implement the `JsonRpcProvider` interface, defined as below:

```typescript
type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
type ProviderEvent = ConnectionStatus | 'error'; // | 'timeout';

interface JsonRpcProvider extends IEventEmitter<ProviderEvent> {
  /**
   * The current connection status
   */
  status: ConnectionStatus;

  /**
   * Send a JSON-RPC request,
   * make sure to connect to the provider first before sending requests
   *
   * @param method
   * @param params
   */
  send<T = any>(method: string, params: any[]): Promise<T>;

  /**
   * Make a subscription request,
   * make sure to connect to the provider first before sending requests
   *
   * @param input
   * @param callback
   */
  subscribe<T = any>(
    input: JsonRpcSubscriptionInput,
    callback: JsonRpcSubscriptionCallback<T>,
  ): Promise<JsonRpcSubscription>;

  /**
   * Connect to the provider
   */
  connect(): Promise<this>;

  /**
   * Disconnect from the provider
   */
  disconnect(): Promise<void>;
}
```

One can easily add a custom provider by implementing this interface:

```typescript
// custom-provider.ts
import { JsonRpcProvider } from 'dedot';

export class MyCustomProvider implements JsonRpcProvider {
  // ... implementation details
}

// main.ts
import { DedotClient } from 'dedot';
import { MyCustomProvider } from './custom-provider';

const client = await DedotClient(new MyCustomProvider());
const chain: string = await client.rpc.system_chain();
```

More detailed information about the `JsonRpcProvider` and related types can be found in the [source code](https://github.com/dedotdev/dedot/blob/48d6bec5cfd0e663558b4b1ba02a4ed826e2abb3/packages/providers/src/types.ts#L38).
