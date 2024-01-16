# DelightfulDOT

A fast & lightweight JavaScript/TypeScript client for [Polkadot](https://polkadot.network/) & [Substrate](https://substrate.io/)

<p align="left">
  <img src="https://img.shields.io/github/license/CoongCrafts/delightfuldot?style=flat-square"/>
  <img src="https://img.shields.io/github/actions/workflow/status/CoongCrafts/delightfuldot/run-tests.yml?label=unit%20tests&style=flat-square"/>
  <img src="https://img.shields.io/github/package-json/v/CoongCrafts/delightfuldot?filename=packages%2Fapi%2Fpackage.json&style=flat-square"/>
</p>

_Note: The project is still in active development phase, the information on this page might be outdated. Feel free to raise an [issue](https://github.com/CoongCrafts/delightfuldot/issues/new) if you run into any problems or want to share any ideas._

---
### Have a quick taste

Try `delightfuldot` now on [CodeSandbox Playground](https://codesandbox.io/p/devbox/trydedot-th96cm?file=%2Fmain.ts%3A24%2C26) or follow the below steps to run it on your local environment.
- Install `delightfuldot` package
```shell
# via yarn
yarn add delightfuldot

# via npm
npm i delightfuldot
```

- Install `@delightfuldot/chaintypes` package for chain types & APIs suggestion. Skip this step if you don't use TypeScript.
```shell
# via yarn
yarn add -D @delightfuldot/chaintypes

# via npm
npm i -D @delightfuldot/chaintypes
```

- Initialize the API client and start interacting with Polkadot network
```typescript
// main.ts
import { DelightfulApi } from 'delightfuldot';
import { PolkadotApi } from '@delightfuldot/chaintypes';

const run = async () => {
  const api = await DelightfulApi.new<PolkadotApi>('wss://rpc.polkadot.io');

  // Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
  const metadata = await api.rpc.state.getMetadata();
  console.log('Metadata:', metadata);

  // Query on-chain storage
  const address = '14...';
  const balance = await api.query.system.account(address);
  console.log('Balance:', balance);


  // Subscribe to on-chain storage changes
  const unsub = await api.query.system.number((blockNumber) => {
    console.log(`Current block number: ${blockNumber}`);
  });

  // Get pallet constants
  const ss58Prefix = api.consts.system.ss58Prefix;
  console.log('Polkadot ss58Prefix:', ss58Prefix)

  // await unsub();
  // await api.disconnect();
}

run().catch(console.error);
```
- You can also import `delightfuldot` using `require`.
```js
// main.js
const { DelightfulApi } = require('delightfuldot');
// ...
const api = await DelightfulApi.new('wss://rpc.polkadot.io');
```
### Table of contents
- [Status](#status)
- [Chain Types & APIs](#chain-types--apis)
- [Execute RPC Methods](#execute-rpc-methods)
- [Query On-chain Storage](#query-on-chain-storage)
- [Constants](#constants)
- [Runtime APIs ⏳](#runtime-apis)
- [Submit Transactions ⏳](#submit-transactions)
- [Events](#events)
- [Errors](#errors)
- [Credit](#credit)

### Status

| Feature | Status |
| ----------- | ----------- |
| Execute RPC (`api.rpc`) | ✅ |
| Query on-chain storage (`api.query`) | ✅ |
| Get runtime constants (`api.consts`) | ✅ |
| Call runtime APIs (`api.call`) | ⏳ |
| Transaction APIs (`api.tx`) | ⏳ |
| Events (`api.events`) | ✅ |
| Errors (`api.errors`) | ✅ |
| Contract APIs | ⏳ |
| Metadata v14 | ✅ |
| Metadata v15 | ⏳ |
| [RPC v2](https://github.com/CoongCrafts/delightfuldot/issues/20) | ⏳ |

### Chain Types & APIs

Each Substrate-based blockchain has their own set of data types & APIs to interact with, so being aware of those types & APIs when working with a blockchain will greatly improve the overall development experience. `delightfuldot` exposes TypeScript's types & APIs for each individual Substrate-based blockchain, we recommend using TypeScript for your project to have the best experience.

Types & APIs for each Substrate-based blockchains are defined in package [`@delightfuldot/chaintypes`](https://github.com/CoongCrafts/delightfuldot/tree/main/packages/chaintypes):
```shell
# via yarn
yarn add -D @delightfuldot/chaintypes

# via npm
npm i -D @delightfuldot/chaintypes
```

Initialize a `DelighfulApi` instance using the `ChainApi` interface for a target chain to enable types & APIs suggestion/autocompletion for that particular chain:
```typescript
import { DelightfulApi } from 'delightfuldot';
import type { PolkadotApi, KusamaApi, MoonbeamApi, AstarApi } from '@delightfuldot/chaintypes';

// ...

const polkadotApi = await DelightfulApi.new<PolkadotApi>('wss://rpc.polkadot.io');
console.log(await polkadotApi.query.babe.authorities());

const kusamaApi = await DelightfulApi.new<KusamaApi>('wss://kusama-rpc.polkadot.io');
console.log(await kusamaApi.query.society.memberCount());

const moonbeamApi = await DelightfulApi.new<MoonbeamApi>('wss://wss.api.moonbeam.network');
console.log(await moonbeamApi.query.ethereumChainId.chainId());

const astarApi = await DelightfulApi.new<AstarApi>('wss://rpc.astar.network');
console.log(await astarApi.query.dappsStaking.blockRewardAccumulator());

const genericApi = await DelightfulApi.new('ws://localhost:9944');

// ...
```

In alpha test version, we only support `ChainApi` interfaces for 4 networks (Polkadot, Kusama, Moonbeam & Astar), we plan to expand this list to support more Substrate-based blockchains in the near future.

### Execute RPC Methods

RPCs can be execute via `api.rpc` entry point. After creating a `DelightfulApi` instance with a `ChainApi` interface of the network you want to interact with, all RPC methods of the network will be exposed in the autocompletion/suggestion with format: `api.rpc.<module>.<methodName>`. E.g: you can find all supported RPC methods for Polkadot network [here](https://github.com/CoongCrafts/delightfuldot/blob/main/packages/chaintypes/src/polkadot/rpc.ts), similarly for other networks as well.

Examples:
```typescript
// Call rpc: `state_getMetadata`
const metadata = await api.rpc.state.getMetadata(); 

// Call an arbitrary rpc: `module_rpc_name` with arguments ['param1', 'param2']
const result = await api.rpc.module.rpc_name('param1', 'param2');
```

### Query On-chain Storage

On-chain storage can be query via `api.query` entry point. All the available storage entries for a chain are exposed in the `ChainApi` interface for that chain and can be execute with format: `api.query.<pallet>.<storgeEntry>`. E.g: You can find all the available storage queries of Polkadot network [here](https://github.com/CoongCrafts/delightfuldot/blob/main/packages/chaintypes/src/polkadot/query.ts), similarly for other networks as well.

Examples:
```typescript
// Query account balance
const balance = await api.query.system.account(<address>);

// Get all events of current block
const events = await api.query.system.events();
```
### Constants

Runtime constants (parameter types) are defined in metadata, and can be inspect via `api.consts` entry point with format: `api.consts.<pallet>.<constantName>`. All available constants are also exposed in the `ChainApi` interface. E.g: Available constants for Polkadot network is defined [here](https://github.com/CoongCrafts/delightfuldot/blob/main/packages/chaintypes/src/polkadot/consts.ts), similarly for other networks.

Examples:
```typescript
// Get runtime version
const runtimeVersion = api.consts.system.version;

// Get existential deposit in pallet balances
const existentialDeposit = api.consts.balances.existentialDeposit;
```

### Runtime APIs

⏳ _coming soon_

### Submit Transactions

⏳ _coming soon_

### Events

Events for each pallet emit during runtime operations and are defined in the medata. Available events are also exposed in `ChainApi` interface so we can get information of an event through syntax `api.events.<pallet>.<eventName>`. E.g: Events for Polkadot network can be found [here](https://github.com/CoongCrafts/delightfuldot/blob/main/packages/chaintypes/src/polkadot/events.ts), similarly for other network as well.

This `api.events` is helpful when we want quickly check if an event matches with an event that we're expecting in a list of events, the API also comes with type narrowing for the matched event, so event name & related data of the event are fully typed.

Example to list new accounts created in each block:
```typescript
// ...
const ss58Prefix = api.consts.system.ss58Prefix;
await api.query.system.events(async (eventRecords) => {
  const newAccountEvents = eventRecords
    .map(({ event }) => api.events.system.NewAccount.as(event))
    .filter((one) => one);

  console.log(newAccountEvents.length, 'account(s) was created in block', await api.query.system.number());

  newAccountEvents.forEach((event, index) => {
    console.log(`New Account ${index + 1}:`, event.palletEvent.data.account.address(ss58Prefix));
  });
});
// ...
```

### Errors

Pallet errors are thrown out when things go wrong in the runtime, those are defined in the metadata. Available errors for each pallet are also exposed in `ChainApi` interface, so we can get information an error through this syntax: `api.errors.<pallet>.<errorName>`. E.g: Available errors for Polkadot network can be found [here](https://github.com/CoongCrafts/delightfuldot/blob/main/packages/chaintypes/src/polkadot/errors.ts).

Similar to events API, this API is helpful when we want to check if an error maches with an error that we're expecting.

Example if an error is `AlreadyExists` from `Assets` pallet:
```typescript
// ...
await api.query.system.events(async (eventRecords) => {
  for (const tx of eventRecords) {
    if (api.events.system.ExtrinsicFailed.is(tx.event)) {
      const { dispatchError } = tx.event.palletEvent.data;
      if (dispatchError.tag === 'Module' && api.errors.assets.AlreadyExists.is(dispatchError.value)) {
        console.log('Assets.AlreadyExists error occurred!');
      } else {
        console.log('Other error occurred', dispatchError);
      }
    }
  }
});
// ...
```

### Credit

`delightfuldot` take a lot of inspirations from project [@polkadot/api](https://github.com/polkadot-js/api). A big thank to all the maintainers/contributors of this awesome library.

### License

[Apache-2.0](https://github.com/CoongCrafts/delightfuldot/blob/main/LICENSE)

