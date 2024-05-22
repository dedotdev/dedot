import { MetadataLatest, PortableRegistry, TypeId } from '@dedot/codecs';
import { EnumOptions } from '@dedot/shape';
import { checkKnownCodecType, findKnownCodecType, BaseTypesGen, NamedType } from '../../shared/index.js';
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

// These are common & generic types, so we'll remove these from all paths at index 1
// This helps make the type name shorter
const PATH_RM_INDEX_1 = ['generic', 'misc', 'pallet', 'traits', 'types'];

export class TypesGen extends BaseTypesGen {
  metadata: MetadataLatest;
  registry: PortableRegistry;

  constructor(metadata: MetadataLatest) {
    super(metadata.types);
    this.metadata = metadata;
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

  includeTypes(): Record<TypeId, NamedType> {
    const pathsCount = new Map<string, Array<number>>();
    const typesWithPath = this.types.filter((one) => one.path.length > 0);
    const skipIds: TypeId[] = [];
    const typeSuffixes = new Map<TypeId, string>();

    typesWithPath.forEach(({ path, id }) => {
      const joinedPath = path.join('::');
      if (pathsCount.has(joinedPath)) {
        // We compare 2 types with the same path here,
        //  if they are the same type -> skip the current one, keep the first occurrence
        //  if they are not the same type but has the same path -> we'll try to calculate & add a suffix for the current type name
        const firstOccurrenceTypeId = pathsCount.get(joinedPath)![0];
        const sameType = this.typeEql(firstOccurrenceTypeId, id);
        if (sameType) {
          skipIds.push(id);
        } else {
          pathsCount.get(joinedPath)!.push(id);
          typeSuffixes.set(
            id,
            this.extractDupTypeSuffix(id, firstOccurrenceTypeId, pathsCount.get(joinedPath)!.length),
          );
        }
      } else {
        pathsCount.set(joinedPath, [id]);
      }
    });

    return typesWithPath.reduce(
      (o, type) => {
        const { path, id } = type;
        const joinedPath = path.join('::');

        if (SKIP_TYPES.includes(joinedPath) || SKIP_TYPES.includes(path.at(-1)!)) {
          return o;
        }

        const suffix = typeSuffixes.get(id) || '';

        let knownType = false;
        let name, nameOut;

        const [isKnownCodecType, codecName] = checkKnownCodecType(joinedPath);

        if (isKnownCodecType) {
          const codecType = findKnownCodecType(codecName);
          name = codecType.typeIn;
          nameOut = codecType.typeOut;

          knownType = true;
        } else if (PATH_RM_INDEX_1.includes(path[1])) {
          const newPath = path.slice();
          newPath.splice(1, 1);
          name = this.cleanPath(newPath);
        } else {
          name = this.cleanPath(path);
        }

        if (this.shouldGenerateTypeIn(id)) {
          nameOut = name;
          name = name.endsWith('Like') ? name : `${name}Like`;
        }

        o[id] = {
          name: `${name}${suffix}`,
          nameOut: nameOut ? `${nameOut}${suffix}` : `${name}${suffix}`,
          knownType,
          skip: skipIds.includes(id),
          ...type,
        };

        return o;
      },
      {} as Record<TypeId, NamedType>,
    );
  }

  getEnumOptions(typeId: TypeId): EnumOptions {
    return this.registry.getEnumOptions(typeId);
  }

  shouldGenerateTypeIn(id: TypeId) {
    const { callTypeId } = this.metadata.extrinsic;
    const palletCallTypeIds = this.registry.getPalletCallTypeIds();

    return callTypeId === id || palletCallTypeIds.includes(id);
  }
}
