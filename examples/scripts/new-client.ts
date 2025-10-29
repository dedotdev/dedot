import { createClient, WsProvider } from 'dedot';

console.log('Connecting');

const client = await createClient({
  provider: new WsProvider('wss://rpc.polkadot.io'),
  rpcVersion: 'legacy',
  // autoConnect: false,
});

// await client.connect();

console.log('Connected');

console.log(await client.query.system.number());

await client.disconnect();

console.log('Disconnected');
