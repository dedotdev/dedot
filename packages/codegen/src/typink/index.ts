import { ContractMetadata } from '@dedot/types';
import fs from 'fs';
import path from 'path';
import { IndexGen, QueryGen, TxGen, TypeGen, ConstructorGen } from './generator/index.js';

export async function generateContractTypesFromMetadata(metadata: ContractMetadata | string, outDir: string = '.') {
  let contractMetadata = typeof metadata === 'string' ? (JSON.parse(metadata) as ContractMetadata) : metadata;

  const dirPath = path.resolve(outDir, contractMetadata.contract.name);
  const typesFileName = path.join(path.resolve(dirPath), `types.ts`);
  const queryTypesFileName = path.join(path.resolve(dirPath), `query.ts`);
  const txTypesFileName = path.join(path.resolve(dirPath), `tx.ts`);
  const constructorTypesFileName = path.join(path.resolve(dirPath), `constructor.ts`);
  const indexTypesFileName = path.join(path.resolve(dirPath), `index.ts`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const typesGen = new TypeGen(contractMetadata);
  const querysGen = new QueryGen(contractMetadata, typesGen);
  const txGen = new TxGen(contractMetadata, typesGen);
  const constructorGen = new ConstructorGen(contractMetadata, typesGen);
  const indexGen = new IndexGen(contractMetadata);

  fs.writeFileSync(typesFileName, await typesGen.generate());
  fs.writeFileSync(queryTypesFileName, await querysGen.generate());
  fs.writeFileSync(txTypesFileName, await txGen.generate());
  fs.writeFileSync(constructorTypesFileName, await constructorGen.generate());
  fs.writeFileSync(indexTypesFileName, await indexGen.generate());
}
