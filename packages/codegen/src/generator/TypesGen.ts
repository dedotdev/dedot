import { stringPascalCase } from '@polkadot/util';
import { CodecRegistry, Field, MetadataLatest, PortableType, TypeId, TypeParam } from '@dedot/codecs';
import { isNativeType, normalizeName } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { registry } from '@dedot/types';
import { TypeImports } from './TypeImports';
import { findKnownCodec, findKnownCodecType, isKnownCodecType } from './known_codecs';

interface NamedType extends PortableType {
  name: string; // nameIn, ~ typeIn
  nameOut: string; // ~ typeOut
  skip?: boolean;
  knownType?: boolean;
  suffix?: string;
}

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

export const BASIC_KNOWN_TYPES = ['BitSequence', 'Bytes', 'BytesLike', 'FixedBytes', 'FixedArray', 'Result'];
const WRAPPER_TYPE_REGEX = /^(\w+)(<.*>)$/g;

export class TypesGen {
  metadata: MetadataLatest;
  /**
   * Types will be generated its definition out.
   */
  includedTypes: Record<TypeId, NamedType>;
  registry: CodecRegistry;
  typeImports: TypeImports;

  constructor(metadata: MetadataLatest) {
    this.metadata = metadata;
    this.registry = new CodecRegistry(this.metadata);
    this.includedTypes = this.#includedTypes();
    this.typeImports = new TypeImports();
  }

