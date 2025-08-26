/**
 * Archive API Verification Script
 *
 * This script demonstrates and tests all Archive JSON-RPC APIs against Polkadot mainnet.
 * Each API test is in a separate function that can be easily commented out for selective testing.
 *
 * Usage: yarn tsx archive-api-verification.ts
 */
import { AccountId32, $Header, $RuntimeVersion, PortableRegistry, $Metadata } from '@dedot/codecs';
import { HexString, assert, deferred } from '@dedot/utils';
import { Archive, JsonRpcClient, QueryableStorage, WsProvider, $ } from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';

// Configuration
const POLKADOT_ENDPOINT = 'wss://rpc.polkadot.io';
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '16SDAKg9N6kKAbhgDyxBXdHEwpwHUHs2CNEiLNGeZV55qHna';

// Known Polkadot data for testing
const POLKADOT_GENESIS_HASH = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const TEST_BLOCK_HEIGHT = 100000; // A finalized block height

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Utility functions for logging
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('');
};

const logSuccess = (message: string, data?: any) => {
  console.log(`✅ ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('');
};

const logError = (message: string, error?: any) => {
  console.log(`❌ ${message}`);
  if (error) {
    console.log(`Error: ${error.message || error}`);
  }
  console.log('');
};

const logWarning = (message: string) => {
  console.log(`⚠️  ${message}`);
  console.log('');
};

/**
 * Test Basic Information APIs
 */
async function testBasicInfo(archive: Archive) {
  log('=== TESTING BASIC INFORMATION APIs ===');

  // Test 1: Genesis Hash
  try {
    log('Testing archive.genesisHash()...');
    const genesisHash = await archive.genesisHash();
    assert(genesisHash, 'Genesis hash should be defined');
    assert(genesisHash.startsWith('0x'), 'Genesis hash should be hex string');
    assert(genesisHash === POLKADOT_GENESIS_HASH, `Genesis hash should match Polkadot mainnet. Got: ${genesisHash}`);

    logSuccess('Genesis hash verified', { genesisHash });
  } catch (error) {
    logError('Failed to verify genesis hash', error);
  }

  // Test 2: Finalized Height
  try {
    log('Testing archive.finalizedHeight()...');
    const finalizedHeight = await archive.finalizedHeight();
    assert(typeof finalizedHeight === 'number', 'Finalized height should be a number');
    assert(finalizedHeight > 0, 'Finalized height should be positive');

    logSuccess('Finalized height verified', { finalizedHeight });
  } catch (error) {
    logError('Failed to verify finalized height', error);
  }

  // Test 3: API Version Detection
  try {
    log('Testing archive.version()...');
    const version = await archive.version();
    assert(version === 'v1', `Archive API version should be v1, got: ${version}`);

    logSuccess('Archive API version verified', { version });
  } catch (error) {
    logError('Failed to verify API version', error);
  }
}

/**
 * Test Block Data APIs
 */
async function testBlockData(archive: Archive) {
  log('=== TESTING BLOCK DATA APIs ===');

  let testBlockHash: HexString = '0x';

  // Test 1: Hash by Height
  try {
    log(`Testing archive.hashByHeight(${TEST_BLOCK_HEIGHT})...`);
    const hashes = await archive.hashByHeight(TEST_BLOCK_HEIGHT);
    assert(Array.isArray(hashes), 'Should return array of hashes');
    assert(hashes.length > 0, `Should find block hashes for height ${TEST_BLOCK_HEIGHT}`);

    testBlockHash = hashes[0];
    assert(testBlockHash.startsWith('0x'), 'Block hash should be hex string');
    assert(testBlockHash.length === 66, 'Block hash should be 32 bytes (66 chars with 0x)');

    logSuccess('Block hashes by height verified', { height: TEST_BLOCK_HEIGHT, hashes });
  } catch (error) {
    logError('Failed to verify block hashes by height', error);
  }

  if (!testBlockHash) {
    logWarning('Skipping block data tests - no valid block hash available');
    return;
  }

  // Test 2: Block Header
  try {
    log(`Testing archive.header(${testBlockHash})...`);
    const rawHeader = await archive.header(testBlockHash);
    if (rawHeader) {
      const header = $Header.tryDecode(rawHeader);
      assert(header.number, 'Block header should have a number');
      assert(header.parentHash, 'Block header should have a parent hash');

      logSuccess('Got and decoded block header', {
        hash: testBlockHash,
        blockNumber: header.number,
        parentHash: header.parentHash,
        headerLength: rawHeader.length,
      });
    } else {
      logWarning('No header found for the specified hash');
    }
  } catch (error) {
    logError('Failed to get and decode block header', error);
  }

  // Test 3: Block Body
  try {
    log(`Testing archive.body(${testBlockHash})...`);
    const body = await archive.body(testBlockHash);
    if (body) {
      assert(Array.isArray(body), 'Block body should be array of transactions');
      assert(body.length >= 0, 'Block body should have non-negative transaction count');

      // Verify each transaction is a hex string
      for (const tx of body) {
        assert(typeof tx === 'string', 'Transaction should be hex string');
        assert(tx.startsWith('0x'), 'Transaction should start with 0x');
      }

      logSuccess('Block body verified', { hash: testBlockHash, transactionCount: body.length });
    } else {
      logWarning('No body found for the specified hash');
    }
  } catch (error) {
    logError('Failed to verify block body', error);
  }

  // Test 4: Recent Finalized Block
  try {
    const finalizedHeight = await archive.finalizedHeight();
    if (finalizedHeight) {
      log(`Testing archive.hashByHeight(${finalizedHeight})... (current finalized)`);
      const finalizedHashes = await archive.hashByHeight(finalizedHeight);
      if (finalizedHashes.length > 0) {
        logSuccess('Got current finalized block hash', {
          height: finalizedHeight,
          hash: finalizedHashes[0],
        });
      }
    }
  } catch (error) {
    logError('Failed to get current finalized block', error);
  }
}

/**
 * Test Runtime API calls
 */
async function testRuntimeApi(archive: Archive) {
  log('=== TESTING RUNTIME API CALLS ===');

  // Get current finalized block hash
  let blockHash: HexString;
  try {
    const finalizedHeight = await archive.finalizedHeight();
    const finalizedHashes = await archive.hashByHeight(finalizedHeight);
    if (finalizedHashes.length === 0) {
      logWarning('Skipping runtime API tests - no finalized block hash available');
      return;
    }
    blockHash = finalizedHashes[0];
  } catch (error) {
    logError('Failed to get finalized block hash for runtime API tests', error);
    return;
  }

  // Test 1: Core_version
  try {
    log(`Testing archive.call(${blockHash}, 'Core_version', '0x')...`);
    const result = await archive.call('Core_version', '0x', blockHash);
    if (result.success) {
      logSuccess('Core_version runtime call successful', { result: result.value });
    } else {
      logError('Core_version runtime call failed', result.error);
    }
  } catch (error) {
    console.error(error);
    logError('Failed to call Core_version', error);
  }

  // Test 2: Runtime version verification
  try {
    log(`Testing archive.call(${blockHash}, 'Core_version', '0x') with proper decoding...`);
    const result = await archive.call('Core_version', '0x', blockHash);
    assert(result.success, 'Core_version call should succeed');

    const runtimeVersion = $RuntimeVersion.tryDecode(result.value);
    assert(runtimeVersion.specName, 'Runtime should have a spec name');
    assert(runtimeVersion.specVersion > 0, 'Runtime should have a spec version');

    logSuccess('Core_version runtime call and decode verified', {
      specName: runtimeVersion.specName,
      specVersion: runtimeVersion.specVersion,
      implVersion: runtimeVersion.implVersion,
    });
  } catch (error) {
    console.error(error);
    logError('Failed to call and decode Core_version', error);
  }
}

/**
 * Test Promise-based Storage APIs
 */
async function testStoragePromise(archive: Archive) {
  log('=== TESTING STORAGE APIs (Promise-based) ===');

  // Get current finalized block hash and metadata
  let blockHash: HexString;
  let storageEntry: QueryableStorage;
  let referendaStorage: QueryableStorage;

  try {
    const finalizedHeight = await archive.finalizedHeight();
    const finalizedHashes = await archive.hashByHeight(finalizedHeight);
    assert(finalizedHashes.length > 0, 'Should have finalized block hash');
    blockHash = finalizedHashes[0];

    // Get metadata to create QueryableStorage
    const rawMetadata = await archive.call('Metadata_metadata_at_version', '0x0f000000', blockHash);
    assert(rawMetadata.success, 'Metadata call should succeed');
    const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata.value)!;
    const registry = new PortableRegistry(metadata.latest);
    storageEntry = new QueryableStorage(registry, 'System', 'Account');
    referendaStorage = new QueryableStorage(registry, 'Referenda', 'ReferendumInfoFor');

    log('Successfully got block hash and metadata for storage tests');
  } catch (error) {
    logError('Failed to get block hash and metadata for storage tests', error);
    return;
  }

  // Test 1: Storage query for specific accounts
  try {
    log('Testing archive.storage() with System.Account for Alice and Bob...');

    const aliceKey = storageEntry.encodeKey(ALICE);
    const bobKey = storageEntry.encodeKey(BOB);

    const items = [
      { key: aliceKey, type: 'value' as const },
      { key: bobKey, type: 'value' as const },
    ];

    const results = await archive.storage(items, null, blockHash);
    assert(results.length <= 2, 'Should get at most 2 results');

    console.log('results', results);

    const balances: [AccountId32, FrameSystemAccountInfo][] = results.map(({ key, value }) => [
      storageEntry.decodeKey(key as HexString),
      storageEntry.decodeValue(value as HexString),
    ]);

    for (const [accountId, accountInfo] of balances) {
      assert(typeof accountInfo.data.free === 'bigint', 'Account should have bigint balance');
      log(`Account ${accountId.address()} balance: ${accountInfo.data.free}`);
    }

    logSuccess('Storage query for specific accounts verified', {
      blockHash,
      resultCount: results.length,
      accountsFound: balances.map(([acc]) => acc.address()),
    });
  } catch (error) {
    console.error(error);
    logError('Failed to query specific account storage', error);
  }

  // Test 2: Storage query without hash (uses finalized block)
  try {
    log('Testing archive.storage() without hash parameter (should use finalized block)...');
    
    const aliceKey = storageEntry.encodeKey(ALICE);
    const items = [{ key: aliceKey, type: 'value' as const }];
    
    const results = await archive.storage(items);
    log(`Got ${results.length} results using default finalized block`);
    
    logSuccess('Storage query without hash parameter verified', {
      resultCount: results.length,
      usedFinalizedBlock: true,
    });
  } catch (error) {
    logError('Failed to query storage without hash parameter', error);
  }

  // Test 3: Storage query with descendants (pagination) - Referenda
  try {
    log('Testing archive.storage() with descendantsValues for Referenda...');

    const items = [
      {
        key: referendaStorage.prefixKey,
        type: 'descendantsValues' as const,
      },
    ];

    const results = await archive.storage(items, null, blockHash);
    console.log('results', results.length);

    if (results.length === 0) {
      logWarning('No referenda found - this is expected if no active referenda exist');
      return;
    }

    const referenda: [number, any][] = results.map(({ key, value }) => [
      referendaStorage.decodeKey(key as HexString),
      referendaStorage.decodeValue(value as HexString),
    ]);

    // Verify referendum data structure
    for (const [referendumId, referendumInfo] of referenda.slice(0, 3)) {
      // Check first 3
      assert(typeof referendumId === 'number', 'Referendum ID should be a number');
      assert(referendumInfo, 'Referendum info should exist');
      log(`Referendum #${referendumId}: ${JSON.stringify(referendumInfo, null, 2).slice(0, 100)}...`);
    }

    logSuccess('Storage descendants query for Referenda verified', {
      blockHash,
      totalReferenda: referenda.length,
      sampleReferendaIds: referenda.slice(0, 5).map(([id]) => id),
    });
  } catch (error) {
    logError('Failed to query Referenda storage with descendants', error);
  }
}

