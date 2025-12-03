import { waitFor } from '@dedot/utils';
import { DedotClient, WsProvider } from 'dedot';

const provider = new WsProvider({
  endpoint: [
    'wss://rpc.polkadot.io', // --
    'wss://rpc.ibp.network/polkadot',
    'wss://polkadot.api.onfinality.io/public-ws',
  ],
  retryDelayMs: 5_000,
});

console.log('Connecting...');
const client = new DedotClient({ provider, rpcVersion: 'v2' });

client.on('connected', (connectedUrl) => {
  console.log('Connected Endpoint:', connectedUrl);
});

await client.connect();

for (let i = 0; i < 50; i++) {
  console.log(`Making query ${i + 1}`);
  client.call.metadata.metadataAtVersion(15).then((metadata) => {
    console.log(`Received metadata ${i + 1}: ${metadata?.slice(0, 100)}`);
  });

  if (i === 20) {
    // await waitFor(500);
    await provider.disconnect(true);
    await waitFor(500);
  }
}

// await client.disconnect();
