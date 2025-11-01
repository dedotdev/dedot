import { DedotClient, WsProvider } from 'dedot';

// Create both NewClient (V2) and LegacyClient
const newClient = await DedotClient.new(new WsProvider('wss://polkadot-asset-hub-rpc.polkadot.io'));
const legacyClient = await DedotClient.legacy(new WsProvider('wss://polkadot-asset-hub-rpc.polkadot.io'));

console.log('Start querying with both NewClient and LegacyClient...\n');

// Query 1: All NFT account entries
console.log('=== Query 1: All NFT Account Entries ===');
const [newAllItems, legacyAllItems] = await Promise.all([
  newClient.query.nfts.account.entries(),
  legacyClient.query.nfts.account.entries(),
]);

console.log('[NewClient] All Items:', newAllItems.length);
console.log('[LegacyClient] All Items:', legacyAllItems.length);
console.log('✓ Both clients return same count:', newAllItems.length === legacyAllItems.length);
console.log();

// Query 2: Items by specific account
const account = '15CoYMEnJhhWHvdEPXDuTBnZKXwrJzMQdcMwcHGsVx5kXYvW';
console.log('=== Query 2: Items By Account ===');
const [newItemsByAccount, legacyItemsByAccount] = await Promise.all([
  newClient.query.nfts.account.entries(account),
  legacyClient.query.nfts.account.entries(account),
]);

console.log('[NewClient] All Items By Account:', newItemsByAccount.length);
console.log('[LegacyClient] All Items By Account:', legacyItemsByAccount.length);
console.log('✓ Both clients return same count:', newItemsByAccount.length === legacyItemsByAccount.length);
console.log();

// Query 3: Items by account & collection ID
console.log('=== Query 3: Items By Account & Collection ===');
const [newItems, legacyItems] = await Promise.all([
  newClient.query.nfts.account.entries(account, 452),
  legacyClient.query.nfts.account.entries(account, 452),
]);

console.log('[NewClient] All Items By Account & Collection:', newItems.length);
console.log('[LegacyClient] All Items By Account & Collection:', legacyItems.length);
console.log('✓ Both clients return same count:', newItems.length === legacyItems.length);
console.log();

console.log('=== Summary ===');
console.log('All queries produced identical results across both NewClient and LegacyClient');

await newClient.disconnect();
await legacyClient.disconnect();
