import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { WestendApi } from '@dedot/chaintypes';
import { devPairs } from './keyring.js';

async function checkViewFunctions(client: DedotClient<WestendApi> | LegacyClient<WestendApi>, clientType: string) {
  console.log(`\nTesting view functions with ${clientType}...`);

  const { alice } = await devPairs();

  // Test voterList.scores
  const shouldBeUndefinedList = await client.view.voterList.scores(alice.address);
  console.assert(
    shouldBeUndefinedList[0] === undefined && shouldBeUndefinedList[1] === undefined,
    `[${clientType}] voterList.scores should return [undefined, undefined] for non-validator address`,
  );
  console.log(`✓ voterList.scores test passed`);

  // Test proxy.isSuperset - should be true
  const shouldBeTrue = await client.view.proxy.isSuperset('Any', 'Governance');
  console.assert(shouldBeTrue === true, `[${clientType}] proxy.isSuperset("Any", "Governance") should return true`);
  console.log(`✓ proxy.isSuperset (true case) test passed`);

  // Test proxy.isSuperset - should be false
  const shouldBeFalse = await client.view.proxy.isSuperset('Governance', 'Any');
  console.assert(shouldBeFalse === false, `[${clientType}] proxy.isSuperset("Governance", "Any") should return false`);
  console.log(`✓ proxy.isSuperset (false case) test passed`);

  // Test paras.removeUpgradeCooldownCost
  const shouldBeZero = await client.view.paras.removeUpgradeCooldownCost(0);
  console.assert(shouldBeZero === 0n, `[${clientType}] paras.removeUpgradeCooldownCost(0) should return 0n`);
  console.log(`✓ paras.removeUpgradeCooldownCost test passed`);

  console.log(`${clientType}: All assertions passed!`);
}

// Main execution
console.log('Connecting to Westend...');

// Test with DedotClient
const provider = new WsProvider('wss://rpc.ibp.network/westend');
const dedotClient = await DedotClient.create<WestendApi>({ provider });
console.log(`Connected to ${dedotClient.runtimeVersion.specName} v${dedotClient.runtimeVersion.specVersion}`);
await checkViewFunctions(dedotClient, 'DedotClient');

// Test with LegacyClient
const legacyClient = await LegacyClient.create<WestendApi>({ provider });
await checkViewFunctions(legacyClient, 'LegacyClient');

// Cleanup
console.log('\nDisconnecting clients...');
dedotClient.disconnect();
legacyClient.disconnect();
console.log('Done!');
