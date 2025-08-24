import { LegacyClient, WsProvider } from 'dedot';
import { $SignedBlock } from 'dedot/codecs';

const client = await LegacyClient.new(new WsProvider('wss://archive.chain.opentensor.ai:443'));

// Block explorer link: https://taostats.io/block/6285312/extrinsics
const blockHash = await client.rpc.chain_getBlockHash(6285312);
if (!blockHash) {
  throw new Error('Block hash not found');
}

const block = await client.rpc.chain_getBlock(blockHash);
if (!block) {
  throw new Error('Block not found');
}

console.log(block);
console.log(client.registry.hashAsHex($SignedBlock.tryEncode(block)));
