import { WsProvider } from '@polkadot/rpc-provider';
import { DelightfulApi } from 'delightfuldot';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { ConstsGen, TypesGen, QueryGen, RpcGen, IndexGen } from './generator';
import { RpcMethods } from '@delightfuldot/types';
import { $Metadata, MetadataLatest } from '@delightfuldot/codecs';
import staticSubstrate, { rpc } from '@polkadot/types-support/metadata/static-substrate';
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

async function run() {
  for (const network of NETWORKS.slice(1, 2)) {
    const { chain, endpoint, metadataHex, rpcMethods } = network;

    if (endpoint) {
      console.log(`Generate types for ${chain} via endpoint ${endpoint}`);
      await generateTypesFromChain(network, endpoint);
    } else if (metadataHex && rpcMethods) {
      console.log(`Generate types for ${chain} via raw data`);
      const metadata = $Metadata.tryDecode(metadataHex);
      await generateTypes(network, metadata.metadataVersioned.value, rpcMethods);
    }
  }

  console.log('DONE!');
}

async function generateTypesFromChain(network: NetworkInfo, endpoint: string) {
  const api = await DelightfulApi.create({ provider: new WsProvider(endpoint, 2500) });
  const { methods }: RpcMethods = await api.rpc.rpc.methods();

  await generateTypes(network, api.metadataLatest, methods);

  await api.disconnect();
}

async function generateTypes(network: NetworkInfo, metadata: MetadataLatest, rpcMethods: string[]) {
  const dirPath = path.resolve(process.cwd(), `packages/chaintypes/src/${network.chain}`);
  const defTypesFileName = path.join(dirPath, `types.ts`);
  const constsTypesFileName = path.join(dirPath, `consts.ts`);
  const queryTypesFileName = path.join(dirPath, `query.ts`);
  const rpcCallsFileName = path.join(dirPath, `rpc.ts`);
  const indexFileName = path.join(dirPath, `index.ts`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const rpcGen = new RpcGen(typesGen, rpcMethods);
  const indexGen = new IndexGen(network);

  fs.writeFileSync(defTypesFileName, await typesGen.generate());
  fs.writeFileSync(rpcCallsFileName, await rpcGen.generate());
  fs.writeFileSync(queryTypesFileName, await queryGen.generate());
  fs.writeFileSync(constsTypesFileName, await constsGen.generate());
  fs.writeFileSync(indexFileName, await indexGen.generate());
}

run().catch(console.log);
