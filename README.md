# dedot

A delightful JavaScript/TypeScript client for [Polkadot](https://polkadot.network/) & [Substrate](https://substrate.io/)

<p align="left">
  <img src="https://img.shields.io/github/license/dedotdev/dedot?style=flat-square"/>
  <img src="https://img.shields.io/github/actions/workflow/status/dedotdev/dedot/run-tests.yml?label=unit%20tests&style=flat-square"/>
  <img src="https://img.shields.io/github/package-json/v/dedotdev/dedot?filename=packages%2Fapi%2Fpackage.json&style=flat-square"/>
</p>

_Note: The project is still in active development phase, the information on this page might be outdated. Feel free to raise an [issue](https://github.com/dedotdev/dedot/issues/new) if you run into any problems or want to share any ideas._

---
### Features
- ⏳ Small bundle size, tree-shakable (no more bn.js (⏳) or wasm-blob (✅) tight dependencies)
- ✅ Built-in metadata caching mechanism
- ✅ Types & APIs suggestions for each individual Substrate-based blockchain network ([@dedot/chaintypes](https://github.com/dedotdev/chaintypes))
- ✅ Familiar api style with `@polkadot/api`, easy & fast migration!
- ✅ Native TypeScript type system for scale-codec
- ✅ Compatible with `@polkadot/extension`-based wallets
- ⏳ Use the new JSON-RPC APIs ([v2](https://paritytech.github.io/json-rpc-interface-spec/introduction.html)) 
- ✅ Support Metadata V14, V15 (latest)

### Have a quick taste

Try `dedot` now on [CodeSandbox Playground](https://codesandbox.io/p/devbox/trydedot-th96cm?file=%2Fmain.ts%3A24%2C26) or follow the below steps to run it on your local environment.
- Install `dedot` package
```shell
# via yarn
yarn add dedot

# via npm
npm i dedot
```

- Install `@dedot/chaintypes` package for chain types & APIs suggestion. Skip this step if you don't use TypeScript.
```shell
# via yarn
yarn add -D @dedot/chaintypes

# via npm
npm i -D @dedot/chaintypes
```

- Initialize the API client and start interacting with Polkadot network
```typescript
// main.ts
import { Dedot } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const run = async () => {
  const api = await Dedot.new<PolkadotApi>('wss://rpc.polkadot.io');

  // Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
  const metadata = await api.rpc.state.getMetadata();
  console.log('Metadata:', metadata);

  // Query on-chain storage
  const balance = await api.query.system.account(<address>);
  console.log('Balance:', balance);


  // Subscribe to on-chain storage changes
  const unsub = await api.query.system.number((blockNumber) => {
    console.log(`Current block number: ${blockNumber}`);
  });

  // Get pallet constants
  const ss58Prefix = api.consts.system.ss58Prefix;
  console.log('Polkadot ss58Prefix:', ss58Prefix);

  // Call runtime api
  const pendingRewards = await api.call.nominationPoolsApi.pendingRewards(<address>)
  console.log('Pending rewards:', pendingRewards);

  // await unsub();
  // await api.disconnect();
}

run().catch(console.error);
```
- You can also import `dedot` using `require`.

```js
// main.js
const { Dedot } = require('dedot');
// ...
const api = await Dedot.new('wss://rpc.polkadot.io');
```
### Table of contents
- [Status](#status)
- [Chain Types & APIs](#chain-types--apis)
- [Execute RPC Methods](#execute-rpc-methods)
- [Query On-chain Storage](#query-on-chain-storage)
- [Constants](#constants)
- [Runtime APIs](#runtime-apis)
- [Submit Transactions](#transaction-apis)
- [Events](#events)
- [Errors](#errors)
- [`@polkadot/api` -> `dedot`](#migration-from-polkadotapi-to-dedot)
- [Credit](#credit)

### Status

| Feature                                                     | Status |
|-------------------------------------------------------------|--------|
| Execute RPC (`api.rpc`)                                     | ✅      |
| Query On-chain Storage (`api.query`)                        | ✅      |
| Get runtime constants (`api.consts`)                        | ✅      |
| Runtime APIs (`api.call`)                                   | ✅      |
| Transaction APIs (`api.tx`)                                 | ✅      |
| Events (`api.events`)                                       | ✅      |
| Errors (`api.errors`)                                       | ✅      |
| Contract APIs                                               | ⏳      |
| Metadata v14                                                | ✅      |
| Metadata v15                                                | ✅      |
| [RPC v2](https://github.com/dedotdev/dedot/issues/20)       | ⏳      |
| [Extrinsic V5](https://github.com/dedotdev/dedot/issues/55) | ⏳      |

### Chain Types & APIs

Each Substrate-based blockchain has their own set of data types & APIs to interact with, so being aware of those types & APIs when working with a blockchain will greatly improve the overall development experience. `dedot` exposes TypeScript's types & APIs for each individual Substrate-based blockchain, we recommend using TypeScript for your project to have the best experience.

Types & APIs for each Substrate-based blockchains are defined in package [`@dedot/chaintypes`](https://github.com/dedotdev/dedot/tree/main/packages/chaintypes):
```shell
# via yarn
yarn add -D @dedot/chaintypes

# via npm
npm i -D @dedot/chaintypes
```

Initialize a `Dedot` instance using the `ChainApi` interface for a target chain to enable types & APIs suggestion/autocompletion for that particular chain:
```typescript
import { Dedot } from 'dedot';
import type { PolkadotApi, KusamaApi, MoonbeamApi, AstarApi } from '@dedot/chaintypes';

// ...

const polkadotApi = await Dedot.new<PolkadotApi>('wss://rpc.polkadot.io');
console.log(await polkadotApi.query.babe.authorities());

const kusamaApi = await Dedot.new<KusamaApi>('wss://kusama-rpc.polkadot.io');
console.log(await kusamaApi.query.society.memberCount());

const moonbeamApi = await Dedot.new<MoonbeamApi>('wss://wss.api.moonbeam.network');
console.log(await moonbeamApi.query.ethereumChainId.chainId());

const astarApi = await Dedot.new<AstarApi>('wss://rpc.astar.network');
console.log(await astarApi.query.dappsStaking.blockRewardAccumulator());

const genericApi = await Dedot.new('ws://localhost:9944');

// ...
```

Supported `ChainApi` interfaces are defined [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/index.ts), you can also generate the `ChainApi` interface for the chain you want to connect with using `@dedot/cli`.

```shell
# Install @dedot/cli via yarn
yarn add -D @dedot/cli

# Or via npm
npm i -D @dedot/cli

# Generate ChainApi interface for Polkadot network via rpc endpoint: wss://rpc.polkadot.io
npx dedot chaintypes -w wss://rpc.polkadot.io
```

### Execute RPC Methods

RPCs can be executed via `api.rpc` entry point. After creating a `Dedot` instance with a `ChainApi` interface of the network you want to interact with, all RPC methods of the network will be exposed in the autocompletion/suggestion with format: `api.rpc.<module>.<methodName>`. E.g: you can find all supported RPC methods for Polkadot network [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/rpc.d.ts), similarly for other networks as well.

Examples:
```typescript
// Call rpc: `state_getMetadata`
const metadata = await api.rpc.state.getMetadata(); 

// Call an arbitrary rpc: `module_rpc_name` with arguments ['param1', 'param2']
const result = await api.rpc.module.rpc_name('param1', 'param2');
```

### Query On-chain Storage

On-chain storage can be queried via `api.query` entry point. All the available storage entries for a chain are exposed in the `ChainApi` interface for that chain and can be executed with format: `api.query.<pallet>.<storgeEntry>`. E.g: You can find all the available storage queries of Polkadot network [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/query.d.ts), similarly for other networks as well.

Examples:
```typescript
// Query account balance
const balance = await api.query.system.account(<address>);

// Get all events of current block
const events = await api.query.system.events();
```
### Constants

Runtime constants (parameter types) are defined in metadata, and can be inspected via `api.consts` entry point with format: `api.consts.<pallet>.<constantName>`. All available constants are also exposed in the `ChainApi` interface. E.g: Available constants for Polkadot network is defined [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/consts.d.ts), similarly for other networks.

Examples:
```typescript
// Get runtime version
const runtimeVersion = api.consts.system.version;

// Get existential deposit in pallet balances
const existentialDeposit = api.consts.balances.existentialDeposit;
```

### Runtime APIs

The latest stable Metadata V15 now includes all the runtime apis type information. So for chains that are supported Metadata V15, we can now execute all available runtime apis with syntax `api.call.<runtimeApi>.<methodName>`, those apis are exposed in `ChainApi` interface. E.g: Runtime Apis for Polkadot network is defined [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/runtime.d.ts), similarly for other networks as well.

Examples:
```typescript
// Get account nonce
const nonce = await api.call.accountNonceApi.accountNonce(<address>);

// Query transaction payment info
const tx = api.tx.balances.transferKeepAlive(<address>, 2_000_000_000_000n);
const queryInfo = await api.call.transactionPaymentApi.queryInfo(tx.toU8a(), tx.length);

// Get runtime version
const runtimeVersion = await api.call.core.version();
```

For chains that only support Metadata V14, we need to bring in the Runtime Api definitions when initializing the Dedot client instance to encode & decode the calls. You can find all supported Runtime Api definitions in [`@dedot/specs`](https://github.com/dedotdev/dedot/blob/60de0fed8ba19c67a7e174c6168a127fdbf6caef/packages/specs/src/runtime/all.ts#L21-L39) package.

Examples:
```typescript
import { RuntimeApis } from '@dedot/specs';
const api = await Dedot.new({ endpoint: 'wss://rpc.mynetwork.com', runtimeApis: RuntimeApis });

// Or bring in only the Runtime Api definition that you want to interact with
import { AccountNonceApi } from '@dedot/specs';
const api = await Dedot.new({ endpoint: 'wss://rpc.mynetwork.com', runtimeApis: { AccountNonceApi } });

// Get account nonce
const nonce = await api.call.accountNonceApi.accountNonce(<address>);
```

You absolutely can define your own Runtime Api definition if you don't find it in the [supported list](https://github.com/dedotdev/dedot/blob/60de0fed8ba19c67a7e174c6168a127fdbf6caef/packages/specs/src/runtime/all.ts#L21-L39).

### Transaction APIs

Transaction apis are designed to be compatible with [`IKeyringPair`](https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/types/interfaces.ts#L15-L21) and [`Signer`](https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/types/extrinsic.ts#L135-L150) interfaces, so you can sign the transactions with accounts created by a [`Keyring`](https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/keyring/src/keyring.ts#L41-L40) or from any [Polkadot{.js}-based](https://github.com/polkadot-js/extension?tab=readme-ov-file#api-interface) wallet extensions.

All transaction apis are exposed in `ChainApi` interface and can be access with syntax: `api.tx.<pallet>.<transactionName>`. E.g: Available transaction apis for Polkadot network are defined [here](https://github.com/dedotdev/dedot/blob/516c5dd948ac89ef53644b7fb1f62df1727adadb/packages/chaintypes/src/polkadot/tx.d.ts), similarly for other networks as well.

Example 1: Sign transaction with a Keying account
```typescript
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
...
await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

const unsub = await api.tx.balances
    .transferKeepAlive(<destAddress>, 2_000_000_000_000n)
    .signAndSend(alice, async ({ status }) => {
      console.log('Transaction status', status.tag);
      if (status.tag === 'InBlock') {
        console.log(`Transaction completed at block hash ${status.value}`);
        await unsub();
      }
    });
```

Example 2: Sign transaction using `Signer` from Polkadot{.js} wallet extension
```typescript
const injected = await window.injectedWeb3['polkadot-js'].enable('A cool dapp');
const account = (await injected.accounts.get())[0];
const signer = injected.signer;

const unsub = await api.tx.balances
    .transferKeepAlive(<destAddress>, 2_000_000_000_000n)
    .signAndSend(account.address, { signer }, async ({ status }) => {
      console.log('Transaction status', status.tag);
      if (status.tag === 'InBlock') {
        console.log(`Transaction completed at block hash ${status.value}`);
        await unsub();
      }
    });
```

Example 3: Submit a batch transaction
```typescript
import type { PolkadotRuntimeRuntimeCallLike } from '@dedot/chaintypes/polkadot';

// Omit the detail for simplicity
const account = ...;
const signer = ...;

const transferTx = api.tx.balances.transferKeepAlive(<destAddress>, 2_000_000_000_000n);
const remarkCall: PolkadotRuntimeRuntimeCallLike = {
  pallet: 'System',
  palletCall: {
    name: 'RemarkWithEvent',
    params: {
      remark: 'Hello Dedot!',
    },
  },
};

const unsub = api.tx.utility.batch([transferTx.call, remarkCall])
    .signAndSend(account.address, { signer }, async ({ status }) => {
      console.log('Transaction status', status.tag);
      if (status.tag === 'InBlock') {
        console.log(`Transaction completed at block hash ${status.value}`);
        await unsub();
      }
    });
```

<details>
  <summary>Example 4: Teleport WND from Westend Asset Hub to Westend via XCM</summary>
  
```typescript
import { WestendAssetHubApi, XcmVersionedLocation, XcmVersionedAssets, XcmV3WeightLimit } from '@dedot/chaintypes/westendAssetHub';
import { AccountId32 } from '@dedot/codecs';

const TWO_TOKENS = 2_000_000_000_000n;
const destAddress = <bobAddress>;

const api = await Dedot.new<WestendAssetHubApi>('...westend-assethub-rpc...');

const dest: XcmVersionedLocation = {
  tag: 'V3',
  value: { parents: 1, interior: { tag: 'Here' } },
};

const beneficiary: XcmVersionedLocation = {
  tag: 'V3',
  value: {
    parents: 0,
    interior: {
      tag: 'X1',
      value: {
        tag: 'AccountId32',
        value: { id: new AccountId32(destAddress).raw },
      },
    },
  },
};

const assets: XcmVersionedAssets = {
  tag: 'V3',
  value: [
    {
      id: {
        tag: 'Concrete',
        value: {
          parents: 1,
          interior: { tag: 'Here' },
        },
      },
      fun: {
        tag: 'Fungible',
        value: TWO_TOKENS,
      },
    },
  ],
};

const weight: XcmV3WeightLimit = { tag: 'Unlimited' };

api.tx.polkadotXcm
  .limitedTeleportAssets(dest, beneficiary, assets, 0, weight)
  .signAndSend(alice, { signer, tip: 1_000_000n }, (result) => {
    console.dir(result, { depth: null });
  });
```
</details>


### Events

Events for each pallet emit during runtime operations and are defined in the medata. Available events are also exposed in `ChainApi` interface so we can get information of an event through syntax `api.events.<pallet>.<eventName>`. E.g: Events for Polkadot network can be found [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/events.d.ts), similarly for other network as well.

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

Pallet errors are thrown out when things go wrong in the runtime, those are defined in the metadata. Available errors for each pallet are also exposed in `ChainApi` interface, so we can get information an error through this syntax: `api.errors.<pallet>.<errorName>`. E.g: Available errors for Polkadot network can be found [here](https://github.com/dedotdev/dedot/blob/main/packages/chaintypes/src/polkadot/errors.d.ts).

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

### Migration from `@polkadot/api` to `dedot`
`dedot` is inspired by `@polkadot/api`, so both are sharing some common patterns and api styling (eg: api syntax `api.<type>.<module>.<section>`). Although we have experimented some other different api stylings but to our findings and development experience, we find that the api style of `@polkadot/api` is very intuiative and easy to use. We decide the use a similar api styling with `@polkadot/api`, this also helps the migration from `@polkadot/api` to `dedot` easier & faster. 

While the api style are similar, but there're also some differences you might need to be aware of when switching to use `dedot`. 

**Initialize api client**
- `@polkadot/api`
```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

const api = await ApiPromise.create({ provider: new WsProvider('wss://rpc.polkadot.io') });
```
- `dedot`
```typescript
import { Dedot } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const api = await Dedot.new<PolkadotApi>('wss://rpc.polkadot.io'); // or Dedot.create(...) if you prefer

// OR you want to have a custom provider
import { WsProvider } from 'dedot'
const api = await Dedot.new<PolkadotApi>({ provider: new WsProvider('wss://rpc.polkadot.io') });
```

- Notes:
  - Under the hood, a `WsProvider` will be created if you initialize `Dedot` directly with an rpc endpoint.
  - `dedot` only supports provider can make subscription request (e.g: via Websocket).
  - We recommend specifying the `ChainApi` interface (e.g: [`PolkadotApi`](https://github.com/dedotdev/dedot/blob/02d7bca4c3c3d12c9591ea43b3410daf8e5aacbb/packages/chaintypes/src/polkadot/index.d.ts) in the example above) of the chain that you want to interact with. This enable apis & types suggestion/autocompletion for that particular chain (via IntelliSense). If you don't specify a `ChainApi` interface, the default [`SubstrateApi`](https://github.com/dedotdev/dedot/blob/a762faf8f6af40d3e4ef163bd538b270a5ca31e8/packages/chaintypes/src/substrate/index.d.ts) interface will be used.

**Type system**

Unlike `@polkadot/api` where data are wrapped inside a [codec types](https://polkadot.js.org/docs/api/start/types.basics), so we always need to unwrap the data before using it (e.g: via `.unwrap()`, `.toNumber()`, `.toString()`, `.toJSON()` ...). `dedot` leverages the native TypeScript type system to represent scale-codec types, so you can use the data directly without extra handling/unwrapping. The table below is a mapping between scale-codec types and TypeScript types that we're using for `dedot`:


| Scale Codec                                             | TypeScript (`dedot`)                                                                                                           |
|---------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `u8`, `u16`, `u32`, `i8`, `i16`, `i32`                  | `number`                                                                                                                       |
| `u64`, `u128`, `u256`, `i64`, `i128`, `i256`            | `bigint` (native [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), not bn.js) |
| `bool`                                                  | `boolean` (true, false)                                                                                                        |
| `Option<T>`                                             | `T \| undefined`                                                                                                               |
| `Result<Ok, Err>`                                       | `{ isOk: true; isErr?: false; value: Ok } \| { isOk?: false; isErr: true; err: Err }`                                          |
| `Vec<T>`                                                | `Array<T>`                                                                                                                     |
| `str`                                                   | `string`                                                                                                                       |
| Tuple: `(A, B)`, `()`                                   | `[A, B]`, `[]`                                                                                                                 |
| Struct: `struct { field_1: u8, field_2: str }`          | `{ field_1: number, field_2: string}`                                                                                          |
| Enum: `enum { Variant1(u8), Variant2(bool), Variant3 }` | `{ tag: 'Variant1', value: number } \| { tag: 'Variant2', value: boolean } \| { tag: 'Variant2' }`                             |
| FlatEnum: `enum { Variant1, Variant2 }`                 | `'Variant1' \| 'Variant2'`                                                                                                     |

E.g 1:
```typescript
const runtimeVersion = api.consts.system.version;

// @polkadot/api
const specName: string = runtimeVersion.toJSON().specName; // OR runtimeVersion.specName.toString()

// dedot
const specName: string = runtimeVersion.specName;
```

E.g 2: 
```typescript
const balance = await api.query.system.account(<address>);

// @polkadot/api
const freeBalance: bigint = balance.data.free.toBigInt();

// dedot
const freeBalance: bigint = balance.data.free;
```

E.g 3:
```typescript
// @polkadot/api
const proposalBondMaximum: bigint | undefined = api.consts.treasury.proposalBondMaximum.unwrapOr(undefined)?.toBigInt();

// dedot
const proposalBondMaximum: bigint | undefined = api.consts.treasury.proposalBondMaximum;
```


### Credit

`dedot` take a lot of inspirations from project [@polkadot/api](https://github.com/polkadot-js/api). A big thank to all the maintainers/contributors of this awesome library.

Proudly supported by Web3 Foundation Grants Program.
<p align="left">
  <img width="479" src="https://user-images.githubusercontent.com/6867026/227230786-0796214a-3e3f-42af-94e9-d4122c730b62.png">
</p>


### License

[Apache-2.0](https://github.com/dedotdev/dedot/blob/main/LICENSE)

