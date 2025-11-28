import { SubstrateRuntimeVersion } from '@dedot/api';
import { SignedExtensionDefLatest } from '@dedot/codecs';
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
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi', 'GenericChainKnownTypes');

    // Extract type IDs from metadata.extrinsic
    const { callTypeId, addressTypeId, signatureTypeId, signedExtensions } = this.typesGen.metadata.extrinsic;

    // Generate proper TypeScript types using typeOut format (0, true)
    const runtimeCallType = this.typesGen.generateType(callTypeId, 1, true);
    const addressType = this.typesGen.generateType(addressTypeId, 1, true);
    const signatureType = this.typesGen.generateType(signatureTypeId, 1, true);

    // Generate Extra type from signed extensions
    let extraType = 'any[]'; // Default fallback
    if (signedExtensions && signedExtensions.length > 0) {
      const signedExtensionTypes = signedExtensions.map(({ typeId }) => this.typesGen.generateType(typeId, 1, true));
      extraType = `[${signedExtensionTypes.join(', ')}]`;
    }

    // Generate AssetId type from ChargeAssetTxPayment extension
    const assetIdType = this.findAssetIdType(signedExtensions) ?? 'undefined';

    // Add generated types to imports
    const generatedTypes = [runtimeCallType, addressType, signatureType, extraType, assetIdType];
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
        assetIdType,
      }),
    );
  }

  private findAssetIdType(signedExtensions: SignedExtensionDefLatest[]): string | undefined {
    // Find ChargeAssetTxPayment extension
    const chargeAssetExt = signedExtensions.find((ext) => ext.ident.endsWith('ChargeAssetTxPayment'));
    if (!chargeAssetExt) return undefined;

    try {
      const extensionTypeDef = this.typesGen.registry.findType(chargeAssetExt.typeId);
      if (extensionTypeDef.typeDef.type !== 'Struct') return undefined;

      const assetIdField = extensionTypeDef.typeDef.value.fields.find((f) => f.name === 'asset_id');
      if (!assetIdField) return undefined;

      // Check if wrapped in Option - need to unwrap to get inner type
      const assetIdTypeDef = this.typesGen.registry.findType(assetIdField.typeId);
      let assetIdTypeId = assetIdField.typeId;

      // Option is an Enum type with path ['Option']
      if (assetIdTypeDef.typeDef.type === 'Enum' && assetIdTypeDef.path.join('::') === 'Option') {
        // Get the inner type from the 'Some' variant
        const someVariant = assetIdTypeDef.typeDef.value.members.find((m) => m.name === 'Some');
        if (someVariant && someVariant.fields.length > 0) {
          assetIdTypeId = someVariant.fields[0].typeId;
        }
      }

      return this.typesGen.generateType(assetIdTypeId, 1, true);
    } catch {
      return undefined;
    }
  }
}
