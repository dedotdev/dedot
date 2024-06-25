import { MetadataLatest, PortableRegistry, TypeId } from '@dedot/codecs';
import { EnumOptions } from '@dedot/shape';
import { BaseTypesGen } from '../../shared/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';

// Skip generate types for these
// as we do have native types for them
const SKIP_TYPES = [
  'BoundedBTreeMap',
  'BoundedBTreeSet',
  'BoundedVec',
  'Box',
  'BTreeMap',
  'BTreeSet',
  'Cow',
  'Option',
  'Range',
  'RangeInclusive',
  'Result',
  'WeakBoundedVec',
  'WrapperKeepOpaque',
  'WrapperOpaque',
];

export class TypesGen extends BaseTypesGen {
  metadata: MetadataLatest;
  registry: PortableRegistry;

  constructor(metadata: MetadataLatest) {
    super(metadata.types);
    this.metadata = metadata;
    this.skipTypes = SKIP_TYPES;
    this.registry = new PortableRegistry(this.metadata);
    this.includedTypes = this.includeTypes();
  }

  generate(useSubPaths: boolean = false) {
    this.clearCache();

    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ name, nameOut, id, docs }) => {
        defTypeOut += `${commentBlock(docs)}export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.shouldGenerateTypeIn(id)) {
          defTypeOut += `export type ${name} = ${this.generateType(id)};\n\n`;
        }
      });

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types'], useSubPaths });
    const template = compileTemplate('chaintypes/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  override shouldGenerateTypeIn(id: TypeId) {
    const { callTypeId } = this.metadata.extrinsic;
    const palletCallTypeIds = this.registry.getPalletCallTypeIds();

    return callTypeId === id || palletCallTypeIds.includes(id);
  }

  override getEnumOptions(typeId: TypeId): EnumOptions {
    return this.registry.getEnumOptions(typeId);
  }
}
