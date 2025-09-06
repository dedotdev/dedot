import { LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { $SignedBlock } from 'dedot/codecs';

const client = await LegacyClient.new<SubstrateApi>(new WsProvider('wss://archive.chain.opentensor.ai:443'));

// Block explorer link: https://taostats.io/block/6285312/extrinsics
const blockHash = await client.rpc.chain_getBlockHash(6285312);
if (!blockHash) {
  throw new Error('Block hash not found');
}

const block = await client.rpc.chain_getBlock(blockHash);
if (!block) {
  throw new Error('Block not found');
}

console.log(client.registry.hashAsHex($SignedBlock.tryEncode(block)));

block.block.extrinsics.forEach((ex, idx) => {
  const tx = client.registry.$Extrinsic.tryDecode(ex);
  console.log(`===TX${idx}=== `);
  tx.signature && console.log('SIGNED', tx.signature.address.type, tx.signature!.signature.type);
  console.log(tx.call);
});

await client.disconnect();
