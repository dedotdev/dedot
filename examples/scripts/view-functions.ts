import { WestendApi } from '@dedot/chaintypes';
import { DedotClient, WsProvider } from 'dedot';
import { devPairs } from './keyring.js';

async function checkViewFunctions(client: DedotClient) {
  console.log(`\nTesting view functions with ${client.rpcVersion}...`);

  const { alice } = await devPairs();

  // Test voterList.scores
  const shouldBeUndefinedList = await client.view.voterList.scores(alice.address);
  console.assert(
    shouldBeUndefinedList[0] === undefined && shouldBeUndefinedList[1] === undefined,
    `[${client.rpcVersion}] voterList.scores should return [undefined, undefined] for non-validator address`,
  );
  console.log(`✓ voterList.scores test passed`);

  // Test proxy.isSuperset - should be true
  const shouldBeTrue = await client.view.proxy.isSuperset('Any', 'Governance');
  console.assert(
    shouldBeTrue === true,
    `[${client.rpcVersion}] proxy.isSuperset("Any", "Governance") should return true`,
  );
  console.log(`✓ proxy.isSuperset (true case) test passed`);

  // Test proxy.isSuperset - should be false
  const shouldBeFalse = await client.view.proxy.isSuperset('Governance', 'Any');
  console.assert(
    shouldBeFalse === false,
    `[${client.rpcVersion}] proxy.isSuperset("Governance", "Any") should return false`,
  );
  console.log(`✓ proxy.isSuperset (false case) test passed`);

  // Test paras.removeUpgradeCooldownCost
  const shouldBeZero = await client.view.paras.removeUpgradeCooldownCost(0);
  console.assert(shouldBeZero === 0n, `[${client.rpcVersion}] paras.removeUpgradeCooldownCost(0) should return 0n`);
  console.log(`✓ paras.removeUpgradeCooldownCost test passed`);

  console.log(`${client.rpcVersion}: All assertions passed!`);
}

// Main execution
console.log('Connecting to Westend...');

// Test with DedotClient
const v2Client = await DedotClient.create({ provider: new WsProvider('wss://westend-rpc.polkadot.io') });
console.log(`Connected to ${v2Client.runtimeVersion.specName} v${v2Client.runtimeVersion.specVersion}`);
await checkViewFunctions(v2Client);

// Test with LegacyClient
const legacyClient = await DedotClient.create({
  provider: new WsProvider('wss://westend-rpc.polkadot.io'),
  rpcVersion: 'legacy',
});
await checkViewFunctions(legacyClient);

// Cleanup
console.log('\nDisconnecting clients...');
await v2Client.disconnect();
await legacyClient.disconnect();
console.log('Done!');
