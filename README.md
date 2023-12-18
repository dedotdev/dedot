# DelightfulDOT

We're breaking fast, expect chaos soon! 

--- 
Of course docs will come along!

In the meantime, you can read the proposal [here](https://grants.web3.foundation/applications/delightfuldot)

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
  const api = await DelightfulApi.create<PolkadotApi>('wss://rpc.polkadot.io');
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
    const api = await DelightfulApi.create('wss://rpc.polkadot.io');
    const balances = await api.query.system.account('14...');
    console.log(balances);

    await api.disconnect();
}

run().catch(console.error);
```

