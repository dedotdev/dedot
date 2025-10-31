import { DedotClient, WsProvider } from 'dedot';

console.log('Connecting');

const client = await DedotClient.new({
  provider: new WsProvider('wss://rpc.polkadot.io'),
  rpcVersion: 'legacy',
});

console.log('Connected');

console.log(await client.query.system.number());

await client.disconnect();

console.log('Disconnected');
