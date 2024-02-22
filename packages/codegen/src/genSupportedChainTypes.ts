import { generateTypes, generateTypesFromChain } from './index';
import staticSubstrate, { rpc } from '@polkadot/types-support/metadata/static-substrate';
import { $Metadata, CodecRegistry, Metadata, RuntimeVersion } from '@delightfuldot/codecs';
import { NetworkInfo } from './types';
import { DelightfulApi, ConstantExecutor } from 'delightfuldot';

const NETWORKS: NetworkInfo[] = [
  {
    chain: 'substrate',
    metadataHex: staticSubstrate,
    rpcMethods: rpc.methods,
  },
  {
    chain: 'polkadot',
    endpoint: 'wss://rpc.polkadot.io',
  },
  {
    chain: 'kusama',
    endpoint: 'wss://kusama-rpc.polkadot.io',
  },
  {
    chain: 'astar',
    endpoint: 'wss://rpc.astar.network',
  },
  {
    chain: 'moonbeam',
    endpoint: 'wss://moonbeam.api.onfinality.io/public-ws',
  },
  {
    chain: 'polkadotAssetHub',
    endpoint: 'wss://polkadot-asset-hub-rpc.polkadot.io/',
  },
  {
    chain: 'kusamaAssetHub',
    endpoint: 'wss://kusama-asset-hub-rpc.polkadot.io/',
  },
  {
    chain: 'rococoAssetHub',
    endpoint: 'wss://rococo-asset-hub-rpc.polkadot.io/',
  },
];

const OUT_DIR = 'packages/chaintypes/src';

async function run() {
  for (const network of NETWORKS) {
    const { chain, endpoint, metadataHex, rpcMethods } = network;

    if (endpoint) {
      console.log(`Generate types for ${chain} via endpoint ${endpoint}`);
      await generateTypesFromChain(network, endpoint, OUT_DIR);
    } else if (metadataHex && rpcMethods) {
      console.log(`Generate types for ${chain} via raw data`);
      const metadata = $Metadata.tryDecode(metadataHex);
      const runtimeVersion = getRuntimeVersion(metadata);

      await generateTypes(network, metadata.latest, rpcMethods, runtimeVersion.apis, OUT_DIR);
    }
  }

  console.log('DONE!');
}

const getRuntimeVersion = (metadata: Metadata): RuntimeVersion => {
  const registry = new CodecRegistry(metadata.latest);
  const executor = new ConstantExecutor({
    registry,
    metadataLatest: metadata.latest,
  } as unknown as DelightfulApi);

  return executor.execute('system', 'version') as RuntimeVersion;
};

run().catch(console.log);
