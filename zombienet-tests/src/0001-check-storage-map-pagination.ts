import { assert } from '@dedot/utils';
import { Dedot, WsProvider } from 'dedot';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  console.log(networkInfo.nodesByName[nodeName]);

  const api = await Dedot.new(new WsProvider(wsUri));

  const firstBatch = await api.query.system.account.pagedKeys({ pageSize: 2 });
  console.log('First batch size:', firstBatch.length);
  assert(firstBatch.length === 2, 'Incorrect first batch size');
  const secondBatchStartKey = api.query.system.account.rawKey(firstBatch[firstBatch.length - 1]);

  const secondBatch = await api.query.system.account.pagedKeys({ pageSize: 3, startKey: secondBatchStartKey });
  assert(secondBatch.length === 3, 'Incorrect second batch size');
};
