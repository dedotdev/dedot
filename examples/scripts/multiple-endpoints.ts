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

client.block.finalized((block) => {
  console.log('Finalized Block:', block.number, block.hash);
});

client.block.best((block) => {
  console.log('Best Block:', block.number, block.hash);
});

setTimeout(async () => {
  console.log('Switching endpoint 01');
  await provider.disconnect(true);
}, 20_000);

setTimeout(async () => {
  console.log('Switching endpoint 02');
  await provider.disconnect(true);
}, 60_000);
