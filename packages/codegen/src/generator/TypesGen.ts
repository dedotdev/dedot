import { stringPascalCase } from '@polkadot/util';
import { CodecRegistry, Field, MetadataLatest, Type, TypeId, TypeParam } from '@delightfuldot/codecs';
import { normalizeName } from '@delightfuldot/utils';
import { commentBlock, compileTemplate, format, resolveFilePath } from './utils';


interface NamedType extends Type {
  name: string; // Final type name to print out
  skip?: boolean;
  knownType?: boolean;
  suffix?: string;
}

// TODO docs!
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
// Remove these from all paths at index 1
// TODO docs: include ref
const PATH_RM_INDEX_1 = ['generic', 'misc', 'pallet', 'traits', 'types'];

export const BASIC_KNOWN_TYPES = ['BitSequence', 'Bytes', 'FixedBytes', 'FixedArray'];
const WRAPPER_TYPE_REGEX = /^(\w+)(<.*>)$/g;

export class TypesGen {
  metadata: MetadataLatest;
  includedTypes: Record<TypeId, NamedType>;
  registry: CodecRegistry;

  constructor(metadata: MetadataLatest) {
    this.metadata = metadata;
    this.registry = new CodecRegistry(this.metadata);
    this.includedTypes = this.#includedTypes();
  }

