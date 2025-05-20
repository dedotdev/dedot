import { checkStorageApiSupports, ContractMetadata, RootLayoutV5 } from '@dedot/contracts';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
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
    typeImports.addContractType('GenericContractApi', 'DeepOnlyGetters');
    typeImports.addChainType('SubstrateApi');
    typeImports.addPortableType(langErrorName);

    const [rootStorageName, unpackedStorageName] = this.#extractRootStorageNames(typeImports);

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
    const importTypes = typeImports.toImports({ useSubPaths });

    const template = compileTemplate('typink/templates/index.hbs');

    return beautifySourceCode(
      template({
        interfaceName,
        interfaceDocs,
        langErrorName,
        importTypes,
        rootStorageName,
        unpackedStorageName,
      }),
    );
  }

  #extractRootStorageNames(typeImports: TypeImports) {
    try {
      checkStorageApiSupports(this.contractMetadata.version);

      const { ty: rootStorageId } = this.contractMetadata.storage.root as RootLayoutV5;

      const rootStorageName = this.typesGen.cleanPath(this.contractMetadata.types[rootStorageId].type.path!);
      typeImports.addPortableType(rootStorageName);

      return [rootStorageName, `DeepOnlyGetters<${rootStorageName}>`];
    } catch {
      const names = ['GenericRootStorage', 'GenericUnpackedStorage'];
      typeImports.addContractType(...names);

      return names;
    }
  }
}
