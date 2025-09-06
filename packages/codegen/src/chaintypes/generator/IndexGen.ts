import { SubstrateRuntimeVersion } from '@dedot/api';
import { MetadataLatest } from '@dedot/codecs';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class IndexGen {
  constructor(
    readonly interfaceName: string,
    readonly runtimeVersion: SubstrateRuntimeVersion,
    readonly typesGen: TypesGen,
  ) {}

  async generate(useSubPaths: boolean = false) {
    const interfaceName = this.interfaceName;

    // Clear cache and setup type imports
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi', 'RpcLegacy', 'RpcV2', 'RpcVersion');

    // Extract type IDs from metadata.extrinsic
    const { callTypeId, addressTypeId, signatureTypeId, signedExtensions } = this.typesGen.metadata.extrinsic;

    // Generate proper TypeScript types using typeOut format (0, true)
    const runtimeCallType = this.typesGen.generateType(callTypeId, 1, true);
    const addressType = this.typesGen.generateType(addressTypeId, 1, true);
    const signatureType = this.typesGen.generateType(signatureTypeId, 1, true);

    // Generate Extra type from signed extensions
    let extraType = 'any[]'; // Default fallback
    if (signedExtensions && signedExtensions.length > 0) {
      const signedExtensionTypes = signedExtensions.map(({ typeId }) => 
        this.typesGen.generateType(typeId, 1, true)
      );
      extraType = `[${signedExtensionTypes.join(', ')}]`;
    }

    // Add generated types to imports
    const generatedTypes = [runtimeCallType, addressType, signatureType, extraType];
    this.typesGen.addTypeImport(generatedTypes);

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const interfaceDocs = commentBlock([
      `@name: ${interfaceName}`, // prettier-end-here
      `@specVersion: ${this.runtimeVersion.specVersion}`,
    ]);

    const template = compileTemplate('chaintypes/templates/index.hbs');

    return beautifySourceCode(
      template({
        interfaceName,
        interfaceDocs,
        importTypes,
        addressType,
        signatureType,
        runtimeCallType,
        extraType,
      }),
    );
  }
}
