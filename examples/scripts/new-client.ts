import { Client, WsProvider } from 'dedot';

console.log('Connecting');

const client = await Client.new({
  provider: new WsProvider('wss://rpc.polkadot.io'),
  rpcVersion: 'legacy',
});

// await client.connect();

console.log('Connected');

console.log(await client.query.system.number());

await client.disconnect();

console.log('Disconnected');
