# dedot

Delightful JavaScript/TypeScript client for [Polkadot](https://polkadot.network/) & [Substrate](https://substrate.io/)

![Version][ico-version]
![Unit test][ico-unit-test]
![E2E test][ico-e2e-test]
![License][ico-license]
[![Chat on Telegram][ico-telegram]][link-telegram]

[ico-telegram]: https://img.shields.io/badge/Dedot-2CA5E0.svg?style=flat-square&logo=telegram&label=Telegram
[ico-unit-test]: https://img.shields.io/github/actions/workflow/status/dedotdev/dedot/run-tests.yml?label=unit%20tests&style=flat-square
[ico-e2e-test]: https://img.shields.io/github/actions/workflow/status/dedotdev/dedot/zombienet-tests.yml?label=e2e%20tests&style=flat-square
[ico-version]: https://img.shields.io/github/package-json/v/dedotdev/dedot?filename=packages%2Fapi%2Fpackage.json&style=flat-square
[ico-license]: https://img.shields.io/github/license/dedotdev/dedot?style=flat-square

[link-telegram]: https://t.me/JoinDedot

---

### Features

- ✅ Small bundle size, tree-shakable (no more bn.js or wasm-blob tight dependencies)
- ✅ Types & APIs suggestions for each individual Substrate-based blockchain
  network ([@dedot/chaintypes](https://github.com/dedotdev/chaintypes))
- ✅ Familiar api style with `@polkadot/api`, [easy & fast migration!](#migration-from-polkadotapi-to-dedot)
- ✅ Native [TypeScript type system](#type-system) for scale-codec
- ✅ Compatible with `@polkadot/extension`-based wallets
- ✅ Support Metadata V14, V15 (latest)
- ✅ Built-in metadata caching mechanism
- ✅ Build on top of both the [new](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) & legacy (
  deprecated soon) JSON-RPC APIs
- ✅ Support light clients (e.g: [smoldot](https://www.npmjs.com/package/smoldot)) (_docs coming soon_)
- ✅ [Typed Contract APIs](#interact-with-ink-smart-contracts)
- ✅ Fully-typed low-level [JSON-RPC client](#execute-json-rpc-methods)
- ⏳ [Compact Metadata](https://github.com/dedotdev/dedot/issues/45)

### Table of contents

- [Getting started](#getting-started)
- [Example Dapps & Scripts](#example-dapps--scripts)
- [Chain Types & APIs](#chain-types--apis)
- [Execute JSON-RPC Methods](#execute-json-rpc-methods)
- [Query On-chain Storage](#query-on-chain-storage)
- [Constants](#constants)
- [Runtime APIs](#runtime-apis)
- [Submit Transactions](#transaction-apis)
- [Events](#events)
- [Errors](#errors)
- [Interact with ink! Smart Contracts](#interact-with-ink-smart-contracts)
- [`@polkadot/api` -> `dedot`](#migration-from-polkadotapi-to-dedot)
- [Packages Structure](#packages-structure)
- [Credit](#credit)

### Example Dapps & Scripts
- Try Dedot! - https://try.dedot.dev - [Source Code](https://github.com/dedotdev/trydedot)
- Tiny Url - https://link.dedot.dev - [Source Code](https://github.com/dedotdev/link)
- [Simple Playground Script](https://stackblitz.com/edit/try-dedot?file=main.ts&view=editor)
- [Interact with PSP22 ink! Contract](https://stackblitz.com/edit/psp22-dedot?file=main.ts&view=editor)
- Add yours?

### Getting started

#### Installation & connecting to network
Follow the below steps to install Dedot to your project.

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

- Initialize `DedotClient` and start interacting with Polkadot network

```typescript
// main.ts
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const run = async () => {
  const provider = new WsProvider('wss://rpc.polkadot.io');
  const client = await DedotClient.new<PolkadotApi>(provider);

  // Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
  const metadata = await client.rpc.state_getMetadata();
  console.log('Metadata:', metadata);

  // Query on-chain storage
  const balance = await client.query.system.account(<address>);
  console.log('Balance:', balance);


  // Subscribe to on-chain storage changes
  const unsub = await client.query.system.number((blockNumber) => {
    console.log(`Current block number: ${blockNumber}`);
  });

  // Get pallet constants
  const ss58Prefix = client.consts.system.ss58Prefix;
  console.log('Polkadot ss58Prefix:', ss58Prefix);

  // Call runtime api
  const pendingRewards = await client.call.nominationPoolsApi.pendingRewards(<address>)
  console.log('Pending rewards:', pendingRewards);

  // await unsub();
  // await client.disconnect();
}

run().catch(console.error);
```

#### Support CommonJS (`require`)

You can also import `dedot` using `require`.

```js
// main.js
const { DedotClient, WsProvider } = require('dedot');
// ...
const provider = new WsProvider('wss://rpc.polkadot.io');
const client = await DedotClient.new(provider);
```

#### Using `LegacyClient` to connect via legacy JSON-RPC APIs

If the JSON-RPC server doesn't support [new JSON-RPC APIs](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) yet, you can connect to the network using the `LegacyClient` which build on top of the [legacy JSON-RPC APIs](https://github.com/w3f/PSPs/blob/master/PSPs/drafts/psp-6.md).

```typescript
import { LegacyClient, WsProvider } from 'dedot';

const provider = new WsProvider('wss://rpc.polkadot.io');
const client = await LegacyClient.new(provider);
```

> [!NOTE]
> The [new JSON-RPC APIs](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) are not well implemented/unstable for RPC Nodes using Polkadot-SDK version < `1.11.0`, so one should connect to the network using `LegacyClient` in such cases. For nodes using Polkadot-SDK version >= `1.11.0`, it's recommended to use `DedotClient` to connect to the network.
>
> You can easily check the current node's implementation version by calling RPC `system_version`:
> ```typescript
> const version = await client.rpc.system_version();
> ```


> [!NOTE]
> It's recommended to use `DedotClient` for better performance when you connect to the network using [smoldot](https://www.npmjs.com/package/smoldot) light client via [`SmoldotProvider`](https://github.com/dedotdev/dedot/blob/main/packages/providers/src/smoldot/SmoldotProvider.ts).


### Chain Types & APIs

Each Substrate-based blockchain has their own set of data types & APIs to interact with, so being aware of those types & APIs when working with a blockchain will greatly improve the overall development experience. `dedot` exposes TypeScript's types & APIs for each individual Substrate-based blockchain, we recommend using TypeScript for your project to have the best experience.

Types & APIs for each Substrate-based blockchains are defined in package [`@dedot/chaintypes`](https://github.com/dedotdev/chaintypes):

```shell
# via yarn
yarn add -D @dedot/chaintypes

# via npm
npm i -D @dedot/chaintypes
```

Initialize `DedotClient` instance using the `ChainApi` interface for a target chain to enable types & APIs suggestion/autocompletion for that particular chain:

```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi, KusamaApi, MoonbeamApi, AstarApi } from '@dedot/chaintypes';

// ...

const polkadotClient = await DedotClient.new<PolkadotApi>(new WsProvider('wss://rpc.polkadot.io'));
console.log(await polkadotClient.query.babe.authorities());

const kusamaClient = await DedotClient.new<KusamaApi>(new WsProvider('wss://kusama-rpc.polkadot.io'));
console.log(await kusamaClient.query.society.memberCount());

const moonbeamClient = await DedotClient.new<MoonbeamApi>(new WsProvider('wss://wss.api.moonbeam.network'));
console.log(await moonbeamClient.query.ethereumChainId.chainId());

const astarClient = await DedotClient.new<AstarApi>(new WsProvider('wss://rpc.astar.network'));
console.log(await astarClient.query.dappsStaking.blockRewardAccumulator());

const client = await DedotClient.new(new WsProvider('ws://localhost:9944'));

// ...
```

Supported `ChainApi` interfaces are defined [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/index.ts), you can also generate the `ChainApi` interface for the chain you want to connect with using `dedot` cli.

```shell
# Generate ChainApi interface for Polkadot network via rpc endpoint: wss://rpc.polkadot.io
npx dedot chaintypes -w wss://rpc.polkadot.io
```

### Execute JSON-RPC Methods

RPCs can be executed via `client.rpc` entry point. After creating a `DedotClient` instance with a `ChainApi` interface of the network you want to interact with, all RPC methods of the network will be exposed in the autocompletion/suggestion with format: `client.rpc.method_name(param1, param2, ...)`. E.g: you can find all supported RPC methods for Polkadot network [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/json-rpc.d.ts), similarly for other networks as well.

Examples:

```typescript
// Call rpc: `state_getMetadata`
const metadata = await client.rpc.state_getMetadata(); 

// Call an arbitrary rpc: `module_rpc_name` with arguments ['param1', 'param2']
const result = await client.rpc.module_rpc_name('param1', 'param2');
```

For advanced users who want to interact directly with server/node via raw JSON-RPC APIs, you can use a light-weight `JsonRpcClient` for this purpose without having to use `DedotClient` or `LegacyClient`.

```typescript
import { JsonRpcClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const provider = new WsProvider('wss://rpc.polkadot.io');
const client = await JsonRpcClient.new<PolkadotApi>(provider);
const chain = await client.rpc.system_chain();

// ...
```

### Query On-chain Storage

On-chain storage can be queried via `client.query` entry point. All the available storage entries for a chain are exposed in the `ChainApi` interface for that chain and can be executed with format: `client.query.<pallet>.<storgeEntry>`. E.g: You can find all the available storage queries of Polkadot network [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/query.d.ts), similarly for other networks as well.

Examples:

```typescript
// Query account balance
const balance = await client.query.system.account(<address>);

// Get all events of current block
const events = await client.query.system.events();
```

### Constants

Runtime constants (parameter types) are defined in metadata, and can be inspected via `client.consts` entry point with format: `client.consts.<pallet>.<constantName>`. All available constants are also exposed in the `ChainApi` interface. E.g: Available constants for Polkadot network is defined [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/consts.d.ts), similarly for other networks.

Examples:

```typescript
// Get runtime version
const runtimeVersion = client.consts.system.version;

// Get existential deposit in pallet balances
const existentialDeposit = client.consts.balances.existentialDeposit;
```

### Runtime APIs

The latest stable Metadata V15 now includes all the runtime apis type information. So for chains that are supported Metadata V15, we can now execute all available runtime apis with syntax `client.call.<runtimeApi>.<methodName>`, those apis are exposed in `ChainApi` interface. E.g: Runtime Apis for Polkadot network is defined [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/runtime.d.ts), similarly for other networks as well.

Examples:

```typescript
// Get account nonce
const nonce = await client.call.accountNonceApi.accountNonce(<address>);

// Query transaction payment info
const tx = client.tx.balances.transferKeepAlive(<address>, 2_000_000_000_000n);
const queryInfo = await client.call.transactionPaymentApi.queryInfo(tx.toU8a(), tx.length);

// Get runtime version
const runtimeVersion = await client.call.core.version();
```

For chains that only support Metadata V14, we need to bring in the Runtime Api definitions when initializing the DedotClient instance to encode & decode the calls. You can find all supported Runtime Api definitions in [`dedot/runtime-specs`](https://github.com/dedotdev/dedot/blob/fefe71cf4a04d1433841f5cfc8400a1e2a8db112/packages/runtime-specs/src/all.ts#L21-L39) package.

Examples:

```typescript
import { RuntimeApis } from 'dedot/runtime-specs';

const client = await DedotClient.new({ provider: new WsProvider('wss://rpc.mynetwork.com'), runtimeApis: RuntimeApis });

// Or bring in only the Runtime Api definition that you want to interact with
import { AccountNonceApi } from 'dedot/runtime-specs';
const client = await DedotClient.new({ provider: new WsProvider('wss://rpc.mynetwork.com'), runtimeApis: { AccountNonceApi } });

// Get account nonce
const nonce = await client.call.accountNonceApi.accountNonce(<address>);
```

You absolutely can define your own Runtime Api definition if you don't find it in the [supported list](https://github.com/dedotdev/dedot/blob/fefe71cf4a04d1433841f5cfc8400a1e2a8db112/packages/runtime-specs/src/all.ts#L21-L39).

### Transaction APIs

Transaction apis are designed to be compatible with [`IKeyringPair`](https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/types/interfaces.ts#L15-L21) and [`Signer`](https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/types/extrinsic.ts#L135-L150) interfaces, so you can sign the transactions with accounts created by a [`Keyring`](https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/keyring/src/keyring.ts#L41-L40) or from any [Polkadot{.js}-based](https://github.com/polkadot-js/extension?tab=readme-ov-file#api-interface) wallet extensions.

All transaction apis are exposed in `ChainApi` interface and can be access with syntax: `api.tx.<pallet>.<transactionName>`. E.g: Available transaction apis for Polkadot network are defined [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/tx.d.ts), similarly for other networks as well.

Example 1: Sign transaction with a Keying account

```typescript
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';

// ...

await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

const unsub = await client.tx.balances
    .transferKeepAlive(<destAddress>, 2_000_000_000_000n)
    .signAndSend(alice, async ({ status }) => {
      console.log('Transaction status', status.type);
      if (status.type === 'BestChainBlockIncluded') { // or status.type === 'Finalized'
        console.log(`Transaction completed at block hash ${status.value.blockHash}`);
        await unsub();
      }
    });
```

Example 2: Sign transaction using `Signer` from Polkadot{.js} wallet extension

```typescript
const injected = await window.injectedWeb3['polkadot-js'].enable('A cool dapp');
const account = (await injected.accounts.get())[0];
const signer = injected.signer;

const unsub = await client.tx.balances
    .transferKeepAlive(<destAddress>, 2_000_000_000_000n)
    .signAndSend(account.address, { signer }, async ({ status }) => {
      console.log('Transaction status', status.type);
      if (status.type === 'BestChainBlockIncluded') { // or status.type === 'Finalized'
        console.log(`Transaction completed at block hash ${status.value.blockHash}`);
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

const transferTx = client.tx.balances.transferKeepAlive(<destAddress>, 2_000_000_000_000n);
const remarkCall: PolkadotRuntimeRuntimeCallLike = {
  pallet: 'System',
  palletCall: {
    name: 'RemarkWithEvent',
    params: {
      remark: 'Hello Dedot!',
    },
  },
};

const unsub = client.tx.utility.batch([transferTx.call, remarkCall])
    .signAndSend(account.address, { signer }, async ({ status }) => {
      console.log('Transaction status', status.type);
      if (status.type === 'BestChainBlockIncluded') { // or status.type === 'Finalized'
        console.log(`Transaction completed at block hash ${status.value.blockHash}`);
        await unsub();
      }
    });
```

<details>
  <summary>Example 4: Teleport WND from Westend Asset Hub to Westend via XCM</summary>
  
```typescript
import { WestendAssetHubApi, XcmVersionedLocation, XcmVersionedAssets, XcmV3WeightLimit } from '@dedot/chaintypes/westendAssetHub';
import { AccountId32 } from 'dedot/codecs';

const TWO_TOKENS = 2_000_000_000_000n;
const destAddress = <bobAddress>;

const client = await DedotClient.new<WestendAssetHubApi>('...westend-assethub-rpc...');

const dest: XcmVersionedLocation = {
  type: 'V3',
  value: { parents: 1, interior: { type: 'Here' } },
};

const beneficiary: XcmVersionedLocation = {
  type: 'V3',
  value: {
    parents: 0,
    interior: {
      type: 'X1',
      value: {
        type: 'AccountId32',
        value: { id: new AccountId32(destAddress).raw },
      },
    },
  },
};

const assets: XcmVersionedAssets = {
  type: 'V3',
  value: [
    {
      id: {
        type: 'Concrete',
        value: {
          parents: 1,
          interior: { type: 'Here' },
        },
      },
      fun: {
        type: 'Fungible',
        value: TWO_TOKENS,
      },
    },
  ],
};

const weight: XcmV3WeightLimit = { type: 'Unlimited' };

client.tx.polkadotXcm
  .limitedTeleportAssets(dest, beneficiary, assets, 0, weight)
  .signAndSend(alice, { signer, tip: 1_000_000n }, (result) => {
    console.dir(result, { depth: null });
  });
```

</details>

### Events

Events for each pallet emit during runtime operations and are defined in the medata. Available events are also exposed in `ChainApi` interface so we can get information of an event through syntax `client.events.<pallet>.<eventName>`. E.g: Events for Polkadot network can be found [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/events.d.ts), similarly for other network as well.

This `client.events` is helpful when we want quickly check if an event matches with an event that we're expecting in a list of events, the API also comes with type narrowing for the matched event, so event name & related data of the event are fully typed.

Example to list new accounts created in each block:

```typescript
// ...
const ss58Prefix = client.consts.system.ss58Prefix;
await client.query.system.events(async (eventRecords) => {
  const newAccountEvents = client.events.system.NewAccount.filter(eventRecords);

  console.log(newAccountEvents.length, 'account(s) was created in block', await client.query.system.number());

  newAccountEvents.forEach((event, index) => {
    console.log(`New Account ${index + 1}:`, event.palletEvent.data.account.address(ss58Prefix));
  });
});
// ...
```

### Errors

Pallet errors are thrown out when things go wrong in the runtime, those are defined in the metadata. Available errors for each pallet are also exposed in `ChainApi` interface, so we can get information an error through this syntax: `client.errors.<pallet>.<errorName>`. E.g: Available errors for Polkadot network can be found [here](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/errors.d.ts).

Similar to events API, this API is helpful when we want to check if an error maches with an error that we're expecting.

Example if an error is `AlreadyExists` from `Assets` pallet:

```typescript
// ...
await client.query.system.events(async (eventRecords) => {
  for (const tx of eventRecords) {
    if (client.events.system.ExtrinsicFailed.is(tx.event)) {
      const { dispatchError } = tx.event.palletEvent.data;
      if (client.errors.assets.AlreadyExists.is(dispatchError)) {
        console.log('Assets.AlreadyExists error occurred!');
      } else {
        console.log('Other error occurred', dispatchError);
      }
    }
  }
});
// ...
```

### Interact with ink! Smart Contracts
Dedot offers type-safe APIs to interact with ink! smart contracts. Primitives to work with contracts are exposed in `dedot/contract` package.

#### Generate Types & APIs from contract metadata
Before interacting with a contract, you need to generate Types & APIs from the contract metadata to interact with. You can do that using `dedot` cli:

```shell
dedot typink -m ./path/to/metadata.json # or metadata.contract

# use option -o to customize folder to put generated types
dedot typink -m ./path/to/metadata.json -o ./where/to-put/generated-types
```
After running the command, Types & APIs of the contract will be generated. 
E.g: if the contract's name is `flipper`, the Types & APIs will be put in a folder named `flipper`, the entry-point interface for the contract will be `FlipperContractApi` in `flipper/index.d.ts` file. An example of Types & APIs for flipper contract can be found [here](https://github.com/dedotdev/dedot/tree/main/zombienet-tests/src/contracts/flipper).

> [!NOTE]
> If you're connecting to a local [`substrate-contracts-node`](https://github.com/paritytech/substrate-contracts-node/releases) for development, you might want to connect to the network using `LegacyClient` since the latest version of `substrate-contracts-node` ([`v0.41.0`](https://github.com/paritytech/substrate-contracts-node/releases/tag/v0.41.0)) does not working fine/comply with the latest updates for [new JSON-RPC specs](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) for `DedotClient` to work properly.
> 
> Following [this instruction](#using-legacyclient-to-connect-via-legacy-json-rpc-apis) to connect to the network via `LegacyClient`.

#### Deploy contracts

Whether it's to deploy a contract from a wasm code or using an existing wasm code hash. You can do it using the `ContractDeployer`.

```typescript
import { DedotClient, WsProvider } from 'dedot';
import { ContractDeployer } from 'dedot/contract';
import { stringToHex } from 'dedot/utils'
import { FlipperContractApi } from './flipper';
import flipperMetadata from './flipper.json' assert { type: 'json' };

// instanciate an api client
const client = await DedotClient.new(new WsProvider('...'));

// load contract wasm or prepare a wasm codeHash
const wasm = '0x...';
const existingCodeHash = '0x...' // uploaded wasm

// create a ContractDeployer instance
const deployer = new ContractDeployer<FlipperContractApi>(client, flipperMetadata, wasm);

// OR from existingCodeHash
// const deployer = new ContractDeployer<FlipperContractApi>(client, flipperMetadata, existingCodeHash);

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice

// Some random salt to prevent duplication issue
// Salt is optional, you can skip this to use an empty salt 
const salt = stringToHex('random-salt'); 

// Dry run the constructor call for validation and gas estimation
// An Error will be thrown out if there's a DispatchError or LangError (contract level error)
// More on this in the handling error section below
const dryRun = await deployer.query.new(true, { caller: ALICE, salt })
const { raw: { gasRequired } } = dryRun;

// Submitting the transaction to instanciate the contract
await deployer.tx.new(true, { gasLimit: gasRequired, salt })
  .signAndSend(ALICE, ({ status, events}) => {
    if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
      // fully-typed event
      const instantiatedEvent = client.events.contracts.Instantiated.find(events);
      const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
    }    
  });
```

In case the contract constructor returning a `Result<Self, Error>`, you can also check the see if the instantiation get any errors before submitting the transaction.

```typescript
const { data } = await deployer.query.new(true, { caller: ALICE, salt })
if (data.isErr) {
  console.log('Contract instantiation returning an error:', data.err);
} else {
  // submitting the transaction
}
```

An example of this case can be found [here](https://github.com/dedotdev/dedot/blob/005ac48f5dcc5259da4a20fd5e87e4990bd773b3/zombienet-tests/src/0001-verify-contract-errors.ts#L43-L44).

#### Query contracts

The `Contract` interface will be using to interact with a contract with syntax `contract.query.<message>`.

```typescript
import { Contract } from 'dedot/contract';
import { FlipperContractApi } from './flipper';
import flipperMetadata from './flipper.json' assert { type: 'json' };

// ... initializing DedotClient

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice
const contractAddress = '...';

// create a contract instace from its metadata & address
const contract = new Contract<FlipperContractApi>(client, flipperMetadata, contractAddress);

// Making call to get the current value of the flipper contract
const result = await contract.query.get({ caller: ALICE });

// Typescipt can inspect the type of value as `boolean` with the support of FlipperContractApi interface
const value: boolean = result.data;

// You can also have access to the detailed/raw result of the call
const rawResult = result.raw;
```

#### Submitting transactions

Similarly to query contracts, the `Contract` interface will also be using to submitting transactions with syntax: `contract.tx.<message>`

```typescript
import { Contract } from 'dedot/contract';
import { FlipperContractApi } from './flipper';
import flipperMetadata from './flipper.json' assert { type: 'json' };

// ... initializing DedotClient

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice
const contractAddress = '...';

// create a contract instace from its metadata & address
const contract = new Contract<FlipperContractApi>(client, flipperMetadata, contractAddress);

// Dry-run the call for validation and gas estimation
const { data, raw } = await contract.query.flip({ caller: ALICE });

// Check if the message return a `Result<Data, Error>`
// Skip this check if the message returning raw Data
if (data.isErr) {
  console.log('Cannot make transaction due to error:', data.err);
}

// Submitting the transaction after passing validation
await contract.tx.flip({ gasLimit: raw.gasRequired })
  .signAndSend(ALICE, ({ status, events }) => {
    if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
      // fully-typed event
      const flippedEvent = contract.events.Flipped.find(events);
      console.log('Old value', flippedEvent.data.old);
      console.log('New value', flippedEvent.data.new);
    }
  })

```

#### Contract events

The `Contract` interface also have APIs to help you work with contract events easily and smoothly.

```typescript
import { ContractEvent } from 'dedot/contract';

// Initialize Contract instance
const contract = new Contract<FlipperContractApi>(client, flipperMetadata, contractAddress);

// Extracting contract events from transaction events
await contract.tx.flip({ gasLimit: raw.gasRequired })
  .signAndSend(ALICE, ({ status, events }) => {
    if (status.type === 'BestChainBlockIncluded' || status.type === 'Finalized') {
      // fully-typed event
      const flippedEvent = contract.events.Flipped.find(events);
      console.log('Old value', flippedEvent.data.old);
      console.log('New value', flippedEvent.data.new);
      
      // an array of Flipped event
      const flippedEvents = contract.events.Flipped.filter(events);
      
      // Get all contract events from current transactions
      const contractEvents: ContractEvent[] = contract.decodeEvents(events);
      
      // Another way to get the Flipper event
      const flippedEvent2 = contractEvents.find(contract.events.Flipped.is);
    }
  });

// Extracting contract events from system events
await client.query.system.events((events) => {
  // fully-typed event
  const flippedEvent = contract.events.Flipped.find(events);
  
  // get all events of this contract from current block
  const contractEvents: ContractEvent[] = contract.decodeEvents(events);
})
```

#### Handling errors

Interacting with a contract often resulting in errors at runtime level ([DispatchError](https://docs.rs/frame-support/latest/frame_support/pallet_prelude/enum.DispatchError.html)) or contract-level ([LangError](https://use.ink/4.x/faq/migrating-from-ink-3-to-4#add-support-for-language-level-errors-langerror)). 
Whenever running into these errors, Dedot will throw an Error containing specific context about the problem so developers can handle this accordingly.

```typescript
import {
  isContractInstantiateDispatchError, isContractInstantiateLangError,
  isContractDispatchError, isContractLangError
} from "dedot/contracts";
import { FlipperContractApi } from "./flipper";

const ALICE = '...';

try {
  // Dry-run contract construction
  const dryRun = await deployer.query.new(true, { caller: ALICE })

  // ...
} catch (e: any) {
  if (isContractInstantiateDispatchError<FlipperContractApi>(e)) {
    // Getting a runtime level error (e.g: Module error, Overflow error ...)
    const { dispatchError, raw } = e;
    const errorMeta = client.registy.findErrorMeta(dispatchError);
    // ...
  }

  if (isContractInstantiateLangError<FlipperContractApi>(e)) {
    const { langError, raw } = e;
    console.log('LangError', langError);
  }

  // Other errors ...
}

try {
  // Dry-run mutable contract message
  const dryRun = await contract.query.flip({ caller: ALICE })

  // ...
} catch (e: any) {
  if (isContractDispatchError<FlipperContractApi>(e)) {
    // Getting a runtime level error (e.g: Module error, Overflow error ...)
    const { dispatchError, raw } = e;
    const errorMeta = client.registy.findErrorMeta(dispatchError);
    // ...
  }

  if (isContractLangError<FlipperContractApi>(e)) {
    const { langError, raw } = e;
    console.log('LangError', langError);
  }

  // Other errors ...
}
```

### Migration from `@polkadot/api` to `dedot`
`dedot` is inspired by `@polkadot/api`, so both are sharing some common patterns and api styling (eg: api syntax `api.<type>.<module>.<section>`). Although we have experimented some other different api stylings but to our findings and development experience, we find that the api style of `@polkadot/api` is very intuiative and easy to use. We decide the use a similar api styling with `@polkadot/api`, this also helps the migration from `@polkadot/api` to `dedot` easier & faster. 

While the api style are similar, but there're also some differences you might need to be aware of when switching to use `dedot`. 

#### Initialize api client

- `@polkadot/api`

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

const client = await ApiPromise.create({ provider: new WsProvider('wss://rpc.polkadot.io') });
```

- `dedot`

```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const client = await DedotClient.new<PolkadotApi>(new WsProvider('wss://rpc.polkadot.io')); // or DedotClient.create(...) if you prefer

// OR
const client = await DedotClient.new<PolkadotApi>({ provider: new WsProvider('wss://rpc.polkadot.io') });
```

- Notes:
  - `dedot` only supports provider can make subscription request (e.g: via Websocket).
  - We recommend specifying the `ChainApi` interface (e.g: [`PolkadotApi`](https://github.com/dedotdev/chaintypes/blob/main/packages/chaintypes/src/polkadot/index.d.ts) in the example above) of the chain that you want to interact with. This enable apis & types suggestion/autocompletion for that particular chain (via IntelliSense). If you don't specify a `ChainApi` interface, the default [`SubstrateApi`](https://github.com/dedotdev/dedot/blob/a762faf8f6af40d3e4ef163bd538b270a5ca31e8/packages/chaintypes/src/substrate/index.d.ts) interface will be used.
  - `WsProvider` from `dedot` and `@polkadot/api` are different, they cannot be used interchangeable.

#### Type system

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
| Enum: `enum { Variant1(u8), Variant2(bool), Variant3 }` | `{ type: 'Variant1', value: number } \| { type: 'Variant2', value: boolean } \| { type:  'Variant2' }`                         |
| FlatEnum: `enum { Variant1, Variant2 }`                 | `'Variant1' \| 'Variant2'`                                                                                                     |

E.g 1:

```typescript
const runtimeVersion = client.consts.system.version;

// @polkadot/api
const specName: string = runtimeVersion.toJSON().specName; // OR runtimeVersion.specName.toString()

// dedot
const specName: string = runtimeVersion.specName;
```

E.g 2:

```typescript
const balance = await client.query.system.account(<address>);

// @polkadot/api
const freeBalance: bigint = balance.data.free.toBigInt();

// dedot
const freeBalance: bigint = balance.data.free;
```

E.g 3:

```typescript
// @polkadot/api
const proposalBondMaximum: bigint | undefined = client.consts.treasury.proposalBondMaximum.unwrapOr(undefined)?.toBigInt();

// dedot
const proposalBondMaximum: bigint | undefined = client.consts.treasury.proposalBondMaximum;
```

### Packages Structure

| Package name                                                                               | Description                                                                   |
|--------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| [@dedot/api](https://github.com/dedotdev/dedot/tree/main/packages/api)                     | High-level abstraction apis (clients, API executors...)                       |
| [@dedot/providers](https://github.com/dedotdev/dedot/tree/main/packages/providers)         | Providers for connection to JSON-RPC servers (WsProvider, SmoldotProvider)    |
| [@dedot/types](https://github.com/dedotdev/dedot/tree/main/packages/types)                 | Generic shared types across the packages                                      |
| [@dedot/runtime-specs](https://github.com/dedotdev/dedot/tree/main/packages/runtime-specs) | Explicit Runtime API definitions to use for chains only supports Metadata V14 |
| [@dedot/shape](https://github.com/dedotdev/dedot/tree/main/packages/shape)                 | Basic codecs/shapes for scale-codec encode/decode                             |
| [@dedot/contracts](https://github.com/dedotdev/dedot/tree/main/packages/contracts)         | APIs to interact with ink! smart contracts                                    |
| [@dedot/codecs](https://github.com/dedotdev/dedot/tree/main/packages/codecs)               | Known codecs for generic purposes ($Metadata, $AccountId32, $Extrinsic ...)   |
| [@dedot/utils](https://github.com/dedotdev/dedot/tree/main/packages/utils)                 | Useful utility functions                                                      |
| [@dedot/storage](https://github.com/dedotdev/dedot/tree/main/packages/storage)             | Storage API for different purposes (caching, ...)                             |
| [@dedot/codegen](https://github.com/dedotdev/dedot/tree/main/packages/codegen)             | Types & APIs generation engine for chaintypes & ink! smart contracts          |
| [@dedot/cli](https://github.com/dedotdev/dedot/tree/main/packages/cli)                     | Dedot's CLI                                                                   |
| [dedot](https://github.com/dedotdev/dedot/tree/main/packages/dedot)                        | Umbrella package re-exporting API from other packages                         |


### Credit

`dedot` take a lot of inspirations from project [@polkadot/api](https://github.com/polkadot-js/api). A big thank to all the maintainers/contributors of this awesome library.

Proudly supported by Web3 Foundation Grants Program.
<p align="left">
  <img width="479" src="https://user-images.githubusercontent.com/6867026/227230786-0796214a-3e3f-42af-94e9-d4122c730b62.png">
</p>

### License

[Apache-2.0](https://github.com/dedotdev/dedot/blob/main/LICENSE)


