import { ContractMetadata } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

export class IndexGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
  }

  generate(useSubPaths: boolean = false) {
    const contractName = stringPascalCase(`${this.contractMetadata.contract.name}_contract_api`);

    const typeImports = new TypeImports();
    typeImports.addKnownType('GenericSubstrateApi', 'RpcLegacy', 'RpcV2', 'RpcVersion');
    typeImports.addContractType('GenericContractApi');

    const importTypes = typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ contractName, importTypes }));
  }
}
