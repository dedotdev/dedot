import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import { HexString, u8aToHex } from '@dedot/utils';
import { MerkleizedMetatada } from '../src/index.js';

/**
 * Example of calculating metadata hash for a real chain
 */
async function main() {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

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

  const remarkTx = client.tx.system.remark('Hello World');
  await remarkTx.sign(alice, { tip: 1000_000n });

  console.log('Calculating metadata hash...');
  console.log('txHex', remarkTx.toHex());
  console.log('Digest:', u8aToHex(merkleizer.digest()));
  console.log('ProofForExtrinsic', u8aToHex(merkleizer.proofForExtrinsic(remarkTx.toHex())));

  // Disconnect the client
  await client.disconnect();
}

main().catch(console.error);
