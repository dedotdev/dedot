import { assert, deferred } from '@dedot/utils';
import { $Header, $RuntimeVersion, ChainHead, JsonRpcClient, PortableRegistry, $, $Metadata } from 'dedot';

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri: endpoint } = networkInfo.nodesByName[nodeName];

  const client = await JsonRpcClient.new(endpoint);
  const chainHead = new ChainHead(client);
  await chainHead.follow();

  assert(chainHead.bestHash, 'ChainHead.bestHash is not defined');
  assert(chainHead.finalizedHash, 'ChainHead.bestHash is not defined');
  assert(chainHead.runtimeVersion, 'ChainHead.runtimeVersion is not defined');
  assert(chainHead.bestRuntimeVersion, 'ChainHead.bestRuntimeVersion is not defined');

  // verify chainHead_header
  const rawHeader = await chainHead.header();
  const header = $Header.tryDecode(rawHeader);
  assert(header.number, 'best block height is not found');

  // verify chainHead_call
  const bestHash = chainHead.bestHash;
  const bestRuntime = chainHead.bestRuntimeVersion;
  const rawRuntime = await chainHead.call('Core_version', '0x', bestHash);
  const fetchedRuntime = $RuntimeVersion.tryDecode(rawRuntime);
  assert(bestRuntime.specVersion === fetchedRuntime.specVersion, 'Spec version mismatch');

  // verify chainHead_body
  const rawMetadata = await chainHead.call('Metadata_metadata_at_version', '0x0f000000', bestHash);
  const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
  const txs = await chainHead.body(bestHash);
  const registry = new PortableRegistry(metadata.latest);

  const extrinsics = txs.map((tx) => registry.$Extrinsic.tryDecode(tx));
  console.log(extrinsics.length, 'extrinsics found');
  extrinsics.forEach((extrinsic, idx) => {
    assert(extrinsic.call, 'Extrinsic call is not defined at index ' + idx);
  });

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
