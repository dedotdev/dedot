import { Archive, JsonRpcClient, $, QueryableStorage, WsProvider } from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';
import { $Header, $RuntimeVersion, PortableRegistry, $Metadata, AccountId32 } from 'dedot/codecs';
import { assert, HexString } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const client = await JsonRpcClient.new(new WsProvider(wsUri));
  const archive = new Archive(client);

  // verify archive_genesisHash
  const genesisHash = await archive.genesisHash();
  assert(genesisHash, 'Archive.genesisHash is not defined');
  assert(typeof genesisHash === 'string', 'Genesis hash should be a string');
  assert(genesisHash.startsWith('0x'), 'Genesis hash should start with 0x');

  // Verify caching by calling again
  const genesisHash2 = await archive.genesisHash();
  assert(genesisHash === genesisHash2, 'Genesis hash should be cached');
  console.log('archive_genesisHash verified');

  // verify archive_finalizedHeight
  const finalizedHeight = await archive.finalizedHeight();
  assert(typeof finalizedHeight === 'number', 'Finalized height should be a number');
  assert(finalizedHeight >= 0, 'Finalized height should be non-negative');
  console.log('archive_finalizedHeight verified');

  // verify archive_finalizedHash
  const finalizedHash = await archive.finalizedHash();
  assert(finalizedHash, 'Archive.finalizedHash is not defined');
  assert(typeof finalizedHash === 'string', 'Finalized hash should be a string');
  assert(finalizedHash.startsWith('0x'), 'Finalized hash should start with 0x');
  console.log('archive_finalizedHash verified');

  // verify archive_hashByHeight
  const hashesAtFinalized = await archive.hashByHeight(finalizedHeight);
  assert(Array.isArray(hashesAtFinalized), 'Hashes by height should be an array');
  assert(hashesAtFinalized.length > 0, 'Should have at least one hash at finalized height');
  assert(hashesAtFinalized[0] === finalizedHash, 'First hash should match finalized hash');

  // Test genesis height (should be height 0)
  const hashesAtGenesis = await archive.hashByHeight(0);
  assert(Array.isArray(hashesAtGenesis), 'Hashes at genesis should be an array');
  assert(hashesAtGenesis.length > 0, 'Should have hash at genesis height');
  assert(hashesAtGenesis[0] === genesisHash, 'Genesis hash should match');
  console.log('archive_hashByHeight verified');

  // verify archive_header
  const rawHeader = await archive.header();
  assert(rawHeader, 'Archive.header should return data');
  const header = $Header.tryDecode(rawHeader);
  assert(header.number, 'Header should have block number');
  assert(header.number === finalizedHeight, 'Header number should match finalized height');

  // Test header for specific block (genesis)
  const rawGenesisHeader = await archive.header(genesisHash);
  assert(rawGenesisHeader, 'Genesis header should exist');
  const genesisHeader = $Header.tryDecode(rawGenesisHeader);
  assert(genesisHeader.number === 0, 'Genesis header should have number 0');
  console.log('archive_header verified');

  // verify archive_body
  const txs = await archive.body();
  assert(Array.isArray(txs), 'Body should return array of transactions');

  // Test body for specific block (genesis should have no transactions typically)
  const genesisTxs = await archive.body(genesisHash);
  assert(Array.isArray(genesisTxs), 'Genesis body should return array');
  console.log('archive_body verified');

  // verify archive_call
  const rawRuntime = await archive.call('Core_version', '0x');
  const runtime = $RuntimeVersion.tryDecode(rawRuntime);
  assert(runtime.specVersion, 'Runtime version should have spec version');

  // Test call on specific block (genesis)
  const rawGenesisRuntime = await archive.call('Core_version', '0x', genesisHash);
  const genesisRuntime = $RuntimeVersion.tryDecode(rawGenesisRuntime);
  assert(genesisRuntime.specVersion, 'Genesis runtime version should have spec version');
  console.log('archive_call verified');

  // Get metadata for storage testing
  const rawMetadata = await archive.call('Metadata_metadata_at_version', '0x0f000000');
  const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
  const registry = new PortableRegistry(metadata.latest);

  // verify archive_storage
  const storageEntry = new QueryableStorage(registry, 'System', 'Account');
  const aliceBalanceRawKey = storageEntry.encodeKey(ALICE);
  const bobBalanceRawKey = storageEntry.encodeKey(BOB);

  const results = await archive.storage([
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

  assert(balances[0][0].address() === ALICE, `Incorrect Alice's address`);
  assert(balances[1][0].address() === BOB, `Incorrect Bob's address`);
  console.log('Alice balance:', balances[0][1].data.free);
  console.log('Bob balance:', balances[1][1].data.free);

  // Test storage with descendants values
  const rawAccounts = await archive.storage([{ type: 'descendantsValues', key: storageEntry.prefixKey }]);
  const accounts: [AccountId32, FrameSystemAccountInfo][] = rawAccounts.map(({ key, value }) => [
    storageEntry.decodeKey(key as HexString),
    storageEntry.decodeValue(value as HexString),
  ]);

  console.log('Total accounts:', accounts.length);
  assert(accounts.length > 0, 'Should have at least some accounts');
  assert(
    accounts.some(([key]) => key.address() === ALICE),
    'Should include Alice',
  );
  assert(
    accounts.some(([key]) => key.address() === BOB),
    'Should include Bob',
  );

  // Test storage on specific block (genesis - should have fewer or different accounts)
  const genesisAccounts = await archive.storage(
    [{ type: 'descendantsValues', key: storageEntry.prefixKey }],
    null,
    genesisHash,
  );
  console.log('Genesis accounts:', genesisAccounts.length);
  assert(Array.isArray(genesisAccounts), 'Genesis accounts should be an array');

  console.log('archive_storage verified');

  // Test cross-block consistency
  if (finalizedHeight > 0) {
    const previousHeight = finalizedHeight - 1;
    const previousHashes = await archive.hashByHeight(previousHeight);
    if (previousHashes.length > 0) {
      const previousHash = previousHashes[0];
      const previousHeader = await archive.header(previousHash);
      if (previousHeader) {
        const decodedPreviousHeader = $Header.tryDecode(previousHeader);
        assert(decodedPreviousHeader.number === previousHeight, 'Previous header number should match');
        console.log('Cross-block consistency verified');
      }
    }
  }

  console.log('All archive methods verified successfully');
};
