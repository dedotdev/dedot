import { Dedot } from 'dedot';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConstsGen,
  ErrorsGen,
  EventsGen,
  IndexGen,
  QueryGen,
  RpcGen,
  RuntimeApisGen,
  TxGen,
  TypesGen,
} from './generator';
import { RpcMethods } from '@dedot/types';
import { MetadataLatest } from '@dedot/codecs';
import { NetworkInfo } from './types';
import { stringCamelCase } from '@polkadot/util';

export async function generateTypesFromChain(network: NetworkInfo, endpoint: string, outDir: string) {
  const api = await Dedot.create(endpoint);
  const { methods }: RpcMethods = await api.rpc.rpc.methods();
  const apis = api.runtimeVersion?.apis || [];
  if (!network.chain) {
    network.chain = stringCamelCase(api.runtimeVersion?.specName || api.runtimeChain || 'local');
  }

  await generateTypes(network, api.metadataLatest, methods, apis, outDir);

  await api.disconnect();
}

export async function generateTypes(
  network: NetworkInfo,
  metadata: MetadataLatest,
  rpcMethods: string[],
  runtimeApis: any[],
  outDir: string = '.',
) {
  const dirPath = path.resolve(outDir, network.chain);
  const defTypesFileName = path.join(dirPath, `types.d.ts`);
  const constsTypesFileName = path.join(dirPath, `consts.d.ts`);
  const queryTypesFileName = path.join(dirPath, `query.d.ts`);
  const rpcCallsFileName = path.join(dirPath, `rpc.d.ts`);
  const indexFileName = path.join(dirPath, `index.d.ts`);
  const errorsFileName = path.join(dirPath, `errors.d.ts`);
  const eventsFileName = path.join(dirPath, `events.d.ts`);
  const runtimeApisFileName = path.join(dirPath, `runtime.d.ts`);
  const txFileName = path.join(dirPath, `tx.d.ts`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const rpcGen = new RpcGen(typesGen, rpcMethods);
  const indexGen = new IndexGen(network);
  const errorsGen = new ErrorsGen(typesGen);
  const eventsGen = new EventsGen(typesGen);
  const runtimeApisGen = new RuntimeApisGen(typesGen, runtimeApis);
  const txGen = new TxGen(typesGen);

  fs.writeFileSync(defTypesFileName, await typesGen.generate());
  fs.writeFileSync(errorsFileName, await errorsGen.generate());
  fs.writeFileSync(eventsFileName, await eventsGen.generate());
  fs.writeFileSync(rpcCallsFileName, await rpcGen.generate());
  fs.writeFileSync(queryTypesFileName, await queryGen.generate());
  fs.writeFileSync(constsTypesFileName, await constsGen.generate());
  fs.writeFileSync(txFileName, await txGen.generate());
  fs.writeFileSync(indexFileName, await indexGen.generate());
  fs.writeFileSync(runtimeApisFileName, await runtimeApisGen.generate());
}
