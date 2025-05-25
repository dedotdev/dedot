# @dedot/smoldot

A lightweight wrapper around the [smoldot](https://github.com/smol-dot/smoldot) library, providing convenient utilities for using smoldot with Web Workers in browser environments.

## Usage

```typescript
import { DedotClient, SmoldotProvider } from 'dedot';
import { startWithWorker } from 'dedot/smoldot/with-worker';
import SmoldotWorker from 'dedot/smoldot/worker?worker';

// Initialize smoldot with a worker
const smoldot = startWithWorker(new SmoldotWorker());

// Install `@substrate/connect-known-chains` package to get known-chain specs
const { chainSpec } = await import('@substrate/connect-known-chains/polkadot');

// Add a chain
const chain = smoldot.addChain({ chainSpec });

// Create a provider using the smoldot chain
const provider = new SmoldotProvider(chain);

// Initialize DedotClient with the provider
const client = await DedotClient.new(provider);

// Now you can use the client to interact with the blockchain
```

## License

Apache-2.0
