import { DedotClient, WsProvider } from 'dedot';
import { devPairs } from './keyring.js';

/**
 * Example of fetching voter scores from the VoterList pallet on Westend via view function.
 */

const { alice } = await devPairs();

// Create a dedot client
console.log('Connecting to Westend...');
const provider = new WsProvider('wss://rpc.ibp.network/westend');
const client = await DedotClient.create({ provider });

console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

const shouldBeUndefinedList = await client.view.voterList.scores(alice.address);
console.assert(
  shouldBeUndefinedList[0] === undefined && shouldBeUndefinedList[1] === undefined,
  'voterList.scores should return [undefined, undefined] for non-validator address',
);

const shouldBeTrue = await client.view.proxy.isSuperset('Any', 'Governance');
console.assert(shouldBeTrue === true, 'proxy.isSuperset("Any", "Governance") should return true');

const shouldBeFalse = await client.view.proxy.isSuperset('Governance', 'Any');
console.assert(shouldBeFalse === false, 'proxy.isSuperset("Governance", "Any") should return false');

const shouldBeZero = await client.view.paras.removeUpgradeCooldownCost(0);
console.assert(shouldBeZero === 0n, 'paras.removeUpgradeCooldownCost(0) should return 0n');

console.log('All assertions passed!');

await client.disconnect();
