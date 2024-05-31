import { TypeImports } from '@dedot/codegen/shared';
import { ContractMetadata } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

export class IndexGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
  }

  generate(useSubPaths: boolean = false) {
    const contractName = stringPascalCase(`${this.contractMetadata.contract.name}_contract_api`);

    const typeImports = new TypeImports();
    typeImports.addKnownType('GenericSubstrateApi', 'SubstrateApi');
    typeImports.addContractType('GenericContractApi');

    const importTypes = typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ contractName, importTypes }));
  }
}
