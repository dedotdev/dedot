import { LegacyClient } from '@dedot/api';
import { MetadataLatest } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import { RpcMethods } from '@dedot/types/json-rpc';
import { stringCamelCase } from '@dedot/utils';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConstsGen,
  ErrorsGen,
  EventsGen,
  IndexGen,
  JsonRpcGen,
  QueryGen,
  RuntimeApisGen,
  TxGen,
  TypesGen,
} from './generator/index.js';

export async function generateTypesFromEndpoint(
  chain: string,
  endpoint: string,
  outDir?: string,
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
) {
  // Immediately throw error if cannot connect to provider for the first time.
  const api = await LegacyClient.new(new WsProvider({ endpoint, retryDelayMs: 0, timeout: 0 }));
  const { methods }: RpcMethods = await api.rpc.rpc_methods();
  const apis = api.runtimeVersion.apis || {};
  if (!chain) {
    chain = stringCamelCase(api.runtimeVersion.specName || 'local');
  }

  await generateTypes(chain, api.metadata.latest, methods, apis, outDir, extension, useSubPaths);

  await api.disconnect();
}

export async function generateTypes(
  chain: string,
  metadata: MetadataLatest,
  rpcMethods: string[],
  runtimeApis: Record<string, number>,
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
  exposeRpc: boolean = false
) {
  const dirPath = path.resolve(outDir, chain);
  const defTypesFileName = path.join(dirPath, `types.${extension}`);
  const constsTypesFileName = path.join(dirPath, `consts.${extension}`);
  const queryTypesFileName = path.join(dirPath, `query.${extension}`);
  const jsonRpcFileName = path.join(dirPath, `json-rpc.${extension}`);
  const indexFileName = path.join(dirPath, `index.${extension}`);
  const errorsFileName = path.join(dirPath, `errors.${extension}`);
  const eventsFileName = path.join(dirPath, `events.${extension}`);
  const runtimeApisFileName = path.join(dirPath, `runtime.${extension}`);
  const txFileName = path.join(dirPath, `tx.${extension}`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const jsonRpcGen = new JsonRpcGen(typesGen, rpcMethods);
  const indexGen = new IndexGen(chain);
  const errorsGen = new ErrorsGen(typesGen);
  const eventsGen = new EventsGen(typesGen);
  const runtimeApisGen = new RuntimeApisGen(typesGen, runtimeApis);
  const txGen = new TxGen(typesGen);

  fs.writeFileSync(defTypesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(errorsFileName, await errorsGen.generate(useSubPaths));
  fs.writeFileSync(eventsFileName, await eventsGen.generate(useSubPaths));
  fs.writeFileSync(jsonRpcFileName, await jsonRpcGen.generate(useSubPaths, exposeRpc));
  fs.writeFileSync(queryTypesFileName, await queryGen.generate(useSubPaths));
  fs.writeFileSync(constsTypesFileName, await constsGen.generate(useSubPaths));
  fs.writeFileSync(txFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(indexFileName, await indexGen.generate(useSubPaths));
  fs.writeFileSync(runtimeApisFileName, await runtimeApisGen.generate(useSubPaths));
}
