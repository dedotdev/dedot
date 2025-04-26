import { DedotClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import { MetatadaMerkleizer, ChainMetadataInfo } from '../src/index.js';

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

  // Define chain-specific information
  const chainInfo: ChainMetadataInfo = {
    specVersion: client.runtimeVersion.specVersion,
    specName: client.runtimeVersion.specName,
    ss58Prefix: client.consts.system.ss58Prefix,
    decimals: 10,
    tokenSymbol: 'DOT',
  };

  console.log('Chain Info:', chainInfo);

  // Create a calculator instance
  console.log('Creating MetatadaMerkleizer...');
  const merkleizer = new MetatadaMerkleizer(metadata, chainInfo);

  // Calculate metadata hash
  console.log('Calculating metadata hash...');
  console.log('Metadata Hash:', merkleizer.hash());
  const digest = merkleizer.digest();
  console.log('Digest Version:', digest);
  console.log('Type Tree Root:', Buffer.from(digest.value.typeInformationTreeRoot).toString('hex'));
  console.log('Extrinsic Metadata Hash:', Buffer.from(digest.value.extrinsicMetadataHash).toString('hex'));

  // Disconnect the client
  await client.disconnect();
}

main().catch(console.error);
