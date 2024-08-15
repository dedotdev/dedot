import { Field, PortableType, TypeId, TypeParam } from '@dedot/codecs';
import { EnumOptions } from '@dedot/shape';
import { normalizeName, stringPascalCase } from '@dedot/utils';
import { commentBlock, isNativeType, WRAPPER_TYPE_REGEX } from '../utils.js';
import { TypeImports } from './TypeImports.js';
import { checkKnownCodecType, findKnownCodec, findKnownCodecType } from './known-codecs.js';

// These are common & generic types, so we'll remove these from all paths at index 1
// This helps make the type name shorter
const PATH_RM_INDEX_1 = ['generic', 'misc', 'pallet', 'traits', 'types'];

export interface NamedType extends PortableType {
  name: string; // nameIn, ~ typeIn
  nameOut: string; // ~ typeOut
  skip?: boolean;
  knownType?: boolean;
  suffix?: string;
}

export const BASIC_KNOWN_TYPES = ['BitSequence', 'Bytes', 'BytesLike', 'FixedBytes', 'FixedArray', 'Result'];

export abstract class BaseTypesGen {
  types: PortableType[];
  includedTypes: Record<TypeId, NamedType>;
  typeImports: TypeImports;
  skipTypes: string[];
  knownTypes: Map<TypeId, string>;

  protected constructor(types: PortableType[], skipTypes: string[] = []) {
    this.types = types;
    this.skipTypes = skipTypes;
    this.knownTypes = new Map<TypeId, string>();
    this.typeImports = new TypeImports();
    this.includedTypes = {};
  }

  shouldGenerateTypeIn(_id: TypeId): boolean {
    return false;
  }

  typeCache: Record<string, string> = {};

  clearCache() {
    this.typeCache = {};
    this.typeImports.clear();
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

    typesWithPath.map((type) => {
      const { path, id } = type;
      const joinedPath = path.join('::');
      const [knownType, codecName] = checkKnownCodecType(joinedPath);
      if (!knownType) return;

      this.knownTypes.set(id, codecName);
    });

    return typesWithPath.reduce(
      (o, type) => {
        const { path, id } = type;
        const joinedPath = path.join('::');

        if (this.skipTypes.includes(joinedPath) || this.skipTypes.includes(path.at(-1)!)) {
          return o;
        }

        const suffix = typeSuffixes.get(id) || '';

        let name, nameOut;

        const knownCodecName = this.knownTypes.get(id);
        const knownType = !!knownCodecName;

        if (knownType) {
          const codecType = findKnownCodecType(knownCodecName);
          name = codecType.typeIn;
          nameOut = codecType.typeOut;
        } else if (PATH_RM_INDEX_1.includes(path[1])) {
          const newPath = path.slice();
          newPath.splice(1, 1);
          name = this.cleanPath(newPath);
        } else {
          name = this.cleanPath(path);
        }

        if (!knownType && this.shouldGenerateTypeIn(id)) {
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
    const def = this.types[typeId];
    if (!def) {
      throw new Error(`Type def not found ${JSON.stringify(def)}`);
    }

    const { typeDef, path, docs } = def;
    const { type, value } = typeDef;

    switch (type) {
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

          const { tagKey, valueKey } = this.getEnumOptions(typeId);

          return membersType
            .map(([keyName, valueType, docs]) => ({
              type: `${tagKey}: '${keyName}'`,
              value: valueType ? `, ${valueKey}${this.#isOptionalType(valueType) ? '?' : ''}: ${valueType} ` : '',
              docs,
            }))
            .map(({ type, value, docs }) => `${commentBlock(docs)}{ ${type}${value} }`)
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
        const fixedSize = type === 'SizedVec' ? `${value.len}` : null;
        const $innerType = this.types[value.typeParam].typeDef;
        if ($innerType.type === 'Primitive' && $innerType.value.kind === 'u8') {
          return fixedSize ? `FixedBytes<${fixedSize}>` : typeOut ? 'Bytes' : 'BytesLike';
        } else {
          const innerType = this.generateType(value.typeParam, nestedLevel + 1, typeOut);
          return fixedSize ? `FixedArray<${innerType}, ${fixedSize}>` : `Array<${innerType}>`;
        }
      }
      default:
        throw new Error(`Invalid type! ${type}`);
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

  #removeGenericPart(typeName: string) {
    if (typeName.match(WRAPPER_TYPE_REGEX)) {
      return typeName.replace(WRAPPER_TYPE_REGEX, (_, $1) => $1);
    } else {
      return typeName;
    }
  }

  cleanPath(path: string[]) {
    return path
      .map((one) => stringPascalCase(one))
      .filter((one, idx, currentPath) => idx === 0 || one !== currentPath[idx - 1])
      .join('');
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

    const typeA = this.types[idA];
    const typeB = this.types[idB];

    if (typeA.path.join('::') !== typeB.path.join('::')) return false;

    const { typeDef: defA, params: paramsA } = typeA;
    const { typeDef: defB, params: paramsB } = typeB;

    if (!this.#eqlArray(paramsA, paramsB, (valA, valB) => this.#eqlTypeParam(valA, valB))) {
      return false;
    }

    if (defA.type !== defB.type) return false;
    if (defA.type === 'BitSequence') return true;

    if (defA.type === 'Primitive' && defB.type === 'Primitive') {
      return defA.value.kind === defB.value.kind;
    }

    if (
      (defA.type === 'Compact' && defB.type === 'Compact') ||
      (defA.type === 'Sequence' && defB.type === 'Sequence')
    ) {
      return this.typeEql(defA.value.typeParam, defB.value.typeParam, lvl + 1);
    }

    if (defA.type === 'SizedVec' && defB.type === 'SizedVec') {
      return defA.value.len === defB.value.len && this.typeEql(defA.value.typeParam, defB.value.typeParam, lvl + 1);
    }

    if (defA.type === 'Tuple' && defB.type === 'Tuple') {
      return this.#eqlArray(defA.value.fields, defB.value.fields, (val1, val2) => this.typeEql(val1, val2, lvl + 1));
    }

    if (defA.type === 'Struct' && defB.type === 'Struct') {
      return this.#eqlFields(defA.value.fields, defB.value.fields, lvl);
    }

    if (defA.type === 'Enum' && defB.type === 'Enum') {
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

  extractDupTypeSuffix(dupTypeId: TypeId, originalTypeId: TypeId, dupCount: number) {
    const originalTypeParams = this.types[originalTypeId].params;
    const dupTypeParams = this.types[dupTypeId].params;
    const diffParam = dupTypeParams.find((one, idx) => !this.#eqlTypeParam(one, originalTypeParams[idx]));

    // TODO make sure these suffix is unique if a type is duplicated more than 2 times
    if (diffParam?.typeId) {
      const diffType = this.types[diffParam.typeId];
      if (diffType.path.length > 0) {
        return stringPascalCase(diffType.path.at(-1)!);
      } else if (diffType.typeDef.type === 'Primitive') {
        return stringPascalCase(diffType.typeDef.value.kind);
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

    this.typeImports.addOutType(typeName);
  }

  getEnumOptions(_typeId: TypeId): EnumOptions {
    return { tagKey: 'type', valueKey: 'value' };
  }
}
