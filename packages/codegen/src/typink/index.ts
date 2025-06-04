import { ContractMetadata, ensureSupportedContractMetadataVersion } from '@dedot/contracts';
import { stringDashCase, stringPascalCase } from '@dedot/utils';
import fs from 'fs';
import path from 'path';
import { GeneratedResult } from '../types.js';
import {
  ConstructorQueryGen,
  ConstructorTxGen,
  EventsGen,
  IndexGen,
  QueryGen,
  TxGen,
  TypesGen,
} from './generator/index.js';

export async function generateContractTypes(
  metadata: ContractMetadata | string,
  contract?: string,
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
): Promise<GeneratedResult> {
  let contractMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

  ensureSupportedContractMetadataVersion(contractMetadata);

  const contractName = contract || contractMetadata.contract.name;

  const dirPath = path.resolve(outDir, stringDashCase(contractName));
  const typesFileName = path.join(dirPath, `types.${extension}`);
  const queryTypesFileName = path.join(dirPath, `query.${extension}`);
  const txTypesFileName = path.join(dirPath, `tx.${extension}`);
  const constructorTxTypesFileName = path.join(dirPath, `constructor-tx.${extension}`);
  const constructorQueryTypesFileName = path.join(dirPath, `constructor-query.${extension}`);
  const eventsTypesFile = path.join(dirPath, `events.${extension}`);
  const indexTypesFileName = path.join(dirPath, `index.${extension}`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const interfaceName = `${stringPascalCase(`${contractName}`)}ContractApi`;

  const typesGen = new TypesGen(contractMetadata);
  const queryGen = new QueryGen(contractMetadata, typesGen);
  const txGen = new TxGen(contractMetadata, typesGen);
  const constructorTxGen = new ConstructorTxGen(contractMetadata, typesGen);
  const constructorQueryGen = new ConstructorQueryGen(contractMetadata, typesGen);
  const eventsGen = new EventsGen(contractMetadata, typesGen);
  const indexGen = new IndexGen(interfaceName, contractMetadata, typesGen);

  fs.writeFileSync(typesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(queryTypesFileName, await queryGen.generate(useSubPaths));
  fs.writeFileSync(txTypesFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(constructorQueryTypesFileName, await constructorQueryGen.generate(useSubPaths));
  fs.writeFileSync(constructorTxTypesFileName, await constructorTxGen.generate(useSubPaths));
  fs.writeFileSync(eventsTypesFile, await eventsGen.generate(useSubPaths));
  fs.writeFileSync(indexTypesFileName, await indexGen.generate(useSubPaths));

  return { interfaceName, outputFolder: dirPath };
}
