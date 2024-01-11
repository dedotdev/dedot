# DelightfulDOT

A fast & lightweight JavaScript/TypeScript client for Polkadot & Substrate

<p align="left">
  <img src="https://img.shields.io/github/license/CoongCrafts/delightfuldot?style=flat-square"/>
  <img src="https://img.shields.io/github/actions/workflow/status/CoongCrafts/delightfuldot/run-tests.yml?label=unit%20tests&style=flat-square"/>
  <img src="https://img.shields.io/github/package-json/v/CoongCrafts/delightfuldot?filename=packages%2Fapi%2Fpackage.json&style=flat-square"/>
</p>

---
### Have a quick taste

- Install prerelease packages
```shell
# via yarn
yarn add delightfuldot @delightfuldot/chaintypes

# via npm
npm install -S delightfuldot @delightfuldot/chaintypes
```

- Query storage
```typescript
// main.ts

import { DelightfulApi } from 'delightfuldot';
import { PolkadotApi } from '@delightfuldot/chaintypes/polkadot';

const run = async () => {
  const api = await DelightfulApi.new<PolkadotApi>('wss://rpc.polkadot.io');
  const balances = await api.query.system.account('14...');

  console.log(balances);

  await api.disconnect();
}

run().catch(console.error);
```

- Works with CommonJS on NodeJS
```js
// main.js

const { DelightfulApi } = require('delightfuldot');

const run = async () => {
  const api = await DelightfulApi.new('wss://rpc.polkadot.io');
  const balances = await api.query.system.account('14...');

  console.log(balances);

  await api.disconnect();
}

run().catch(console.error);
```

