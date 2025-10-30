import { DedotClient, WsProvider } from 'dedot';
import { waitFor } from 'dedot/utils';

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

await waitFor(1000);

await client.disconnect();
