import { WsProvider } from '@polkadot/rpc-provider';
import { DelightfulApi } from 'delightfuldot';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { ConstsGen, TypesGen, QueryGen, RpcGen } from './generator';
import { RpcMethods } from '@delightfuldot/types';
import { $Metadata, MetadataLatest } from '@delightfuldot/codecs';
import staticSubstrate, { rpc } from '@polkadot/types-support/metadata/static-substrate';

type NetworkInfo = {
  chain: string;
  endpoint?: string;
  metadataHex?: string;
  rpcMethods?: string[];
};

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
  for (const network of NETWORKS) {
    const { chain, endpoint, metadataHex, rpcMethods } = network;

    if (endpoint) {
      console.log(`Generate types for ${chain} via endpoint ${endpoint}`);
      await generateTypesFromChain(chain, endpoint);
    } else if (metadataHex && rpcMethods) {
      console.log(`Generate types for ${chain} via raw data`);
      const metadata = $Metadata.tryDecode(metadataHex);
      await generateTypes(chain, metadata.metadataVersioned.value, rpcMethods);
    }
  }

  console.log('DONE!');
}

async function generateTypesFromChain(chain: string, endpoint: string) {
  const api = await DelightfulApi.create({ provider: new WsProvider(endpoint, 2500) });
  const { methods }: RpcMethods = await api.rpc.rpc.methods();

  await generateTypes(chain, api.metadataLatest, methods);

  await api.disconnect();
}

async function generateTypes(chain: string, metadata: MetadataLatest, rpcMethods: string[]) {
  const defTypesFileName = path.resolve(process.cwd(), `packages/chaintypes/src/${chain}/types.ts`);
  const constsTypesFileName = path.resolve(process.cwd(), `packages/chaintypes/src/${chain}/consts.ts`);
  const queryTypesFileName = path.resolve(process.cwd(), `packages/chaintypes/src/${chain}/query.ts`);
  const rpcCallsFileName = path.resolve(process.cwd(), `packages/chaintypes/src/${chain}/rpc.ts`);
  // TODO generate `packages/chaintypes/src/${chain}/index.ts` file

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const rpcGen = new RpcGen(typesGen, rpcMethods);

  fs.writeFileSync(defTypesFileName, await typesGen.generate());
  fs.writeFileSync(rpcCallsFileName, await rpcGen.generate());
  fs.writeFileSync(queryTypesFileName, await queryGen.generate());
  fs.writeFileSync(constsTypesFileName, await constsGen.generate());
}

run().catch(console.log);
