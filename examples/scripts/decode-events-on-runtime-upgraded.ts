import { RpcVersion } from '@dedot/codecs/types';
import { DedotClient, WsProvider } from 'dedot';

const decodeEvents = async (rpcVersion: RpcVersion, blockNumber: number) => {
  const client = await DedotClient.new({
    provider: new WsProvider('wss://archive.chain.opentensor.ai:443'),
    rpcVersion,
  });
  const blockHash = await client.rpc.chain_getBlockHash(blockNumber);
  if (!blockHash) {
    throw new Error('Block hash not found');
  }

  const clientAt = await client.at(blockHash);

  const events = await clientAt.query.system.events();
  console.log(`Received ${events.length} events via ${client.rpcVersion} at block ${blockNumber}`);

  await client.disconnect();
};

await decodeEvents('legacy', 6523565);
await decodeEvents('v2', 6523565);

// runtime upgraded happened
await decodeEvents('legacy', 6523566);
await decodeEvents('v2', 6523566);

await decodeEvents('legacy', 6523567);
await decodeEvents('v2', 6523567);
