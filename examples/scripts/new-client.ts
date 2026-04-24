import { DedotClient, WsProvider } from 'dedot';

console.log('Connecting');

const WS_URL = 'wss://acala-rpc-0.aca-api.network';
// const WS_URL = 'wss://rpc.polkadot.io';

const client = await DedotClient.new({
  provider: new WsProvider(WS_URL),
});

console.log('Connected', client.rpcVersion);

console.log(await client.query.system.number());

await client.disconnect();

console.log('Disconnected');
