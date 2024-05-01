import { ContractMetadataSupported } from '@dedot/types';
import { stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, compileTemplate } from '../../utils';

export class IndexGen {
  contractMetadata: ContractMetadataSupported;

  constructor(contractMetadata: ContractMetadataSupported) {
    this.contractMetadata = contractMetadata;
  }

  generate() {
    const contractName = stringPascalCase(this.contractMetadata.contract.name);

    const template = compileTemplate('typink', 'contracts-index.hbs');

    return beautifySourceCode(template({ contractName }));
  }
}
