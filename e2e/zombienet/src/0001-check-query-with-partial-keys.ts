import { DedotClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any) => {
  const provider = new WsProvider('wss://westend-asset-hub-rpc.polkadot.io');

  // Test with legacy client
  console.log('Testing with legacy client');
  const clientLegacy = await DedotClient.legacy(provider);

  const collectionItems_1 = await clientLegacy.query.nfts.item.pagedEntries(29, { pageSize: 2 });
  assert(collectionItems_1.length === 2, 'Incorrect number of items in collection');

  const collectionItems_2 = await clientLegacy.query.nfts.item.pagedEntries(29);
  assert(collectionItems_2.length > 2, 'Should have more than 2 items in collection');

  await clientLegacy.disconnect();

  // Test with v2 client
  console.log('Testing with v2 client');
  const clientV2 = await DedotClient.new(provider);

  const collectionItems_3 = await clientV2.query.nfts.item.entries(29);
  assert(collectionItems_3.length > 2, 'Should have more than 2 items in collection');

  await clientV2.disconnect();
};