  generate() {
    let defTypeOut = '';
    const knownTypes = Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !skip && knownType)
      .map((one) => one.name);

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ name, id, docs }) => {
        defTypeOut += `${commentBlock(docs)}export type ${name} = ${this.generateType(id)};\n\n`;
      });

    const importBaseTypes = BASIC_KNOWN_TYPES.filter((one) => this.usedNameTypes.has(one));

    const typesToImport = [...importBaseTypes, ...knownTypes];

    const typesTemplateFilePath = resolveFilePath('packages/codegen/src/templates/types.hbs');
    const template = compileTemplate(typesTemplateFilePath);

    return format(template({ typesToImport, defTypeOut }));
  }

  typeCache: Record<TypeId, string> = {};
  usedNameTypes = new Set<string>();

  clearCache() {
    this.typeCache = {};
    this.usedNameTypes.clear();
  }

  generateType(typeId: TypeId, nestedLevel = 0): string {
    if (nestedLevel > 0) {
      const includedDef = this.includedTypes[typeId];
      // TODO docs this!
      if (includedDef) {
        this.usedNameTypes.add(includedDef.name);
        return includedDef.name;
      }
    }

    if (this.typeCache[typeId]) {
      return this.typeCache[typeId];
    }

    const type = this.#generateType(typeId, nestedLevel);
    this.typeCache[typeId] = type;

    const baseType = this.#removeGenericPart(type);
    if (BASIC_KNOWN_TYPES.includes(baseType)) {
      this.usedNameTypes.add(baseType);
    }

    return type;
  }

  #generateType(typeId: TypeId, nestedLevel = 0): string {
    const def = this.metadata.types[typeId];
    if (!def) {
      throw new Error(`Type def not found ${JSON.stringify(def)}`);
    }

    const { type, path, docs } = def;
    const { tag, value } = type;

    switch (tag) {
      case 'Primitive':
        if (['u8', 'i8', 'u16', 'i16', 'u32', 'i32'].includes(value.kind)) {
          return 'number';
        } else if (['u64', 'i64', 'u128', 'i128', 'u256', 'i256'].includes(value.kind)) {
          return 'bigint';
        } else if (value.kind === 'bool') {
          return 'boolean';
        } else if (value.kind === 'char' || value.kind === 'str') {
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
            return this.generateType(fields[0]!.typeId, nestedLevel + 1);
          } else {
            return `[${fields.map((f) => this.generateType(f.typeId, nestedLevel + 1)).join(', ')}]`;
          }
        } else {
          return this.#generateObjectType(fields);
        }
      }

      case 'Enum': {
        const { members } = value;
        if (path.join('::') === 'Option') {
          const some = members.find((one) => one.name === 'Some');
          if (some) {
            return `${this.generateType(some.fields[0].typeId, nestedLevel + 1)} | undefined`;
          }
        } else if (path.join('::') === 'Result') {
          const ok = members.find((one) => one.name === 'Ok');
          const err = members.find((one) => one.name === 'Err');
          if (ok && err) {
            const OkType = this.generateType(ok.fields[0].typeId, nestedLevel + 1);
            const ErrType = this.generateType(err.fields[0].typeId, nestedLevel + 1);

            return `${OkType} | ${ErrType}`;
          }
        }

        if (members.length === 0) {
          return 'null';
        } else if (members.every((x) => x.fields.length === 0)) {
          return members.map(({ name, docs }) => `${commentBlock(docs)}'${name}'`).join(' | ');
        } else {
          const membersType: Record<string, string | null> = {};
          for (const { fields, name } of members) {
            const keyName = name;
            if (fields.length === 0) {
              membersType[keyName] = null;
            } else if (fields[0]!.name === undefined) {
              const valueType =
                fields.length === 1
                  ? this.generateType(fields[0].typeId, nestedLevel + 1)
                  : `[${fields
                      .map(({ typeId, docs }) => `${commentBlock(docs)}${this.generateType(typeId, nestedLevel + 1)}`)
                      .join(', ')}]`;
              membersType[keyName] = valueType;
            } else {
              membersType[keyName] = this.#generateObjectType(fields, nestedLevel + 1);
            }
          }

          return Object.entries(membersType)
            .map(([keyName, valueType]) => ({
              tag: `tag: '${keyName}'`,
              value: valueType ? `, value${this.#isOptionalType(valueType) ? '?' : ''}: ${valueType} ` : '',
            }))
            .map(({ tag, value }) => `{ ${tag}${value} }`)
            .join(' | ');
        }
      }

      case 'Tuple': {
        const { fields } = value;

        if (fields.length === 0) {
          return '[]';
        } else if (fields.length === 1) {
          return this.generateType(fields[0], nestedLevel + 1);
        } else {
          return `[${fields.map((x) => this.generateType(x, nestedLevel + 1)).join(', ')}]`;
        }
      }
      case 'BitSequence':
        return 'BitSequence';
      case 'Compact':
        return this.generateType(value.typeParam, nestedLevel + 1);
      case 'Sequence':
      case 'SizedVec': {
        const fixedSize = tag === 'SizedVec' ? `${value.len}` : null;
        const $innerType = this.metadata.types[value.typeParam].type;
        if ($innerType.tag === 'Primitive' && $innerType.value.kind === 'u8') {
          return fixedSize ? `FixedBytes<${fixedSize}>` : 'Bytes';
        } else {
          const innerType = this.generateType(value.typeParam, nestedLevel + 1);
          return fixedSize ? `FixedArray<${innerType}, ${fixedSize}>` : `Array<${innerType}>`;
        }
      }
      default:
        throw new Error(`Invalid type! ${tag}`);
    }
  }

  #generateObjectType(fields: Field[], nestedLevel = 0) {
    const props = fields.map(({ typeId, name, docs }) => {
      const type = this.generateType(typeId, nestedLevel + 1);
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
        // TODO we compare 2 types with the same path here,
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

    return typesWithPath.reduce((o, type) => {
      const { path, id } = type;
      const joinedPath = path.join('::');

      if (SKIP_TYPES.includes(joinedPath) || SKIP_TYPES.includes(path.at(-1)!)) {
        return o;
      }

      const suffix = typeSuffixes.get(id) || '';

      let knownType = false;
      let name;

      if (this.registry.isKnownType(joinedPath)) {
        name = path.at(-1)!;

        // TODO docs! this behavior
        const $knownCodec = this.registry.findCodec(name);
        if ($knownCodec.metadata[0].name === '$.instance') {
          name = `${name}Like`;
        }

        knownType = true;
      } else if (PATH_RM_INDEX_1.includes(path[1])) {
        const newPath = path.slice();
        newPath.splice(1, 1);
        name = this.#cleanPath(newPath);
      } else {
        name = this.#cleanPath(path);
      }

      o[id] = {
        name: `${name}${suffix}`,
        knownType,
        skip: skipIds.includes(id),
        ...type,
      };

      return o;
    }, {} as Record<TypeId, NamedType>);
  }

  #removeGenericPart(typeName: string) {
    if (typeName.match(WRAPPER_TYPE_REGEX)) {
      return typeName.replace(WRAPPER_TYPE_REGEX, (_, $1) => $1);
    } else {
      return typeName;
    }
  }

  // TODO docs! remove duplicated part of the path
  #cleanPath(path: string[]) {
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
}