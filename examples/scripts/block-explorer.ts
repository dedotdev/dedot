/**
 * BlockExplorer Verification Script
 *
 * This script demonstrates and tests all BlockExplorer functionalities.
 * It verifies block exploration capabilities including:
 * - Getting/subscribing to best blocks
 * - Getting/subscribing to finalized blocks
 * - Getting/subscribing to best blocks list (from best to finalized)
 * - Getting block headers by number or hash
 * - Getting block bodies by number or hash
 *
 * Works with both V2Client (JSON-RPC v2) and LegacyClient (legacy JSON-RPC).
 *
 * Usage: yarn tsx examples/scripts/block-explorer.ts
 */
import { DedotClient, WsProvider } from 'dedot';
import { assert } from '@dedot/utils';

// Configuration
const POLKADOT_ENDPOINT = 'wss://rpc.polkadot.io';

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Utility functions for logging
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

const logSuccess = (message: string, data?: any) => {
  log(`✅ ${message}`, data);
};

const logError = (message: string, error: any) => {
  log(`❌ ${message}: ${error.message || error}`);
  if (error.stack) {
    console.error(error.stack);
  }
};

const logWarning = (message: string) => {
  log(`⚠️  ${message}`);
};

const separator = () => console.log('\n' + '='.repeat(80) + '\n');

/**
 * Test getting the best block (one-time query)
 */
async function testBestBlock(client: DedotClient) {
  log('=== TESTING best() - One-time Query ===');

  try {
    const bestBlock = await client.block.best();
    
    assert(bestBlock.hash, 'Best block should have a hash');
    assert(typeof bestBlock.number === 'number', 'Best block should have a number');
    assert(bestBlock.parent, 'Best block should have a parent hash');

    logSuccess('Got best block', {
      hash: bestBlock.hash,
      number: bestBlock.number,
      parent: bestBlock.parent,
    });
  } catch (error) {
    logError('Failed to get best block', error);
  }
}

/**
 * Test subscribing to best block updates
 */
async function testBestBlockSubscription(client: DedotClient) {
  log('=== TESTING best(callback) - Subscription ===');

  try {
    let updateCount = 0;
    const maxUpdates = 3;

    log(`Subscribing to best block updates (will collect ${maxUpdates} updates)...`);

    const unsub = client.block.best((blockInfo) => {
      updateCount++;
      log(`Best block update #${updateCount}`, {
        hash: blockInfo.hash,
        number: blockInfo.number,
        parent: blockInfo.parent,
      });

      if (updateCount >= maxUpdates) {
        log('Unsubscribing from best block updates...');
        unsub();
        logSuccess(`Received ${updateCount} best block updates`);
      }
    });

    // Wait for updates to complete
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (updateCount >= maxUpdates) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 1000);
    });
  } catch (error) {
    logError('Failed to subscribe to best block', error);
  }
}

/**
 * Test getting the finalized block (one-time query)
 */
async function testFinalizedBlock(client: DedotClient) {
  log('=== TESTING finalized() - One-time Query ===');

  try {
    const finalizedBlock = await client.block.finalized();

    assert(finalizedBlock.hash, 'Finalized block should have a hash');
    assert(typeof finalizedBlock.number === 'number', 'Finalized block should have a number');
    assert(finalizedBlock.parent, 'Finalized block should have a parent hash');

    logSuccess('Got finalized block', {
      hash: finalizedBlock.hash,
      number: finalizedBlock.number,
      parent: finalizedBlock.parent,
    });
  } catch (error) {
    logError('Failed to get finalized block', error);
  }
}

/**
 * Test subscribing to finalized block updates
 */
async function testFinalizedBlockSubscription(client: DedotClient) {
  log('=== TESTING finalized(callback) - Subscription ===');

  try {
    let updateCount = 0;
    const maxUpdates = 2;

    log(`Subscribing to finalized block updates (will collect ${maxUpdates} updates)...`);

    const unsub = client.block.finalized((blockInfo) => {
      updateCount++;
      log(`Finalized block update #${updateCount}`, {
        hash: blockInfo.hash,
        number: blockInfo.number,
        parent: blockInfo.parent,
      });

      if (updateCount >= maxUpdates) {
        log('Unsubscribing from finalized block updates...');
        unsub();
        logSuccess(`Received ${updateCount} finalized block updates`);
      }
    });

    // Wait for updates to complete (finalized blocks update less frequently)
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (updateCount >= maxUpdates) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 1000);

      // Timeout after 2 minutes
      setTimeout(() => {
        if (updateCount < maxUpdates) {
          unsub();
          logWarning(`Only received ${updateCount} finalized block updates (timeout)`);
          resolve(undefined);
        }
      }, 120_000);
    });
  } catch (error) {
    logError('Failed to subscribe to finalized block', error);
  }
}

/**
 * Test getting the list of best blocks (from best to finalized)
 */
async function testBestsBlocks(client: DedotClient) {
  log('=== TESTING bests() - One-time Query ===');

  try {
    const bests = await client.block.bests();

    assert(Array.isArray(bests), 'Bests should return an array');
    assert(bests.length > 0, 'Bests array should not be empty');

    const firstBlock = bests[0];
    const lastBlock = bests[bests.length - 1];

    assert(firstBlock.number >= lastBlock.number, 'Blocks should be ordered from best to finalized');

    logSuccess(`Got ${bests.length} blocks from best to finalized`, {
      count: bests.length,
      bestBlock: {
        hash: firstBlock.hash,
        number: firstBlock.number,
      },
      finalizedBlock: {
        hash: lastBlock.hash,
        number: lastBlock.number,
      },
      blockNumbers: bests.map((b) => b.number),
    });
  } catch (error) {
    logError('Failed to get bests blocks', error);
  }
}

