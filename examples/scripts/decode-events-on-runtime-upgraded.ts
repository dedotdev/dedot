import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { $SignedBlock } from 'dedot/codecs';
import { u8aToHex } from 'dedot/utils';
import * as fs from 'node:fs';

const decodeEvents = async (Client: typeof LegacyClient | typeof DedotClient, blockNumber: number) => {
  const client = await LegacyClient.new(new WsProvider('wss://archive.chain.opentensor.ai:443'));
  const blockHash = await client.rpc.chain_getBlockHash(blockNumber);
  if (!blockHash) {
    throw new Error('Block hash not found');
  }

  const clientAt = await client.at(blockHash);

  const events = await clientAt.query.system.events();
  console.log(`Received ${events.length} events via ${Client.name} at block ${blockNumber}`);

  await client.disconnect();
};

await decodeEvents(LegacyClient, 6523565);
await decodeEvents(DedotClient, 6523565);

await decodeEvents(LegacyClient, 6523566);
await decodeEvents(DedotClient, 6523566);

await decodeEvents(LegacyClient, 6523567);
await decodeEvents(DedotClient, 6523567);
