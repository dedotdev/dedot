import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { afterAll, beforeAll } from 'vitest';
import { devPairs } from './utils';

const CONTRACTS_NODE_ENDPOINT = 'ws://127.0.0.1:9944';
const INK_NODE_ENDPOINT = 'ws://127.0.0.1:9955';

beforeAll(async () => {
  console.log(`Connect to ${CONTRACTS_NODE_ENDPOINT}`);
  global.contractsClient = await LegacyClient.new(new WsProvider(CONTRACTS_NODE_ENDPOINT));

  console.log(`Connect to ${INK_NODE_ENDPOINT}`);
  global.reviveClient = await DedotClient.new(new WsProvider(INK_NODE_ENDPOINT));

  const alice = devPairs().alice;

  await reviveClient.tx.revive
    .mapAccount() // --
    .signAndSend(alice)
    .untilFinalized();
}, 120_000);

afterAll(async () => {
  await global.contractsClient.disconnect();
  console.log(`Disconnected from ${CONTRACTS_NODE_ENDPOINT}`);

  await global.reviveClient.disconnect();
  console.log(`Disconnected from ${INK_NODE_ENDPOINT}`);
});
