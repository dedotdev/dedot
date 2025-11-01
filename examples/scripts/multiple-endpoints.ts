import { DedotClient, PinnedBlock, WsProvider } from 'dedot';

// Multiple endpoints for failover
const provider = new WsProvider([
  'wss://rpc.polkadot.io',
  'wss://polkadot-rpc.dwellir.com',
  'wss://polkadot.api.onfinality.io/public-ws',
]);

const client = await DedotClient.new(provider);

client.on('connected', (connectedUrl: any) => {
  console.log('Connected Endpoint:', connectedUrl);
});

client.on('ready', () => {
  console.log('Ready!');
});

client.on('finalizedBlock', (block: PinnedBlock) => {
  console.log('Finalized Block:', block.number);
});

console.log(await client.query.system.number());
console.log(await client.query.timestamp.now());

setTimeout(async () => {
  console.log('Switching endpoint');
  // @ts-ignore
  client.provider.__unsafeWs().close();
}, 10_000);
