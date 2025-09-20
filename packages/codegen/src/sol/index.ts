import { SolABIItem } from '@dedot/contracts';
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

export async function generateSolContractTypes(
  abi: SolABIItem[] | string,
  contract: string | undefined = 'contract',
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
): Promise<GeneratedResult> {
  let abiItems = typeof abi === 'string' ? JSON.parse(abi) : abi;

  const contractName = contract;

  const dirPath = path.resolve(outDir, stringDashCase(contractName));
  const typesFileName = path.join(dirPath, `types.${extension}`);
  const queryTypesFileName = path.join(dirPath, `query.${extension}`);
  const eventsTypesFileName = path.join(dirPath, `events.${extension}`);
  const txTypesFileName = path.join(dirPath, `tx.${extension}`);
  const constructorTxTypesFileName = path.join(dirPath, `constructor-tx.${extension}`);
  const constructorQueryTypesFileName = path.join(dirPath, `constructor-query.${extension}`);
  const indexTypesFileName = path.join(dirPath, `index.${extension}`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const interfaceName = `${stringPascalCase(`${contractName}`)}ContractApi`;

  const typesGen = new TypesGen(abiItems);
  const queryGen = new QueryGen(abiItems, typesGen);
  const eventsGen = new EventsGen(abiItems, typesGen);
  const txGen = new TxGen(abiItems, typesGen);
  const constructorTxGen = new ConstructorTxGen(abiItems, typesGen);
  const constructorQueryGen = new ConstructorQueryGen(abiItems, typesGen);
  const indexGen = new IndexGen(interfaceName, typesGen);

  fs.writeFileSync(typesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(queryTypesFileName, await queryGen.generate(useSubPaths));
  fs.writeFileSync(eventsTypesFileName, await eventsGen.generate(useSubPaths));
  fs.writeFileSync(txTypesFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(constructorQueryTypesFileName, await constructorQueryGen.generate(useSubPaths));
  fs.writeFileSync(constructorTxTypesFileName, await constructorTxGen.generate(useSubPaths));
  fs.writeFileSync(indexTypesFileName, await indexGen.generate(useSubPaths));

  return { interfaceName, outputFolder: dirPath };
}
