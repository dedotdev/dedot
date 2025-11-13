import { DedotClient, WsProvider } from 'dedot';

// Multiple endpoints for failover
const provider = new WsProvider([
  // 'wss://rpc.polkadot.io',
  'wss://rpc.ibp.network/polkadot',
  'wss://polkadot.api.onfinality.io/public-ws',
]);

console.log('Connecting...');
const client = new DedotClient({ provider, rpcVersion: 'legacy' });

client.on('connected', (connectedUrl) => {
  console.log('Connected Endpoint:', connectedUrl);
});

await client.connect();

setTimeout(async () => {
  console.log('Switching endpoint 01');
  await provider.disconnect(true);
}, 100);

const metadata = await client.call.metadata.metadataAtVersion(16);

console.log(`Metadata ${metadata?.slice(0, 100)}...`);
