import { DedotClient, WsProvider } from 'dedot';
import { waitFor } from 'dedot/utils';
import * as fs from 'node:fs';

// Multiple endpoints for failover
const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://polkadot-rpc.dwellir.com',
  'wss://polkadot.api.onfinality.io/public-ws',
]);

const client = new DedotClient(provider);

client.on('connected', (connectedUrl) => {
  console.log('Connected Endpoint:', connectedUrl);
});

await client.connect();

fs.writeFileSync('./metadata.json', JSON.stringify(client.metadata.latest, null, 2));

// await waitFor(1000);
//
// await client.disconnect();
