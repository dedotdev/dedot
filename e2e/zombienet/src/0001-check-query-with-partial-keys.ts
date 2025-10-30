import { V2Client, LegacyClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any) => {
  const provider = new WsProvider('wss://westend-asset-hub-rpc.polkadot.io');
  const client = await LegacyClient.new(provider);

  const collectionItems_1 = await client.query.nfts.item.pagedEntries(29, { pageSize: 2 });
  assert(collectionItems_1.length === 2, 'Incorrect number of items in collection');

  const collectionItems_2 = await client.query.nfts.item.pagedEntries(29);
  assert(collectionItems_2.length > 2, 'Should have more than 2 items in collection');

  await client.disconnect();

  const newClient = await V2Client.new(provider);

  const collectionItems_3 = await newClient.query.nfts.item.entries(29);
  assert(collectionItems_3.length > 2, 'Should have more than 2 items in collection');

  await newClient.disconnect();
};
