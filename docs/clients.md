# Clients

Dedot provides a unified client interface for interacting with Substrate-based blockchains. The main entry point is `DedotClient`, which offers powerful APIs that abstract over the complexities of on-chain interactions (queries, transactions, subscriptions) and supports both modern and legacy JSON-RPC specifications.

### DedotClient

`DedotClient` is the unified client interface for interacting with Substrate-based blockchains. It provides a consistent API regardless of whether you're using the [new JSON-RPC v2 specification](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) or the [legacy JSON-RPC specification](https://github.com/w3f/PSPs/blob/master/PSPs/drafts/psp-6.md).

#### Interface Overview

```typescript
interface DedotClient<ChainApi> {
  // Connection
  status: ConnectionStatus;              // Current connection status
  connect(): Promise<this>;              // Connect to the network
  disconnect(): Promise<void>;           // Disconnect from the network

  // Chain Information
  genesisHash: Hash;                     // Genesis hash of the connected chain
  runtimeVersion: SubstrateRuntimeVersion; // Current runtime version
  metadata: Metadata;                    // Chain metadata
  registry: PortableRegistry;            // Type registry for encoding/decoding

  // Chain Spec
  chainSpec: {
    chainName(): Promise<string>;        // Get chain name
    genesisHash(): Promise<HexString>;   // Get genesis hash
    properties(): Promise<Properties>;   // Get chain properties (token symbol, decimals, etc.)
  };

  // Block Explorer
  block: {
    best(): Promise<BlockInfo>;                            // Get current best block
    best(callback: (block: BlockInfo) => void): () => void; // Subscribe to best blocks
    finalized(): Promise<BlockInfo>;                       // Get current finalized block
    finalized(callback: (block: BlockInfo) => void): () => void; // Subscribe to finalized blocks
    header(hash: BlockHash): Promise<Header>;              // Get block header
    body(hash: BlockHash): Promise<HexString[]>;           // Get block body (extrinsics)
  };

  // On-chain Interactions
  rpc: ChainApi['rpc'];                  // Raw JSON-RPC method access
  query: ChainApi['query'];              // Storage queries
  consts: ChainApi['consts'];            // Pallet constants
  call: ChainApi['call'];                // Runtime API calls
  tx: ChainApi['tx'];                    // Transaction builder
  events: ChainApi['events'];            // Event type checking
  errors: ChainApi['errors'];            // Error type checking
  view: ChainApi['view'];                // View functions (Metadata V16+)

  // Utilities
  at(hash: BlockHash): Promise<ISubstrateClientAt>;        // Query historical state at block
  getRuntimeVersion(): Promise<SubstrateRuntimeVersion>;   // Get runtime version with metadata sync
  setSigner(signer?: InjectedSigner): void;                // Set transaction signer
  sendTx(tx: HexString | Extrinsic, callback?: Callback): TxUnsub; // Broadcast transaction
  queryMulti(queries: Query[], callback?: Callback): Promise<any[]>; // Query multiple storage items

  // Events
  on(event: ApiEvent, handler: EventHandlerFn): () => void;   // Subscribe to client events
  once(event: ApiEvent, handler: EventHandlerFn): () => void; // Subscribe once
  off(event: ApiEvent, handler?: EventHandlerFn): this;       // Unsubscribe
}
```

#### Usage Example

```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

// Initialize provider
const provider = new WsProvider('wss://rpc.polkadot.io');

// JSON-RPC v2 (default, recommended for Polkadot-SDK >= 1.11.0)
const client = await DedotClient.new<PolkadotApi>(provider);

// Get current best runtime version
const currentBestRuntimeVersion = await client.getRuntimeVersion();

// Execute JSON-RPC methods
const metadata = await client.rpc.state_getMetadata();

// On-chain interactions
const balance = await client.query.system.account('<address>');
const transferTx = client.tx.balances.transferKeepAlive('<dest_address>', 2_000_000_000_000n);

// Fetch ChainSpec information
const chainName = await client.chainSpec.chainName();
const genesisHash = await client.chainSpec.genesisHash();
const chainProps = await client.chainSpec.properties();

// Access block data via BlockExplorer
const currentBestBlock = await client.block.best();
const currentFinalizedBlock = await client.block.finalized();

// Subscribe to finalized blocks
const unsub = client.block.finalized((block) => {
  console.log(`Finalized block: ${block.number}, hash: ${block.hash}`);
});

// Get block header and body
const header = await client.block.header(currentBestBlock.hash);
const body = await client.block.body(currentBestBlock.hash);

// Get pallet constants
const ss58Prefix = client.consts.system.ss58Prefix;

// Call runtime APIs
const pendingRewards = await client.call.nominationPoolsApi.pendingRewards('<address>');

// Disconnect when done
// await unsub();
// await client.disconnect();
```

