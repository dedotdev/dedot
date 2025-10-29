import { Client, WsProvider } from 'dedot';

console.log('Connecting');

const client = await Client.new({
  provider: new WsProvider('wss://rpc.polkadot.io'),
  rpcVersion: 'legacy',
});

// const a: ISubstrateClient = client;
// a.query.system.number.

// client.query.system.account.pagedEntries(); // await client.connect();

console.log('Connected');

console.log(await client.query.system.number());

await client.query.nfts.account.entries();

await client.disconnect();

console.log('Disconnected');
