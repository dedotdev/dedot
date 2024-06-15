import { ContractMetadata, parseRawMetadata } from '@dedot/contracts';
import fs from 'fs';
import path from 'path';
import {
  IndexGen,
  QueryGen,
  EventsGen,
  TxGen,
  TypesGen,
  ConstructorTxGen,
  ConstructorQueryGen,
} from './generator/index.js';

export async function generateContractTypesFromMetadata(
  metadata: ContractMetadata | string,
  contract?: string,
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
) {
  let contractMetadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;

  contract = contract || contractMetadata.contract.name;

  const dirPath = path.resolve(outDir, contract);
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

  const typesGen = new TypesGen(contractMetadata);
  const queryGen = new QueryGen(contractMetadata, typesGen);
  const txGen = new TxGen(contractMetadata, typesGen);
  const constructorTxGen = new ConstructorTxGen(contractMetadata, typesGen);
  const constructorQueryGen = new ConstructorQueryGen(contractMetadata, typesGen);
  const eventsGen = new EventsGen(contractMetadata, typesGen);
  const indexGen = new IndexGen(contractMetadata);

  fs.writeFileSync(typesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(queryTypesFileName, await queryGen.generate(useSubPaths));
  fs.writeFileSync(txTypesFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(constructorQueryTypesFileName, await constructorQueryGen.generate(useSubPaths));
  fs.writeFileSync(constructorTxTypesFileName, await constructorTxGen.generate(useSubPaths));
  fs.writeFileSync(eventsTypesFile, await eventsGen.generate(useSubPaths));
  fs.writeFileSync(indexTypesFileName, await indexGen.generate(useSubPaths));
}
