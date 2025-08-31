#!/usr/bin/env tsx

/**
 * Memory consumption debugging script for Dedot
 *
 * This script connects to Polkadot mainnet and performs various operations
 * on 2000 recent blocks to analyze memory consumption patterns.
 */
import { $Header } from '@dedot/codecs';
import { DedotClient, WsProvider } from 'dedot';

// const RPC_ENDPOINT = 'wss://archive.minersunion.ai';
const RPC_ENDPOINT = 'wss://bittensor-finney.api.onfinality.io/public-ws';
const BLOCKS_TO_PROCESS = 100_000;

interface MemoryStats {
  blockNumber: number;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

function formatBytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function getMemoryStats(blockNumber: number): MemoryStats {
  const memUsage = process.memoryUsage();
  return {
    blockNumber,
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers,
  };
}

function logMemoryUsage(stats: MemoryStats, index: number, total: number) {
  const progress = (((index + 1) / total) * 100).toFixed(1);
  console.log(
    `[${index + 1}/${total} - ${progress}%] Block #${stats.blockNumber} | ` +
      `RSS: ${formatBytes(stats.rss)} | ` +
      `Heap Used: ${formatBytes(stats.heapUsed)} | ` +
      `Heap Total: ${formatBytes(stats.heapTotal)} | ` +
      `External: ${formatBytes(stats.external)} | ` +
      `ArrayBuffers: ${formatBytes(stats.arrayBuffers)}`,
  );
}

async function processBlock(api: DedotClient, blockNumber: number, index: number): Promise<MemoryStats> {
  try {
    // 1. Get block hash
    const blockHash = await api.rpc.chain_getBlockHash(blockNumber);
    if (!blockHash) {
      throw new Error(`No block hash found for block #${blockNumber}`);
    }

    // 2. Get block data
    const signedBlock = await api.rpc.chain_getBlock(blockHash);
    if (!signedBlock) {
      throw new Error(`No block data found for hash ${blockHash}`);
    }

    // 3. Encode header twice using registry
    const headerHash1 = api.registry.hashAsHex($Header.tryEncode(signedBlock.block.header));
    const headerHash2 = api.registry.hashAsHex($Header.tryEncode(signedBlock.block.header));

    // 4. Create apiAtBlock
    const apiAtBlock = await api.at(blockHash);

    // 5. Query system events
    const events = await apiAtBlock.query.system.events();
    console.log('Events Size', events.length);

    // 6. Decode each extrinsic with events and dispatch results
    const decodedExtrinsics = signedBlock.block.extrinsics.map((rawExtrinsic, index) => {
      try {
        const extrinsic = api.registry.$Extrinsic.tryDecode(rawExtrinsic);

        const extrinsicEvents = events
          .filter(({ phase }) => phase.type === 'ApplyExtrinsic' && phase.value === index)
          .map(({ event }) => event);

        const dispatchResult = (() => {
          for (const event of extrinsicEvents) {
            if (api.events.system.ExtrinsicSuccess.is(event)) {
              return {
                isSuccess: true as const,
                dispatchInfo: event.palletEvent.data.dispatchInfo,
              };
            }

            if (api.events.system.ExtrinsicFailed.is(event)) {
              return {
                isSuccess: false as const,
                dispatchInfo: event.palletEvent.data.dispatchInfo,
                dispatchError: event.palletEvent.data.dispatchError,
              };
            }
          }

          // Some extrinsics (like inherents) might not have success/failure events
          console.warn(`No success/failure event found for extrinsic ${index} in block #${blockNumber}`);
          return {
            isSuccess: undefined,
            dispatchInfo: undefined,
          };
        })();

        return {
          id: {
            blockNumber,
            extrinsicIndex: index,
          },
          extrinsic,
          events: extrinsicEvents,
          ...dispatchResult,
        };
      } catch (error: any) {
        console.error(`Failed to decode extrinsic ${index} in block #${blockNumber}:`, error);
        return {
          id: {
            blockNumber,
            extrinsicIndex: index,
          },
          extrinsic: null,
          events: [],
          isSuccess: undefined,
          error: error.message,
        };
      }
    });

    console.log('Tx Size', decodedExtrinsics.length);

    // Get memory stats after processing
    const stats = getMemoryStats(blockNumber);

    // Log progress and memory usage
    logMemoryUsage(stats, index, BLOCKS_TO_PROCESS);

    return stats;
  } catch (error) {
    console.error(`Error processing block #${blockNumber}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🔗 Connecting to Polkadot mainnet...');
  console.log(`📊 Will process ${BLOCKS_TO_PROCESS} recent blocks\n`);

  const api = await DedotClient.new(new WsProvider(RPC_ENDPOINT));

  try {
    // Get initial memory baseline
    const initialMemory = getMemoryStats(0);
    console.log('📈 Initial memory usage:');
    console.log(`  RSS: ${formatBytes(initialMemory.rss)}`);
    console.log(`  Heap Used: ${formatBytes(initialMemory.heapUsed)}`);
    console.log(`  Heap Total: ${formatBytes(initialMemory.heapTotal)}\n`);

    // Get current block height
    const finalizedHash = await api.rpc.chain_getFinalizedHead();
    const finalizedHeader = await api.rpc.chain_getHeader(finalizedHash);
    const finalizedNumber = finalizedHeader!.number;

    console.log(`📍 Current finalized block: #${finalizedNumber}`);
    console.log(`📊 Processing blocks from #${finalizedNumber - BLOCKS_TO_PROCESS + 1} to #${finalizedNumber}\n`);

    const memoryStats: MemoryStats[] = [];
    const startTime = Date.now();

    // Process blocks sequentially
    for (let i = 0; i < BLOCKS_TO_PROCESS; i++) {
      const blockNumber = finalizedNumber - BLOCKS_TO_PROCESS + i + 1;

      try {
        const stats = await processBlock(api, blockNumber, i);
        memoryStats.push(stats);
      } catch (error) {
        console.error(`Skipping block #${blockNumber} due to error`);
        continue;
      }

      // Log detailed stats every 50 blocks
      if ((i + 1) % 50 === 0) {
        const currentMemory = memoryStats[memoryStats.length - 1];
        const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
        const avgMemoryPerBlock = memoryGrowth / (i + 1);

        console.log(`\n📊 Checkpoint at block ${i + 1}/${BLOCKS_TO_PROCESS}:`);
        console.log(`  Memory growth: ${formatBytes(memoryGrowth)}`);
        console.log(`  Avg per block: ${formatBytes(avgMemoryPerBlock)}`);
        console.log(`  Time elapsed: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);
        console.log(`  Clearing cache ...`);
        await api.clearCache();
      }
    }

    // Final statistics
    const endTime = Date.now();
    const finalMemory = memoryStats[memoryStats.length - 1];
    const totalMemoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const totalTime = (endTime - startTime) / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL MEMORY CONSUMPTION REPORT');
    console.log('='.repeat(80));
    console.log(`Total blocks processed: ${memoryStats.length}`);
    console.log(`Total time: ${totalTime.toFixed(1)}s`);
    console.log(`Average time per block: ${(totalTime / memoryStats.length).toFixed(2)}s`);
    console.log('\nMemory Statistics:');
    console.log(`  Initial heap used: ${formatBytes(initialMemory.heapUsed)}`);
    console.log(`  Final heap used: ${formatBytes(finalMemory.heapUsed)}`);
    console.log(`  Total memory growth: ${formatBytes(totalMemoryGrowth)}`);
    console.log(`  Average memory per block: ${formatBytes(totalMemoryGrowth / memoryStats.length)}`);
    console.log(`  Peak RSS: ${formatBytes(Math.max(...memoryStats.map((s) => s.rss)))}`);
    console.log(`  Peak heap used: ${formatBytes(Math.max(...memoryStats.map((s) => s.heapUsed)))}`);

    // Check for memory leaks
    const avgGrowthPerBlock = totalMemoryGrowth / memoryStats.length;
    if (avgGrowthPerBlock > 1024 * 1024) {
      // More than 1MB per block
      console.log('\n⚠️  WARNING: High memory growth detected!');
      console.log(`  Average growth of ${formatBytes(avgGrowthPerBlock)} per block may indicate a memory leak.`);
    } else {
      console.log('\n✅ Memory growth appears normal.');
    }
  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  } finally {
    await api.disconnect();
    console.log('\n👋 Disconnected from Polkadot mainnet');
  }
}

// Run the script
main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
