import { DedotClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import { MerkleizedMetatada } from '../src/index.js';

/**
 * Example of calculating metadata hash for a real chain
 */
async function main() {
  // Create a dedot client
  console.log('Connecting to Polkadot...');
  const provider = new WsProvider('wss://rpc.polkadot.io');
  const client = await DedotClient.create({ provider });

  // Get metadata from the client
  const metadata = client.metadata;
  console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

  // Create a calculator instance
  console.log('Creating MetatadaMerkleizer...');
  const merkleizer = new MerkleizedMetatada(metadata, {
    decimals: 10,
    tokenSymbol: 'DOT',
  });

  // Calculate metadata hash
  console.log('Calculating metadata hash...');
  const digest = merkleizer.digest();
  console.log('Digest Version:', digest);

  // Disconnect the client
  await client.disconnect();
}

main().catch(console.error);
