import { DedotClient, SubstrateRuntimeVersion } from '@dedot/api';
import { Metadata, MetadataLatest } from '@dedot/codecs';
import { WsProvider } from '@dedot/providers';
import { RpcMethods } from '@dedot/types/json-rpc';
import { HexString, stringDashCase, stringPascalCase } from '@dedot/utils';
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedResult } from '../types.js';
import { resolveBlockHash } from '../utils.js';
import {
  ConstsGen,
  ErrorsGen,
  EventsGen,
  IndexGen,
  JsonRpcGen,
  QueryGen,
  RuntimeApisGen,
  TxGen,
  ViewFunctionsGen,
  TypesGen,
} from './generator/index.js';

export interface GenerateTypesFromEndpointOptions {
  chain: string;
  endpoint?: string;
  client?: DedotClient;
  outDir?: string;
  extension?: string;
  useSubPaths?: boolean;
  at?: string;
}

export async function generateTypesFromEndpoint(
  options: GenerateTypesFromEndpointOptions,
): Promise<GeneratedResult> {
  const { chain, endpoint, client: providedClient, outDir, extension = 'd.ts', useSubPaths = false, at } = options;

  // Validate that either endpoint or client is provided
  if (!endpoint && !providedClient) {
    throw new Error('Either "endpoint" or "client" must be provided');
  }

  if (endpoint && providedClient) {
    throw new Error('Cannot provide both "endpoint" and "client"');
  }

  // Create client if not provided
  const client = providedClient || (await DedotClient.legacy(new WsProvider({ endpoint: endpoint!, retryDelayMs: 0, timeout: 0 })));
  const shouldDisconnect = !providedClient;

  try {
    const { methods }: RpcMethods = await client.rpc.rpc_methods();

    // Resolve block hash if `at` is provided
    let blockHash: HexString | undefined;

    if (at) {
      blockHash = await resolveBlockHash(client, at);
    }

    // Get runtime version and metadata at the specified block
    let runtimeVersion: SubstrateRuntimeVersion;
    let metadata: Metadata;

    if (blockHash) {
      const clientAt = await client.at(blockHash);

      runtimeVersion = clientAt.runtimeVersion;
      metadata = clientAt.metadata;
    } else {
      runtimeVersion = client.runtimeVersion;
      metadata = client.metadata;
    }

    const resolvedChain = chain || runtimeVersion.specName || 'local';

    const result = await generateTypes(
      resolvedChain,
      metadata.latest,
      methods,
      runtimeVersion,
      outDir,
      extension,
      useSubPaths,
    );

    return result;
  } finally {
    if (shouldDisconnect) {
      await client.disconnect();
    }
  }
}

export async function generateTypes(
  chain: string,
  metadata: MetadataLatest,
  rpcMethods: string[],
  runtimeVersion: SubstrateRuntimeVersion,
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
): Promise<GeneratedResult> {
  const dirPath = path.resolve(outDir, stringDashCase(chain));
  const defTypesFileName = path.join(dirPath, `types.${extension}`);
  const constsTypesFileName = path.join(dirPath, `consts.${extension}`);
  const queryTypesFileName = path.join(dirPath, `query.${extension}`);
  const jsonRpcFileName = path.join(dirPath, `json-rpc.${extension}`);
  const indexFileName = path.join(dirPath, `index.${extension}`);
  const errorsFileName = path.join(dirPath, `errors.${extension}`);
  const eventsFileName = path.join(dirPath, `events.${extension}`);
  const runtimeApisFileName = path.join(dirPath, `runtime.${extension}`);
  const txFileName = path.join(dirPath, `tx.${extension}`);
  const viewFunctionsFileName = path.join(dirPath, `view-functions.${extension}`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const interfaceName = `${stringPascalCase(chain)}Api`;

  const typesGen = new TypesGen(metadata);
  const constsGen = new ConstsGen(typesGen);
  const queryGen = new QueryGen(typesGen);
  const jsonRpcGen = new JsonRpcGen(typesGen, rpcMethods);
  const errorsGen = new ErrorsGen(typesGen);
  const eventsGen = new EventsGen(typesGen);
  const runtimeApisGen = new RuntimeApisGen(typesGen, runtimeVersion.apis);
  const txGen = new TxGen(typesGen);
  const viewFunctionGen = new ViewFunctionsGen(typesGen);
  const indexGen = new IndexGen(interfaceName, runtimeVersion, typesGen);

  fs.writeFileSync(defTypesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(errorsFileName, await errorsGen.generate(useSubPaths));
  fs.writeFileSync(eventsFileName, await eventsGen.generate(useSubPaths));
  fs.writeFileSync(jsonRpcFileName, await jsonRpcGen.generate(useSubPaths));
  fs.writeFileSync(queryTypesFileName, await queryGen.generate(useSubPaths));
  fs.writeFileSync(constsTypesFileName, await constsGen.generate(useSubPaths));
  fs.writeFileSync(txFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(runtimeApisFileName, await runtimeApisGen.generate(useSubPaths));
  fs.writeFileSync(viewFunctionsFileName, await viewFunctionGen.generate(useSubPaths));
  fs.writeFileSync(indexFileName, await indexGen.generate(useSubPaths));

  return { interfaceName, outputFolder: dirPath };
}
