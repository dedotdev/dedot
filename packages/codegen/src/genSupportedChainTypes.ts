import { generateTypes, generateTypesFromChain } from './index';
import staticSubstrate, { rpc } from '@polkadot/types-support/metadata/static-substrate';
import { $Metadata } from '@delightfuldot/codecs';
import { NetworkInfo } from './types';

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
    endpoint: 'wss://1rpc.io/glmr',
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
      await generateTypes(network, metadata.metadataVersioned.value, rpcMethods, OUT_DIR);
    }
  }

  console.log('DONE!');
}

run().catch(console.log);
