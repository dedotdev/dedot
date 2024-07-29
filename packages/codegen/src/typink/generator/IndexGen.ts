import { ContractMetadata } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

const SUFFIX = 'contract_api' as const;

export class IndexGen {
  contractMetadata: ContractMetadata;
  typesGen: TypesGen;

  constructor(contractMetadata: ContractMetadata, typesGen: TypesGen) {
    this.contractMetadata = contractMetadata;
    this.typesGen = typesGen
  }

  generate(useSubPaths: boolean = false) {
    const contractName = stringPascalCase(`${this.contractMetadata.contract.name}_${SUFFIX}`);

    const langErrorId = this.contractMetadata.spec.lang_error.type
    const langErrorName = this.typesGen.cleanPath(this.contractMetadata.types[langErrorId].type.path!)

    const typeImports = new TypeImports();
    typeImports.addKnownType('VersionedGenericSubstrateApi', 'RpcVersion', 'RpcV2');
    typeImports.addContractType('GenericContractApi');
    typeImports.addChainType('SubstrateApi');
    typeImports.addPortableType(langErrorName)


    const importTypes = typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ contractName, langErrorName, importTypes }));
  }
}
