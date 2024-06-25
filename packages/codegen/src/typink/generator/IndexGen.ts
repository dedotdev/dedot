import { ContractMetadata } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const SUFFIX = 'contract_api' as const;

export class IndexGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
  }

  generate(useSubPaths: boolean = false) {
    const contractName = stringPascalCase(`${this.contractMetadata.contract.name}_${SUFFIX}`);

    const typeImports = new TypeImports();
    typeImports.addKnownType('VersionedGenericSubstrateApi', 'RpcVersion');
    typeImports.addContractType('GenericContractApi');
    typeImports.addChainType('SubstrateApi');

    const importTypes = typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ contractName, importTypes }));
  }
}
