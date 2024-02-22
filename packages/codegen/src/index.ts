import { DelightfulApi } from 'delightfuldot';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { ConstsGen, ErrorsGen, EventsGen, IndexGen, QueryGen, RpcGen, TypesGen, RuntimeCallsGen, TxGen } from './generator';
import { RpcMethods } from '@delightfuldot/types';
import { MetadataLatest } from '@delightfuldot/codecs';
import { NetworkInfo } from './types';

export async function generateTypesFromChain(network: NetworkInfo, endpoint: string, outDir: string) {
  const api = await DelightfulApi.create(endpoint);
  const { methods }: RpcMethods = await api.rpc.rpc.methods();
  const { apis } = api.runtimeVersion;

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
  const dirPath = path.resolve(process.cwd(), outDir, network.chain);
  const defTypesFileName = path.join(dirPath, `types.ts`);
  const constsTypesFileName = path.join(dirPath, `consts.ts`);
  const queryTypesFileName = path.join(dirPath, `query.ts`);
  const rpcCallsFileName = path.join(dirPath, `rpc.ts`);
  const indexFileName = path.join(dirPath, `index.ts`);
  const errorsFileName = path.join(dirPath, `errors.ts`);
  const eventsFileName = path.join(dirPath, `events.ts`);
  const runtimeCallsFileName = path.join(dirPath, `runtime.ts`);
  const txFileName = path.join(dirPath, `tx.ts`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const rpcGen = new RpcGen(typesGen, rpcMethods);
  const indexGen = new IndexGen(network);
  const errorsGen = new ErrorsGen(typesGen);
  const eventsGen = new EventsGen(typesGen);
  const runtimeCallsGen = new RuntimeCallsGen(typesGen, runtimeApis);
  const txGen = new TxGen(typesGen);

  fs.writeFileSync(defTypesFileName, await typesGen.generate());
  fs.writeFileSync(errorsFileName, await errorsGen.generate());
  fs.writeFileSync(eventsFileName, await eventsGen.generate());
  fs.writeFileSync(rpcCallsFileName, await rpcGen.generate());
  fs.writeFileSync(queryTypesFileName, await queryGen.generate());
  fs.writeFileSync(constsTypesFileName, await constsGen.generate());
  fs.writeFileSync(txFileName, await txGen.generate());
  fs.writeFileSync(indexFileName, await indexGen.generate());
  fs.writeFileSync(runtimeCallsFileName, await runtimeCallsGen.generate());
}
