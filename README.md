# DelightfulDOT

A fast & lightweight JavaScript/TypeScript client for Polkadot & Substrate

<p align="left">
  <img src="https://img.shields.io/github/license/CoongCrafts/delightfuldot?style=flat-square"/>
  <img src="https://img.shields.io/github/actions/workflow/status/CoongCrafts/delightfuldot/run-tests.yml?label=unit%20tests&style=flat-square"/>
  <img src="https://img.shields.io/github/package-json/v/CoongCrafts/delightfuldot?filename=packages%2Fapi%2Fpackage.json&style=flat-square"/>
</p>

---
### Have a quick taste

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

- Initialize the API client and play around
```typescript
// main.ts

import { DelightfulApi } from 'delightfuldot';
import { PolkadotApi } from '@delightfuldot/chaintypes/polkadot';

const run = async () => {
  const api = await DelightfulApi.new<PolkadotApi>('wss://rpc.polkadot.io');

  // Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
  const metadata = await api.rpc.state.getMetadata();

  // Query on-chain storage
  const address = '14...';
  const balances = await api.query.system.account(address);

  // Subscribe to on-chain storage changes
  const unsub = await api.query.system.number((blockNumber) => {
    console.log(`Current block number: ${blockNumber}`);
  });

  // Get pallet constants
  const ss58Prefix = api.consts.system.ss58Prefix;

  await unsub();
  await api.disconnect();
}

run().catch(console.error);
```