  generate() {
    this.clearCache();

    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ name, nameOut, id, docs }) => {
        defTypeOut += `${commentBlock(docs)}export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.#shouldGenerateTypeIn(id)) {
          defTypeOut += `export type ${name} = ${this.generateType(id)};\n\n`;
        }
      });

    const importTypes = this.typeImports.toImports('./types');
    const template = compileTemplate('types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  typeCache: Record<string, string> = {};

  clearCache() {
    this.typeCache = {};
    this.typeImports.clear();
  }

  generateType(typeId: TypeId, nestedLevel = 0, typeOut = false): string {
    if (nestedLevel > 0) {
      const includedDef = this.includedTypes[typeId];
      // If current typeId has its definition generated,
      // we can just use its name, no need to generate its type again
      if (includedDef) {
        const { name, nameOut } = includedDef;
        if (typeOut) {
          this.addTypeImport(nameOut);
          return nameOut;
        } else {
          this.addTypeImport(name);
          return name;
        }
      }
    }

    const typeCacheKey = `${typeId}/${typeOut ? 'typeOut' : 'typeIn'}`;

    if (this.typeCache[typeCacheKey]) {
      return this.typeCache[typeCacheKey];
    }

    const type = this.#generateType(typeId, nestedLevel, typeOut);
    this.typeCache[typeCacheKey] = type;

    const baseType = this.#removeGenericPart(type);
    if (BASIC_KNOWN_TYPES.includes(baseType)) {
      this.addTypeImport(baseType);
    }

    return type;
  }

  #generateType(typeId: TypeId, nestedLevel = 0, typeOut = false): string {
    const def = this.metadata.types[typeId];
    if (!def) {
      throw new Error(`Type def not found ${JSON.stringify(def)}`);
    }

    const { type, path, docs } = def;
    const { tag, value } = type;

    switch (tag) {
      case 'Primitive':
        const $codec = findKnownCodec(value.kind);

        if ($codec.nativeType) {
          return $codec.nativeType;
        } else if (value.kind === 'char') {
          return 'string';
        } else {
          throw new Error(`Invalid primitive type: ${value.kind}`);
        }

      case 'Struct': {
        const { fields } = value;

        if (fields.length === 0) {
          return '{}';
        } else if (!fields[0].name) {
          if (fields.length === 1) {
            return this.generateType(fields[0]!.typeId, nestedLevel + 1, typeOut);
          } else {
            return `[${fields.map((f) => this.generateType(f.typeId, nestedLevel + 1, typeOut)).join(', ')}]`;
          }
        } else {
          return this.generateObjectType(fields, nestedLevel + 1, typeOut);
        }
      }

      case 'Enum': {
        const { members } = value;
        if (path.join('::') === 'Option') {
          const some = members.find((one) => one.name === 'Some');
          if (some) {
            return `${this.generateType(some.fields[0].typeId, nestedLevel + 1, typeOut)} | undefined`;
          }
        } else if (path.join('::') === 'Result') {
          const ok = members.find((one) => one.name === 'Ok');
          const err = members.find((one) => one.name === 'Err');
          if (ok && err) {
            const OkType = this.generateType(ok.fields[0].typeId, nestedLevel + 1, typeOut);
            const ErrType = this.generateType(err.fields[0].typeId, nestedLevel + 1, typeOut);

            return `Result<${OkType}, ${ErrType}>`;
          }
        }

        if (members.length === 0) {
          return 'null';
        } else if (members.every((x) => x.fields.length === 0)) {
          return members.map(({ name, docs }) => `${commentBlock(docs)}'${stringPascalCase(name)}'`).join(' | ');
        } else {
          const membersType: [key: string, value: string | null, docs: string[]][] = [];
          for (const { fields, name, docs } of members) {
            const keyName = stringPascalCase(name);
            if (fields.length === 0) {
              membersType.push([keyName, null, docs]);
            } else if (fields[0]!.name === undefined) {
              const valueType =
                fields.length === 1
                  ? this.generateType(fields[0].typeId, nestedLevel + 1, typeOut)
                  : `[${fields
                      .map(
                        ({ typeId, docs }) =>
                          `${commentBlock(docs)}${this.generateType(typeId, nestedLevel + 1, typeOut)}`,
                      )
                      .join(', ')}]`;
              membersType.push([keyName, valueType, docs]);
            } else {
              membersType.push([keyName, this.generateObjectType(fields, nestedLevel + 1, typeOut), docs]);
            }
          }

          const { tagKey, valueKey } = this.registry.portableRegistry!.getEnumOptions(typeId);

          return membersType
            .map(([keyName, valueType, docs]) => ({
              tag: `${tagKey}: '${keyName}'`,
              value: valueType ? `, ${valueKey}${this.#isOptionalType(valueType) ? '?' : ''}: ${valueType} ` : '',
              docs,
            }))
            .map(({ tag, value, docs }) => `${commentBlock(docs)}{ ${tag}${value} }`)
            .join(' | ');
        }
      }

      case 'Tuple': {
        const { fields } = value;

        if (fields.length === 0) {
          return '[]';
        } else if (fields.length === 1) {
          return this.generateType(fields[0], nestedLevel + 1, typeOut);
        } else {
          return `[${fields.map((x) => this.generateType(x, nestedLevel + 1, typeOut)).join(', ')}]`;
        }
      }
      case 'BitSequence':
        return 'BitSequence';
      case 'Compact':
        return this.generateType(value.typeParam, nestedLevel + 1, typeOut);
      case 'Sequence':
      case 'SizedVec': {
        const fixedSize = tag === 'SizedVec' ? `${value.len}` : null;
        const $innerType = this.metadata.types[value.typeParam].type;
        if ($innerType.tag === 'Primitive' && $innerType.value.kind === 'u8') {
          return fixedSize ? `FixedBytes<${fixedSize}>` : typeOut ? 'Bytes' : 'BytesLike';
        } else {
          const innerType = this.generateType(value.typeParam, nestedLevel + 1, typeOut);
          return fixedSize ? `FixedArray<${innerType}, ${fixedSize}>` : `Array<${innerType}>`;
        }
      }
      default:
        throw new Error(`Invalid type! ${tag}`);
    }
  }

  generateObjectType(fields: Field[], nestedLevel = 0, typeOut = false) {
    const props = fields.map(({ typeId, name, docs }) => {
      const type = this.generateType(typeId, nestedLevel + 1, typeOut);
      return {
        name: normalizeName(name!),
        type,
        optional: this.#isOptionalType(type),
        docs,
      };
    });

    return `{${props
      .map(({ name, type, optional, docs }) => `${commentBlock(docs)}${name}${optional ? '?' : ''}: ${type}`)
      .join(',\n')}}`;
  }

  #isOptionalType(type: string) {
    return type.endsWith('| undefined');
  }

  #includedTypes(): Record<TypeId, NamedType> {
    const { types } = this.metadata;
    const pathsCount = new Map<string, Array<number>>();
    const typesWithPath = types.filter((one) => one.path.length > 0);
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
            this.#extractDupTypeSuffix(id, firstOccurrenceTypeId, pathsCount.get(joinedPath)!.length),
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

        if (isKnownCodecType(joinedPath)) {
          const codecType = findKnownCodecType(path.at(-1)!);
          name = codecType.typeIn;
          nameOut = codecType.typeOut;

          knownType = true;
        } else if (PATH_RM_INDEX_1.includes(path[1])) {
          const newPath = path.slice();
          newPath.splice(1, 1);
          name = this.#cleanPath(newPath);
        } else {
          name = this.#cleanPath(path);
        }

        if (this.#shouldGenerateTypeIn(id)) {
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

  #removeGenericPart(typeName: string) {
    if (typeName.match(WRAPPER_TYPE_REGEX)) {
      return typeName.replace(WRAPPER_TYPE_REGEX, (_, $1) => $1);
    } else {
      return typeName;
    }
  }

  /**
   * @description Remove duplicated part of the path
   *
   * Example:
   * ["pallet_staking", "pallet", "pallet", "Event"]
   * => ["pallet_staking", "pallet", "Event"]
   *
   * @param path
   * @private
   */
  #cleanPath(path: string[]) {
    return path
      .map((one) => stringPascalCase(one))
      .filter((one, idx, currentPath) => idx === 0 || one !== currentPath[idx - 1])
      .join('');
  }

  #shouldGenerateTypeIn(id: TypeId) {
    const { callTypeId } = this.metadata.extrinsic;
    const palletCallTypeIds = this.registry.portableRegistry!.getPalletCallTypeIds();

    return callTypeId === id || palletCallTypeIds.includes(id);
  }

  eqlCache = new Map<string, boolean>();

  typeEql(idA: number, idB: number, level = 0): boolean {
    const cacheKey = `${idA}==${idB}`;
    if (!this.eqlCache.has(cacheKey)) {
      this.eqlCache.set(cacheKey, true);
      this.eqlCache.set(cacheKey, this.#typeEql(idA, idB, level));
    }

    return this.eqlCache.get(cacheKey)!;
  }

  #typeEql(idA: number, idB: number, lvl = 0): boolean {
    if (idA === idB) return true;

    const { types } = this.metadata;
    const typeA = types[idA];
    const typeB = types[idB];

    if (typeA.path.join('::') !== typeB.path.join('::')) return false;

    const { type: defA, params: paramsA } = typeA;
    const { type: defB, params: paramsB } = typeB;

    if (!this.#eqlArray(paramsA, paramsB, (valA, valB) => this.#eqlTypeParam(valA, valB))) {
      return false;
    }

    if (defA.tag !== defB.tag) return false;
    if (defA.tag === 'BitSequence') return true;

    if (defA.tag === 'Primitive' && defB.tag === 'Primitive') {
      return defA.value.kind === defB.value.kind;
    }

    if ((defA.tag === 'Compact' && defB.tag === 'Compact') || (defA.tag === 'Sequence' && defB.tag === 'Sequence')) {
      return this.typeEql(defA.value.typeParam, defB.value.typeParam, lvl + 1);
    }

    if (defA.tag === 'SizedVec' && defB.tag === 'SizedVec') {
      return defA.value.len === defB.value.len && this.typeEql(defA.value.typeParam, defB.value.typeParam, lvl + 1);
    }

    if (defA.tag === 'Tuple' && defB.tag === 'Tuple') {
      return this.#eqlArray(defA.value.fields, defB.value.fields, (val1, val2) => this.typeEql(val1, val2, lvl + 1));
    }

    if (defA.tag === 'Struct' && defB.tag === 'Struct') {
      return this.#eqlFields(defA.value.fields, defB.value.fields, lvl);
    }

    if (defA.tag === 'Enum' && defB.tag === 'Enum') {
      return this.#eqlArray(
        defA.value.members,
        defB.value.members,
        (val1, val2) =>
          val1.name === val2.name && val1.index === val2.index && this.#eqlFields(val1.fields, val2.fields, lvl),
      );
    }

    return false;
  }

  #eqlArray<T1, T2>(arr1: Array<T1>, arr2: Array<T2>, eqlVal: (val1: T1, val2: T2) => boolean) {
    return arr1.length === arr2.length && arr1.every((e1, idx) => eqlVal(e1, arr2[idx]));
  }

  #eqlFields(arr1: Array<Field>, arr2: Array<Field>, lvl: number) {
    return this.#eqlArray(
      arr1,
      arr2,
      (val1, val2) =>
        val1.name === val2.name && val1.typeName === val2.typeName && this.#typeEql(val1.typeId, val2.typeId),
    );
  }

  #eqlTypeParam(param1: TypeParam, param2: TypeParam) {
    return (
      param1.name === param2.name &&
      (param1.typeId === undefined) === (param2.typeId === undefined) &&
      (param1.typeId === undefined || this.#typeEql(param1.typeId!, param2.typeId!))
    );
  }

  #extractDupTypeSuffix(dupTypeId: TypeId, originalTypeId: TypeId, dupCount: number) {
    const { types } = this.metadata;
    const originalTypeParams = types[originalTypeId].params;
    const dupTypeParams = types[dupTypeId].params;
    const diffParam = dupTypeParams.find((one, idx) => !this.#eqlTypeParam(one, originalTypeParams[idx]));

    // TODO make sure these suffix is unique if a type is duplicated more than 2 times
    if (diffParam?.typeId) {
      const diffType = types[diffParam.typeId];
      if (diffType.path.length > 0) {
        return stringPascalCase(diffType.path.at(-1)!);
      } else if (diffType.type.tag === 'Primitive') {
        return stringPascalCase(diffType.type.value.kind);
      }
    }

    // Last resort!
    return dupCount.toString().padStart(3, '0');
  }

  addTypeImport(typeName: string | string[]) {
    if (Array.isArray(typeName)) {
      typeName.forEach((one) => this.addTypeImport(one));
      return;
    }

    if (isNativeType(typeName)) {
      return;
    }

    for (let type of Object.values(this.includedTypes)) {
      if (type.skip) {
        continue;
      }

      const { name, nameOut, knownType } = type;
      if (name === typeName || nameOut === typeName) {
        if (knownType) {
          this.typeImports.addCodecType(typeName);
        } else {
          this.typeImports.addPortableType(typeName);
        }

        return;
      }
    }

    if (BASIC_KNOWN_TYPES.includes(typeName)) {
      this.typeImports.addCodecType(typeName);
      return;
    }

    if (registry.has(typeName)) {
      this.typeImports.addKnownType(typeName);
    } else {
      this.typeImports.addOutType(typeName);
    }
  }
}
