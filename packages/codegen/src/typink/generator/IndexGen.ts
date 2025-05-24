import { GenericInkContractMetadata } from '@dedot/types';
import { SmartContractApi, TypeImports } from '../../shared/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class IndexGen {
  constructor(
    public interfaceName: string,
    public contractMetadata: GenericInkContractMetadata,
    public typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false, smartContractApi: SmartContractApi = SmartContractApi.ContractsApi) {
    const interfaceName = this.interfaceName;
    const langErrorId = this.contractMetadata.spec.lang_error.type;
    const langErrorName = this.typesGen.cleanPath(this.contractMetadata.types[langErrorId].type.path!);

    const typeImports = new TypeImports();
    typeImports.addKnownType('VersionedGenericSubstrateApi', 'RpcVersion', 'RpcV2');
    typeImports.addContractType('GenericContractApi');
    typeImports.addChainType('SubstrateApi');
    typeImports.addPortableType(langErrorName);

    const {
      contract: { name = '', version = '', authors = [] },
      source: { language = '' },
    } = this.contractMetadata;

    const interfaceDocs = commentBlock([
      `@name: ${interfaceName}`, // prettier-end-here
      `@contractName: ${name}`,
      `@contractVersion: ${version}`,
      `@authors: ${authors.join(', ')}`,
      `@language: ${language}`,
    ]);
    const importTypes = typeImports.toImports({ useSubPaths, smartContractApi });

    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(template({ interfaceName, interfaceDocs, langErrorName, importTypes }));
  }
}
