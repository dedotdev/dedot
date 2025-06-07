import { LegacyClient, WsProvider } from 'dedot';
import { assert } from 'dedot/utils';

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await LegacyClient.new(new WsProvider(wsUri));

  // Verify pagedKeys
  const firstBatch = await api.query.system.account.pagedKeys({ pageSize: 2 });
  console.log('First batch size:', firstBatch.length);
  assert(firstBatch.length === 2, 'Incorrect first batch size');
  const secondBatchStartKey = api.query.system.account.rawKey(firstBatch[0]);

  const secondBatch = await api.query.system.account.pagedKeys({ pageSize: 4, startKey: secondBatchStartKey });
  console.log('Second batch size:', secondBatch.length);
  assert(secondBatch.length === 4, 'Incorrect second batch size');

  assert(firstBatch[1].address() === secondBatch[0].address(), 'Should have the same address');

  // Verify pagedEntries
  const firstEntriesBatch = await api.query.system.account.pagedEntries({ pageSize: 2 });
  console.log('First batch size:', firstEntriesBatch.length);
  assert(firstEntriesBatch.length === 2, 'Incorrect first batch size');
  const secondEntriesBatchStartKey = api.query.system.account.rawKey(firstEntriesBatch[0][0]);

  const secondEntriesBatch = await api.query.system.account.pagedEntries({
    pageSize: 4,
    startKey: secondEntriesBatchStartKey,
  });
  console.log('Second batch size:', secondEntriesBatch.length);
  assert(secondEntriesBatch.length === 4, 'Incorrect second batch size');

  assert(firstEntriesBatch[1][0].address() === secondEntriesBatch[0][0].address(), 'Should have the same address');
  assert(
    JSON.stringify(firstEntriesBatch[1][1]) === JSON.stringify(secondEntriesBatch[0][1]),
    'Should have the same balance data',
  );
};
