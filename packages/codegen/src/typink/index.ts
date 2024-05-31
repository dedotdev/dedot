import { ContractMetadata, parseRawMetadata } from '@dedot/contracts';
import fs from 'fs';
import path from 'path';
import { IndexGen, QueryGen, TxGen, TypesGen, ConstructorGen } from './generator/index.js';

export async function generateContractTypesFromMetadata(
  metadata: ContractMetadata | string,
  contract?: string,
  outDir: string = '.',
  extension: string = 'd.ts',
  useSubPaths: boolean = false,
) {
  let contractMetadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;

  if (!contract) {
    contract = contractMetadata.contract.name;
  }

  const dirPath = path.resolve(outDir, contract);
  const typesFileName = path.join(dirPath, `types.${extension}`);
  const queryTypesFileName = path.join(dirPath, `query.${extension}`);
  const txTypesFileName = path.join(dirPath, `tx.${extension}`);
  const constructorTypesFileName = path.join(dirPath, `constructor.${extension}`);
  const indexTypesFileName = path.join(dirPath, `index.${extension}`);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const typesGen = new TypesGen(contractMetadata);
  const querysGen = new QueryGen(contractMetadata, typesGen);
  const txGen = new TxGen(contractMetadata, typesGen);
  const constructorGen = new ConstructorGen(contractMetadata, typesGen);
  const indexGen = new IndexGen(contractMetadata);

  fs.writeFileSync(typesFileName, await typesGen.generate(useSubPaths));
  fs.writeFileSync(queryTypesFileName, await querysGen.generate(useSubPaths));
  fs.writeFileSync(txTypesFileName, await txGen.generate(useSubPaths));
  fs.writeFileSync(constructorTypesFileName, await constructorGen.generate(useSubPaths));
  fs.writeFileSync(indexTypesFileName, await indexGen.generate(useSubPaths));
}