/**
 * Test subscribing to bests blocks list
 */
async function testBestsBlocksSubscription(client: DedotClient) {
  log('=== TESTING bests(callback) - Subscription ===');

  try {
    let updateCount = 0;
    const maxUpdates = 3;

    log(`Subscribing to bests blocks updates (will collect ${maxUpdates} updates)...`);

    const unsub = client.block.bests((blocks) => {
      updateCount++;
      log(`Bests blocks update #${updateCount}`, {
        count: blocks.length,
        bestNumber: blocks[0]?.number,
        finalizedNumber: blocks[blocks.length - 1]?.number,
        blockNumbers: blocks.map((b) => b.number),
      });

      if (updateCount >= maxUpdates) {
        log('Unsubscribing from bests blocks updates...');
        unsub();
        logSuccess(`Received ${updateCount} bests blocks updates`);
      }
    });

    // Wait for updates to complete
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (updateCount >= maxUpdates) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 1000);
    });
  } catch (error) {
    logError('Failed to subscribe to bests blocks', error);
  }
}

/**
 * Test getting block header by hash
 */
async function testHeaderByHash(client: DedotClient) {
  log('=== TESTING header(hash) ===');

  try {
    const bestBlock = await client.block.best();
    log(`Getting header for best block hash: ${bestBlock.hash}`);

    const header = await client.block.header(bestBlock.hash);

    assert(header, 'Header should be returned');
    assert(header.number === bestBlock.number, 'Header number should match block number');
    assert(header.parentHash === bestBlock.parent, 'Header parent hash should match block parent');

    logSuccess('Got block header by hash', {
      blockHash: bestBlock.hash,
      number: header.number,
      parentHash: header.parentHash,
      stateRoot: header.stateRoot,
      extrinsicsRoot: header.extrinsicsRoot,
    });
  } catch (error) {
    logError('Failed to get header by hash', error);
  }
}

/**
 * Test getting block header by number
 */
async function testHeaderByNumber(client: DedotClient) {
  log('=== TESTING header(number) ===');

  try {
    const finalizedBlock = await client.block.finalized();
    const targetNumber = finalizedBlock.number - 10; // Get a block 10 blocks behind finalized
    log(`Getting header for block number: ${targetNumber}`);

    const header = await client.block.header(targetNumber);

    assert(header, 'Header should be returned');
    assert(header.number === targetNumber, 'Header number should match requested number');

    logSuccess('Got block header by number', {
      blockNumber: targetNumber,
      hash: '(resolved internally)',
      number: header.number,
      parentHash: header.parentHash,
      stateRoot: header.stateRoot,
      extrinsicsRoot: header.extrinsicsRoot,
    });
  } catch (error) {
    logError('Failed to get header by number', error);
  }
}

/**
 * Test getting block body by hash
 */
async function testBodyByHash(client: DedotClient) {
  log('=== TESTING body(hash) ===');

  try {
    const bestBlock = await client.block.best();
    log(`Getting body for best block hash: ${bestBlock.hash}`);

    const body = await client.block.body(bestBlock.hash);

    assert(Array.isArray(body), 'Body should be an array');

    logSuccess('Got block body by hash', {
      blockHash: bestBlock.hash,
      blockNumber: bestBlock.number,
      transactionCount: body.length,
      firstTx: body[0]?.substring(0, 66) + '...',
    });
  } catch (error) {
    logError('Failed to get body by hash', error);
  }
}

/**
 * Test getting block body by number
 */
async function testBodyByNumber(client: DedotClient) {
  log('=== TESTING body(number) ===');

  try {
    const finalizedBlock = await client.block.finalized();
    const targetNumber = finalizedBlock.number - 5; // Get a block 5 blocks behind finalized
    log(`Getting body for block number: ${targetNumber}`);

    const body = await client.block.body(targetNumber);

    assert(Array.isArray(body), 'Body should be an array');

    logSuccess('Got block body by number', {
      blockNumber: targetNumber,
      hash: '(resolved internally)',
      transactionCount: body.length,
      firstTx: body[0]?.substring(0, 66) + '...',
    });
  } catch (error) {
    logError('Failed to get body by number', error);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 BlockExplorer Verification Script\n');
  console.log(`Connecting to ${POLKADOT_ENDPOINT}...\n`);

  const client = await DedotClient.new(new WsProvider(POLKADOT_ENDPOINT));

  try {
    log('✅ Connected successfully\n');

    // Run all tests sequentially
    separator();
    await testBestBlock(client);

    separator();
    await testBestBlockSubscription(client);

    separator();
    await testFinalizedBlock(client);

    separator();
    await testFinalizedBlockSubscription(client);

    separator();
    await testBestsBlocks(client);

    separator();
    await testBestsBlocksSubscription(client);

    separator();
    await testHeaderByHash(client);

    separator();
    await testHeaderByNumber(client);

    separator();
    await testBodyByHash(client);

    separator();
    await testBodyByNumber(client);

    separator();
    console.log(`✅ All BlockExplorer tests completed using ${client.rpcVersion} JSON-RPC!\n`);
  } catch (error: any) {
    console.error('❌ Test suite failed:', error);
    throw error;
  } finally {
    log('Disconnecting from client...');
    await client.disconnect();
    log('Disconnected. Exiting...');
  }
}

// Run the main function
main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

