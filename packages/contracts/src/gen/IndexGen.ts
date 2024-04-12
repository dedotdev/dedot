import { beautifySourceCode, compileTemplate } from '@dedot/codegen';
import path from 'path';
import process from 'process';
import { stringPascalCase } from '@dedot/utils';
import { ContractMetadata } from '../types';

export class IndexGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
  }

  generate() {
    const contractName = stringPascalCase(this.contractMetadata.contract.name);

    const template = compileTemplate('index.hbs', path.resolve(process.cwd(), 'packages/contracts/src/gen'));

    return beautifySourceCode(template({ contractName }));
  }
}
