import { DedotClient, WsProvider } from 'dedot';
import { RpcVersion } from 'dedot/types';

const fetchChainSpec = async (rpcVersion: RpcVersion) => {
  console.log(`Fetching chain spec via ${rpcVersion} client`);
  const client = await DedotClient.new({
    provider: new WsProvider('wss://westend-rpc.polkadot.io'),
    rpcVersion,
  });

  console.log('chain name', await client.chainSpec.chainName());
  console.log('chain props', await client.chainSpec.properties());
  console.log('chain genesisHash', await client.chainSpec.genesisHash());

  await client.disconnect();
};

await fetchChainSpec('v2');
await fetchChainSpec('legacy');
