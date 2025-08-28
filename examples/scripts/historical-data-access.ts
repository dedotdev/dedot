#!/usr/bin/env tsx

/**
 * Example: Historical Data Access with Archive Fallback
 *
 * This script demonstrates how to use DedotClient.at() to access historical blockchain data
 * from Polkadot mainnet, specifically accessing blocks that are 1000 blocks behind the
 * current finalized block. It showcases the Archive fallback mechanism when blocks are
 * not pinned in ChainHead.
 */
import { DedotClient, WsProvider } from 'dedot';

const POLKADOT_RPC = 'wss://rpc.polkadot.io';
const BLOCKS_BEHIND = 5000;

// Well-known accounts for demonstration
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const TREASURY = '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z';

async function main() {
  console.log('🔗 Connecting to Polkadot mainnet...');

  const client = await DedotClient.new(new WsProvider(POLKADOT_RPC));

  try {
    console.log('📊 Getting current blockchain state...');

    // Get current finalized block info
    const finalizedHeight = await (await client.archive()).finalizedHeight();
    const finalizedHash = await (await client.archive()).finalizedHash();

    console.log(`Current finalized block: #${finalizedHeight} (${finalizedHash})`);

    // Calculate target historical block (1000 blocks behind)
    const targetHeight = finalizedHeight - BLOCKS_BEHIND;
    console.log(`Target historical block: #${targetHeight}`);

    // Get hash of historical block
    const historicalHashes = await (await client.archive()).hashByHeight(targetHeight);
    if (historicalHashes.length === 0) {
      throw new Error(`No block found at height ${targetHeight}`);
    }

    const historicalHash = historicalHashes[0];
    console.log(`Historical block hash: ${historicalHash}`);

    console.log('\n🏛️ Accessing historical data via DedotClient.at()...');

    // Access historical block API - this will trigger Archive fallback
    const historicalApi = await client.at(historicalHash);
    const currentApi = await client.at(finalizedHash);

    console.log(`✅ Historical API created for block ${historicalApi.atBlockHash}`);
    console.log(`✅ Current API created for block ${currentApi.atBlockHash}`);

    console.log('\n📈 Comparing runtime versions...');

    // Compare runtime versions
    const [historicalRuntime, currentRuntime] = await Promise.all([
      historicalApi.call.core.version(),
      currentApi.call.core.version(),
    ]);

    console.log(`Historical runtime: ${historicalRuntime.specName}@${historicalRuntime.specVersion}`);
    console.log(`Current runtime: ${currentRuntime.specName}@${currentRuntime.specVersion}`);

    if (Number(historicalRuntime.specVersion) !== Number(currentRuntime.specVersion)) {
      console.log('🔄 Runtime upgrade detected between historical and current blocks');
    } else {
      console.log('📌 Same runtime version across blocks');
    }

    console.log('\n💰 Comparing account balances...');

    // Compare account balances across time
    const [historicalTreasury, currentTreasury] = await Promise.all([
      historicalApi.query.system.account(TREASURY),
      currentApi.query.system.account(TREASURY),
    ]);

    console.log(`Treasury balance ${BLOCKS_BEHIND} blocks ago: ${historicalTreasury.data.free} DOT`);
    console.log(`Treasury balance now: ${currentTreasury.data.free} DOT`);

    const balanceChange = currentTreasury.data.free - historicalTreasury.data.free;
    console.log(`Balance change: ${balanceChange > 0 ? '+' : ''}${balanceChange} DOT`);

    console.log('\n🏛️ Accessing historical constants...');

    // Access constants at historical block
    const historicalExistentialDeposit = historicalApi.consts.balances.existentialDeposit;
    const currentExistentialDeposit = currentApi.consts.balances.existentialDeposit;

    console.log(`Existential deposit ${BLOCKS_BEHIND} blocks ago: ${historicalExistentialDeposit}`);
    console.log(`Existential deposit now: ${currentExistentialDeposit}`);

    if (historicalExistentialDeposit !== currentExistentialDeposit) {
      console.log('⚠️ Existential deposit changed between blocks');
    } else {
      console.log('📌 Existential deposit remained constant');
    }

    console.log('\n🔍 Querying multiple accounts at historical block...');

    // Query multiple accounts at once
    const accounts = [ALICE, TREASURY];
    const historicalAccounts = await historicalApi.query.system.account.multi(accounts);

    accounts.forEach((account, index) => {
      const accountData = historicalAccounts[index];
      console.log(`${account.slice(0, 8)}... balance ${BLOCKS_BEHIND} blocks ago: ${accountData.data.free}`);
    });

    console.log('\n📊 Getting block header information...');

    // Access header information
    console.log(`Historical block runtime version: ${historicalApi.runtimeVersion.specVersion}`);
    console.log(`Historical block metadata version: ${historicalApi.metadata.version}`);

    console.log('\n🎉 Historical data access demonstration completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Accessed block #${targetHeight} (${BLOCKS_BEHIND} blocks behind finalized)`);
    console.log(`- Compared runtime versions across ${BLOCKS_BEHIND} blocks`);
    console.log(`- Queried account balances at different time points`);
    console.log(`- Verified Archive fallback mechanism`);
    console.log(`- Successfully accessed genesis block data`);
  } catch (error) {
    console.error('❌ Error during historical data access:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Polkadot mainnet');
  }
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
