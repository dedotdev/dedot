import { DedotClient, WsProvider } from 'dedot';

// Multiple endpoints for failover
const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://rpc.ibp.network/polkadot',
  'wss://polkadot.api.onfinality.io/public-ws',
]);

console.log('Connecting...');
const client = new DedotClient(provider);

client.on('connected', (connectedUrl) => {
  console.log('Connected Endpoint:', connectedUrl);
});

await client.connect();

setTimeout(async () => {
  console.log('Switching endpoint 01');
  await provider.disconnect(true);
}, 200);

setTimeout(async () => {
  const events = await client.query.system.events();

  console.log(`Events: ${events.length}`);
}, 10);
