import { DedotClient, WsProvider } from 'dedot';

// Multiple endpoints for failover
const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://polkadot-rpc.dwellir.com',
  'wss://polkadot.api.onfinality.io/public-ws',
]);

console.log('Connecting...');
const client = await DedotClient.new(provider);

client.on('connected', (connectedUrl: any) => {
  console.log('Connected Endpoint:', connectedUrl);
});

client.block.finalized((block) => {
  console.log('Finalized Block:', block.number, block.hash);
});

client.block.best((block) => {
  console.log('Best Block:', block.number, block.hash);
});

setTimeout(async () => {
  console.log('Switching endpoint');
  // @ts-ignore
  client.provider.__unsafeWs().close();
}, 20_000);

setTimeout(async () => {
  console.log('Switching endpoint');
  // @ts-ignore
  client.provider.__unsafeWs().close();
}, 60_000);
