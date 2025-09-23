import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class IndexGen {
  constructor(
    public interfaceName: string,
    public typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false) {
    const interfaceName = this.interfaceName;

    const typeImports = new TypeImports();
    typeImports.addKnownType('VersionedGenericSubstrateApi', 'RpcVersion', 'RpcV2');
    typeImports.addContractType('SolGenericContractApi', 'SolRegistry');
    typeImports.addChainType('SubstrateApi');

    const importTypes = typeImports.toImports({ useSubPaths });

    const template = compileTemplate('sol/templates/index.hbs');

    return beautifySourceCode(
      template({
        interfaceName,
        importTypes,
      }),
    );
  }
}
