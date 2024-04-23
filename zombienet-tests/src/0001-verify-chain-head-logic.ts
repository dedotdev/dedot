import { assert, deferred } from '@dedot/utils';
import { ChainHead, JsonRpcClient } from 'dedot';

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const client = await JsonRpcClient.new(endpoint);
  const chainHead = new ChainHead(client);
  await chainHead.follow();

  assert(chainHead.bestHash, 'ChainHead.bestHash is not defined');
  assert(chainHead.finalizedHash, 'ChainHead.bestHash is not defined');
  assert(chainHead.runtimeVersion, 'ChainHead.runtimeVersion is not defined');
  assert(chainHead.bestRuntimeVersion, 'ChainHead.bestRuntimeVersion is not defined');

  return await Promise.all(
    ['newBlock', 'bestBlock', 'finalizedBlock'].map((event) => {
      const defer = deferred<void>();

      // @ts-ignore
      chainHead.on(event, (newHash) => {
        assert(newHash, `Received ${event} event with empty hash`);
        console.log(`Received ${event} event with new hash: ${newHash}`);
        defer.resolve();
      });

      return defer.promise;
    }),
  );
};