### Connect to network via legacy JSON-RPC APIs

If the JSON-RPC server doesn't support the new JSON-RPC v2 specification yet (nodes using Polkadot-SDK < 1.11.0), you can connect using legacy JSON-RPC APIs. The `DedotClient` provides a unified interface for both:

```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const provider = new WsProvider('wss://rpc.polkadot.io');

// Option 1: Using DedotClient.legacy()
const client = await DedotClient.legacy<PolkadotApi>(provider);

// Option 2: Using DedotClient.new() with rpcVersion option
const client = await DedotClient.new<PolkadotApi>({
  provider,
  rpcVersion: 'legacy'
});
```

{% hint style="info" %}
The same API is available regardless of which JSON-RPC version you use. The only difference is the underlying RPC calls made to the node.
{% endhint %}

For more details on when to use JSON-RPC v2 or legacy, see the [Connect to network](connect-to-network.md#when-to-use-json-rpc-v2-or-legacy) page.

### JsonRpcClient (Advanced)

`JsonRpcClient` is a low-level JSON-RPC client for advanced use cases where you need direct access to raw JSON-RPC methods without the high-level abstractions. `DedotClient` extends `JsonRpcClient`, so all `JsonRpcClient` methods are also available on `DedotClient`.

{% hint style="warning" %}
For most use cases, we recommend using `DedotClient` instead of `JsonRpcClient` directly.
{% endhint %}

```typescript
import { JsonRpcClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

// Initialize provider & client
const provider = new WsProvider('wss://rpc.polkadot.io');
const client = await JsonRpcClient.new<PolkadotApi>(provider);

// Check connection status
console.log('Connection status:', client.status);

// Execute JSON-RPC methods directly
const metadata = await client.rpc.state_getMetadata();
const chain = await client.rpc.system_chain();
const nodeVersion = await client.rpc.system_version();

// Submit raw transaction
const txHash = await client.rpc.author_submitExtrinsic('0x...');
```

---

### Connection Status

Clients track the connection status, accessible via `client.status`:

```typescript
import { ConnectionStatus } from 'dedot';

const status: ConnectionStatus = client.status;
```

Available statuses:

| Status | Description |
|--------|-------------|
| `connected` | The client is connected to the network |
| `disconnected` | The client is disconnected from the network |
| `reconnecting` | The client is attempting to reconnect to the network |

### Block Explorer (`client.block`)

The Block Explorer API provides access to block data, allowing you to query and subscribe to best and finalized blocks.

```typescript
// Get current best block
const bestBlock = await client.block.best();
console.log('Best block:', bestBlock.number, bestBlock.hash);

// Get current finalized block
const finalizedBlock = await client.block.finalized();
console.log('Finalized block:', finalizedBlock.number, finalizedBlock.hash);

// Subscribe to best blocks
const unsub = client.block.best((block) => {
  console.log('New best block:', block.number, block.hash);
});

// Subscribe to finalized blocks
const unsub = client.block.finalized((block) => {
  console.log('New finalized block:', block.number, block.hash);
});

// Get block header by hash
const header = await client.block.header(blockHash);
console.log('Block header:', header);

// Get block body (extrinsics) by hash
const body = await client.block.body(blockHash);
console.log('Block extrinsics:', body);
```

The `BlockInfo` object returned contains:

| Property | Type | Description |
|----------|------|-------------|
| `hash` | `BlockHash` | The block hash |
| `number` | `number` | The block number |
| `parent` | `BlockHash` | The parent block hash |
| `runtimeUpgraded` | `boolean` | Whether a runtime upgrade occurred in this block |

### Chain Spec (`client.chainSpec`)

The Chain Spec API provides access to chain information such as the chain name, genesis hash, and chain properties.

```typescript
// Get chain name
const chainName = await client.chainSpec.chainName();
console.log('Chain:', chainName); // e.g., "Polkadot"

// Get genesis hash
const genesisHash = await client.chainSpec.genesisHash();
console.log('Genesis hash:', genesisHash);

// Get chain properties (token symbol, decimals, etc.)
const properties = await client.chainSpec.properties();
console.log('Token symbol:', properties.tokenSymbol);   // e.g., "DOT"
console.log('Token decimals:', properties.tokenDecimals); // e.g., 10
console.log('SS58 prefix:', properties.ss58Format);     // e.g., 0
```

### Broadcast Transaction (`client.sendTx`)

The `sendTx` method broadcasts a signed transaction to the network and provides utilities to track its status.

```typescript
// Basic usage with status callback
const unsub = await client.sendTx(signedTxHex, (result) => {
  console.log('Status:', result.status);

  if (result.dispatchError) {
    console.error('Transaction failed:', result.dispatchError);
  }

  if (result.ok) {
    console.log('Transaction successful!');
    console.log('Events:', result.events);
  }
});

// Later, to unsubscribe from status updates
unsub();

// Wait for transaction to be finalized
const result = await client.sendTx(signedTxHex).untilFinalized();
console.log('Finalized at block:', result.blockHash);

// Wait for transaction to be included in best chain block
const result = await client.sendTx(signedTxHex).untilBestChainBlockIncluded();
console.log('Included at block:', result.blockHash);
```

{% hint style="info" %}
For building and signing transactions, use `client.tx.<pallet>.<method>()` which provides a higher-level API with `.signAndSend()` method. The `sendTx` method is useful when you already have a signed transaction hex string.
{% endhint %}

### Client Events

Clients emit events that you can listen to for handling connection state changes, errors, and runtime upgrades.

```typescript
type ApiEvent = 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'ready' | 'runtimeUpgraded';
```

#### Event Handlers

Each event has a typed handler signature:

```typescript
import { SubstrateRuntimeVersion, BlockInfo } from 'dedot';

// Connection established
client.on('connected', (connectedEndpoint: string) => {
  console.log('Connected to:', connectedEndpoint);
});

// Connection lost
client.on('disconnected', () => {
  console.log('Disconnected from network');
});

// Attempting to reconnect
client.on('reconnecting', () => {
  console.log('Reconnecting...');
});

// Connection error occurred
client.on('error', (error?: Error) => {
  console.error('Connection error:', error);
});

// Client initialization complete
client.on('ready', () => {
  console.log('Client is ready for on-chain interactions');
});

// Runtime upgrade detected
client.on('runtimeUpgraded', (newRuntimeVersion: SubstrateRuntimeVersion, at: BlockInfo) => {
  console.log('Runtime upgraded to:', newRuntimeVersion.specVersion, 'at block:', at.number);
});
```

#### Event Methods

```typescript
// Subscribe to an event
const unsub = client.on('connected', (endpoint) => { /* ... */ });

// Subscribe once (auto-unsubscribes after first emission)
client.once('ready', () => { /* ... */ });

// Unsubscribe from an event
client.off('connected', handler);

// Unsubscribe (using returned function)
unsub();
```

### DedotClientOptions

When creating a `DedotClient`, you can pass configuration options to customize the client behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `JsonRpcProvider` | *required* | The JSON-RPC provider (WsProvider or SmoldotProvider) |
| `rpcVersion` | `'v2' \| 'legacy'` | `'v2'` | The JSON-RPC specification version to use |
| `cacheMetadata` | `boolean` | `false` | Enable metadata caching to localStorage (browser) |
| `cacheStorage` | `IStorage` | `localStorage` | Custom storage implementation for metadata caching |
| `metadata` | `Record<string, HexString>` | - | Pre-loaded metadata to skip download step |
| `signedExtensions` | `Record<string, AnySignedExtension>` | - | Custom signed extensions for the chain |
| `runtimeApis` | `Record<string, RuntimeApiSpec[]>` | - | Runtime API specifications (for Metadata V14 chains) |
| `throwOnUnknownApi` | `boolean` | `true` | Throw error when accessing unknown APIs |
| `hasher` | `HashFn` | `blake2_256` | Custom hashing function |
| `signer` | `InjectedSigner` | - | Transaction signer instance |
| `stalingDetectionTimeout` | `number` | `30000` | Stale connection detection timeout in ms (0 to disable) |

#### Example

```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const client = await DedotClient.new<PolkadotApi>({
  provider: new WsProvider('wss://rpc.polkadot.io'),
  rpcVersion: 'v2',
  cacheMetadata: true,
  throwOnUnknownApi: false,
  stalingDetectionTimeout: 60000,  // 60 seconds
});
