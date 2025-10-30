import { PolkadotAssetHubApi } from '@dedot/chaintypes';
import { V2Client, WsProvider } from 'dedot';

const client = await V2Client.new<PolkadotAssetHubApi>(new WsProvider('wss://polkadot-asset-hub-rpc.polkadot.io'));

console.log('Start querying...');

const allItems = await client.query.nfts.account.entries();
console.log('All Items', allItems.length);

const account = '15CoYMEnJhhWHvdEPXDuTBnZKXwrJzMQdcMwcHGsVx5kXYvW';
const itemsByAccount = await client.query.nfts.account.entries(account);
console.log('All Items By Account', itemsByAccount.length);

const items = await client.query.nfts.account.entries(account, 452);
console.log('All Items By Account & Collection', items.length);

await client.disconnect();
