import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import { u8aToHex } from '@dedot/utils';
import { MerkleizedMetadata } from '../src/index.js';

/**
 * Example of calculating metadata hash for a real chain
 *
 * To run the script:
 * ```shell
 * tsx ./packages/merkleized-metadata/examples/calculate-hash.ts
 * ```
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
  const merkleizer = new MerkleizedMetadata(metadata, {
    decimals: 10,
    tokenSymbol: 'DOT',
  });

  const remarkTx = client.tx.system.remark('Hello World');
  await remarkTx.sign(alice, { tip: 1000_000n });

  console.log('TxHex', remarkTx.toHex());
  console.log('Digest:', u8aToHex(merkleizer.digest()));
  console.log('ProofForExtrinsic', u8aToHex(merkleizer.proofForExtrinsic(remarkTx.toHex())));

  // Disconnect the client
  await client.disconnect();
}

main().catch(console.error);
