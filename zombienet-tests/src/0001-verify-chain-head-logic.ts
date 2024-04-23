import { assert, deferred, HexString } from '@dedot/utils';
import {
  $Header,
  $RuntimeVersion,
  ChainHead,
  JsonRpcClient,
  PortableRegistry,
  $,
  $Metadata,
  QueryableStorage,
} from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';
import { ALICE, BOB } from './shared.js';

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
  console.log('chainHead_header verified');

  // verify chainHead_call
  const bestHash = chainHead.bestHash;
  const bestRuntime = chainHead.bestRuntimeVersion;
  const rawRuntime = await chainHead.call('Core_version', '0x', bestHash);
  const fetchedRuntime = $RuntimeVersion.tryDecode(rawRuntime);
  assert(bestRuntime.specVersion === fetchedRuntime.specVersion, 'Spec version mismatch');
  console.log('chainHead_call verified');

  // verify chainHead_body
  const rawMetadata = await chainHead.call('Metadata_metadata_at_version', '0x0f000000', bestHash);
  const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
  const txs = await chainHead.body(bestHash);
  const registry = new PortableRegistry(metadata.latest);

  const extrinsics = txs.map((tx) => registry.$Extrinsic.tryDecode(tx));
  console.log(extrinsics.length, 'extrinsics found');
  extrinsics.forEach((ex, idx) => {
    assert(ex.call, 'Extrinsic call is not defined at index ' + idx);
    console.log(`Ex#${idx}: ${ex.call.pallet}::${ex.call.palletCall.name || ex.call.palletCall}`);
  });
  console.log('chainHead_body verified');

  // verify chainHead_storage
  const storageEntry = new QueryableStorage(registry, 'System', 'Account');
  const aliceBalanceRawKey = storageEntry.encodeKey(ALICE);
  const bobBalanceRawKey = storageEntry.encodeKey(BOB);

  const results = await chainHead.storage([
    { type: 'value', key: aliceBalanceRawKey },
    { type: 'value', key: bobBalanceRawKey },
  ]);

  const balances: FrameSystemAccountInfo[] = results.map((result) =>
    storageEntry.decodeValue(result.value as HexString),
  );

  assert(balances.length === 2, 'Expected 2 balances');
  assert(typeof balances[0].data.free === 'bigint', 'Incorrect balance type for Alice');
  assert(typeof balances[1].data.free === 'bigint', 'Incorrect balance type for Bob');
  console.log('Alice balance:', balances[0].data.free);
  console.log('Bob balance:', balances[1].data.free);

  console.log('chainHead_storage verified');

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
