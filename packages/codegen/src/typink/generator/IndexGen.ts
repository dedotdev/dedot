import { ContractMetadata } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, compileTemplate } from '../../utils';

export class IndexGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
  }

  generate() {
    const contractName = stringPascalCase(this.contractMetadata.contract.name);

    const template = compileTemplate('typink', 'index.hbs');

    return beautifySourceCode(template({ contractName }));
  }
}
