import { ContractMetadata } from '@dedot/contracts';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class IndexGen {
  constructor(
    public interfaceName: string,
    public contractMetadata: ContractMetadata,
    public typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false) {
    const interfaceName = this.interfaceName;
    const langErrorId = this.contractMetadata.spec.lang_error.type;
    const langErrorName = this.typesGen.cleanPath(this.contractMetadata.types[langErrorId].type.path!);

    const typeImports = new TypeImports();
    typeImports.addKnownType('VersionedGenericSubstrateApi', 'RpcVersion', 'RpcV2');
    typeImports.addContractType('GenericContractApi');
    typeImports.addChainType('SubstrateApi');
    typeImports.addPortableType(langErrorName);

    const importTypes = typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ interfaceName, langErrorName, importTypes }));
  }
}
