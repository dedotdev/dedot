import { ContractMetadata } from '@dedot/types';
import fs from 'fs';
import path from 'path';
import { IndexGen, QueryGen, TxGen, TypeGen } from './generator/index.js';

export async function generateContractTypesFromMetadata(metadata: ContractMetadata | string, outDir: string = '.') {
  let contractMetadata;
  if (typeof metadata === 'string') {
    contractMetadata = JSON.parse(metadata) as ContractMetadata;
  } else {
    contractMetadata = metadata;
  }

  const dirPath = path.resolve(outDir, contractMetadata.contract.name);
  const typesFileName = path.join(path.resolve(dirPath), `types.ts`);
  const queryTypesFileName = path.join(path.resolve(dirPath), `query.ts`);
  const txTypesFileName = path.join(path.resolve(dirPath), `tx.ts`);
  const indexTypesFileName = path.join(path.resolve(dirPath), `index.ts`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const typesGen = new TypeGen(contractMetadata);
  const querysGen = new QueryGen(contractMetadata, typesGen);
  const txGen = new TxGen(contractMetadata, typesGen);
  const indexGen = new IndexGen(contractMetadata);

  fs.writeFileSync(typesFileName, await typesGen.generate());
  fs.writeFileSync(queryTypesFileName, await querysGen.generate());
  fs.writeFileSync(txTypesFileName, await txGen.generate());
  fs.writeFileSync(indexTypesFileName, await indexGen.generate());
}
