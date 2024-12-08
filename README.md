# Dedot

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

[Dedot](https://dedot.dev) is the next-generation JavaScript client for Polkadot and Substrate-based blockchains. Designed to elevate the dapp development experience, Dedot is built & optimized to be lightweight and tree-shakable, offering precise Types & APIs suggestions for individual Substrate-based blockchains and ink! Smart Contracts. Dedot also helps dapps efficiently connect to multiple chains simultaneously as we head toward a seamless multi-chain future.

### Features

- ✅ Small bundle size, tree-shakable (no more bn.js or wasm-blob tight dependencies)
- ✅ Types & APIs suggestions for each individual Substrate-based blockchain
  network ([@dedot/chaintypes](https://github.com/dedotdev/chaintypes))
- ✅ Familiar api style with `@polkadot/api`, [easy & fast migration!](https://docs.dedot.dev/getting-started/pjs-to-dedot)
- ✅ Native [TypeScript type system](https://docs.dedot.dev/getting-started/pjs-to-dedot#type-system) for scale-codec
- ✅ Compatible with `@polkadot/extension`-based wallets
- ✅ Support Metadata V14, V15 (latest)
- ✅ Built-in metadata optimization ([caching](https://docs.dedot.dev/getting-started/connect-to-network#caching-metadata), [compact mode](https://github.com/dedotdev/dedot/issues/45) ⏳)
- ✅ Build on top of both the [new](https://paritytech.github.io/json-rpc-interface-spec/introduction.html) & [legacy](https://github.com/w3f/PSPs/blob/master/PSPs/drafts/psp-6.md) (
  deprecated soon) JSON-RPC APIs
- ✅ Support [light clients](https://docs.dedot.dev/getting-started/connect-to-network#initializing-dedotclient-and-interact-with-polkadot-network) (e.g: [smoldot](https://www.npmjs.com/package/smoldot))
- ✅ [Typed Contract APIs](https://docs.dedot.dev/ink-smart-contracts/intro)
- ✅ Fully-typed low-level [JSON-RPC client](https://docs.dedot.dev/clients-and-providers/clients#jsonrpcclient)

### Documentation
Check out Dedot documentation on the website: https://dedot.dev
- [Getting started](https://docs.dedot.dev/getting-started/installation)
- [Interact with ink! smart contracts](https://docs.dedot.dev/ink-smart-contracts/intro)
- [CLI](https://docs.dedot.dev/cli)
- [Build with Dedot](https://docs.dedot.dev/help-and-faq/built-with-dedot)

### Example
1. Install packages
```shell
npm i dedot # or yarn, pnpm

npm i -D @dedot/chaintypes
```
2. Connect to the network
```typescript
import { DedotClient, WsProvider } from 'dedot';
import type { PolkadotApi } from '@dedot/chaintypes';

const provider = new WsProvider('wss://rpc.polkadot.io');
const client = await DedotClient.new<PolkadotApi>(provider);

// Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
const metadata = await client.rpc.state_getMetadata();
console.log('Metadata:', metadata);

// Listen to best blocks
client.chainHead.on('bestBlock', (block: PinnedBlock) => { // or 'finalizedBlock'
  console.log(`Current best block number: ${block.number}, hash: ${block.hash}`);
});

// Query on-chain storage
const balance = await client.query.system.account(<address>);
console.log('Balance:', balance);

// Get pallet constants
const ss58Prefix = client.consts.system.ss58Prefix;
console.log('Polkadot ss58Prefix:', ss58Prefix);

// Call runtime api
const pendingRewards = await client.call.nominationPoolsApi.pendingRewards(<address>)
console.log('Pending rewards:', pendingRewards);

// await unsub();
// await client.disconnect();
```

### Resources & announcements
- [Introducing Dedot](https://forum.polkadot.network/t/introducing-dedot-a-delightful-javascript-client-for-polkadot-substrate-based-blockchains/8956)
- [Type-safe APIs to interact with ink! Smart Contracts](https://forum.polkadot.network/t/type-safe-apis-to-interact-with-ink-smart-contracts-dedot/9485)

### Acknowledment

[Dedot](https://dedot.dev) take a lot of inspirations from project [@polkadot/api](https://github.com/polkadot-js/api). A big thank to all the maintainers/contributors of this awesome library.

Proudly supported by Web3 Foundation Grants Program.
<p align="left">
  <img width="250" src="https://user-images.githubusercontent.com/6867026/227230786-0796214a-3e3f-42af-94e9-d4122c730b62.png">
</p>

### License

[Apache-2.0](https://github.com/dedotdev/dedot/blob/main/LICENSE)


