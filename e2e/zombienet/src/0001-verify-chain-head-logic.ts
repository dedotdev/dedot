import { ChainHead, JsonRpcClient, $, QueryableStorage, PinnedBlock, WsProvider } from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';
import { $Header, $RuntimeVersion, PortableRegistry, $Metadata, AccountId32 } from 'dedot/codecs';
import { assert, deferred, HexString } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const client = await JsonRpcClient.new(new WsProvider(wsUri));
  const chainHead = new ChainHead(client);
  await chainHead.follow();

  assert(await chainHead.bestHash(), 'ChainHead.bestHash is not defined');
  assert(await chainHead.finalizedHash(), 'ChainHead.bestHash is not defined');
  assert(await chainHead.runtimeVersion(), 'ChainHead.runtimeVersion is not defined');
  assert(await chainHead.bestRuntimeVersion(), 'ChainHead.bestRuntimeVersion is not defined');

  // verify chainHead_header
  const rawHeader = await chainHead.header();
  const header = $Header.tryDecode(rawHeader);
  assert(header.number, 'best block height is not found');
  console.log('chainHead_header verified');

  // verify chainHead_call
  const bestHash = await chainHead.bestHash();
  const bestRuntime = await chainHead.bestRuntimeVersion();
  const rawRuntime = await chainHead.call('Core_version', '0x', bestHash);
  const fetchedRuntime = $RuntimeVersion.tryDecode(rawRuntime);
  assert(bestRuntime.specVersion === fetchedRuntime.specVersion, 'Spec version mismatch');
  console.log('chainHead_call verified');

  // verify chainHead_body
  const rawMetadata = await chainHead.call('Metadata_metadata_at_version', '0x0f000000', bestHash);
  const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
  console.log('Signed Extensions', metadata.latest.extrinsic.signedExtensions);
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

  const balances: [AccountId32, FrameSystemAccountInfo][] = results.map(({ key, value }) => [
    storageEntry.decodeKey(key as HexString),
    storageEntry.decodeValue(value as HexString),
  ]);

  assert(balances.length === 2, 'Expected 2 balances');

  assert(typeof balances[0][1].data.free === 'bigint', 'Incorrect balance type for Alice');
  assert(typeof balances[1][1].data.free === 'bigint', 'Incorrect balance type for Bob');
  console.log('Alice balance:', balances[0][1].data.free);
  console.log('Bob balance:', balances[1][1].data.free);

  assert(balances[0][0].address() === ALICE, `Incorrect Alice's address`);
  assert(balances[1][0].address() === BOB, `Incorrect Bob's address`);

  const rawAccounts = await chainHead.storage([{ type: 'descendantsValues', key: storageEntry.prefixKey }]);
  const accounts: [AccountId32, FrameSystemAccountInfo][] = rawAccounts.map(({ key, value }) => [
    storageEntry.decodeKey(key as HexString),
    storageEntry.decodeValue(value as HexString),
  ]);
  console.log('Total accounts:', accounts.length);
  assert(
    accounts.some(([key]) => key.address() === ALICE),
    'Should include Alice',
  );
  assert(
    accounts.some(([key]) => key.address() === BOB),
    'Should include Bob',
  );

  console.log('chainHead_storage verified');

  await Promise.all(
    ['newBlock', 'bestBlock', 'finalizedBlock'].map((event) => {
      const defer = deferred<void>();

      // @ts-ignore
      chainHead.on(event, (block: PinnedBlock) => {
        assert(block.hash, `Received ${event} event with empty hash`);
        console.log(`Received ${event} event with new hash: ${block.hash}`);
        defer.resolve();
      });

      return defer.promise;
    }),
  );

  await chainHead.unfollow();

  try {
    await chainHead.bestHash();
    throw new Error('Should not reach here');
  } catch (e: any) {
    assert(
      e.message === 'Please call the .follow() method before invoking any other methods in this group.',
      'Wrong error message',
    );
  }
};
