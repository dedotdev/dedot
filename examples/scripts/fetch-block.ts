import { LegacyClient, WsProvider } from 'dedot';
import { $SignedBlock } from 'dedot/codecs';

// const api = await LegacyClient.new(new WsProvider('wss://archive.chain.opentensor.ai:443'));
const api = await LegacyClient.new(new WsProvider('wss://rpc.polkadot.io'));

// Block explorer link: https://taostats.io/block/6285312/extrinsics
const blockHash = await api.rpc.chain_getBlockHash(6285312);
if (!blockHash) {
  throw new Error('Block hash not found');
}

console.log('blockHash', blockHash);
const block = await api.rpc.chain_getBlock(blockHash);
if (!block) {
  throw new Error('Block not found');
}

console.log('block', block);

console.log(api.registry.hashAsHex($SignedBlock.tryEncode(block)));
