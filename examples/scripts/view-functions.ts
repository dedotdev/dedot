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

const result = await client.view.voterList.scores(alice.address);

console.log('Voter Scores:', result);

await client.disconnect();