/**
 * Test Control APIs (stop operations)
 */
async function testControlApis(archive: Archive) {
  log('=== TESTING CONTROL APIs ===');

  // Test 1: Stop storage operation (using a dummy operation ID)
  try {
    log('Testing archive.stopStorage()...');
    await archive.stopStorage('dummy_operation_id');
    logSuccess('stopStorage call completed (note: operation ID may not exist)');
  } catch (error) {
    logWarning('stopStorage call failed (expected for non-existent operation ID)');
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  console.log('🚀 Starting Archive API Verification Script');
  console.log(`📡 Connecting to: ${POLKADOT_ENDPOINT}`);
  console.log('');

  const provider = new WsProvider(POLKADOT_ENDPOINT);
  const jsonRpcClient = new JsonRpcClient(provider);
  const archive = new Archive(jsonRpcClient);

  try {
    log('Connecting to Polkadot...');
    await jsonRpcClient.connect();
    logSuccess('Connected to Polkadot mainnet');

    // Comment out any test sections you don't want to run

    // Basic information tests
    // await testBasicInfo(archive);
    //
    // // Block data tests
    // await testBlockData(archive);
    //
    // // Runtime API tests
    // await testRuntimeApi(archive);

    // Promise-based storage tests
    await testStoragePromise(archive);

    // Control API tests
    await testControlApis(archive);

    logSuccess('🎉 All Archive API tests completed!');
  } catch (error) {
    logError('Failed to connect or run tests', error);
  } finally {
    log('Disconnecting from Polkadot...');
    await jsonRpcClient.disconnect();
    log('👋 Script completed');
  }
}

// Run the script
main().catch(console.error);
