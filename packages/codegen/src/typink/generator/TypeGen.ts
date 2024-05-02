import { Field, TypeId, TypeParam } from '@dedot/codecs';
import { ContractMetadata, extractContractTypes, normalizeContractTypeDef } from '@dedot/contracts';
import { assert, normalizeName, stringPascalCase } from '@dedot/utils';
import { findKnownCodec, findKnownCodecType, isKnownCodecType } from '../../chaintypes/generator';
import { BASIC_KNOWN_TYPES, NamedType } from '../../chaintypes/generator';
import { beautifySourceCode, compileTemplate, isNativeType, WRAPPER_TYPE_REGEX } from '../../utils';
import { TypeImports } from './TypeImports';

const IGNORE_TYPES = ['Result', 'Option'];

export class TypeGen {
  contractMetadata: ContractMetadata;
  includedTypes: Record<number, NamedType>;
  typeImports: TypeImports;
  typeCache: Record<string, string> = {};

  constructor(contractMetadata: ContractMetadata) {
    this.contractMetadata = contractMetadata;
    this.includedTypes = this.#includeTypes();
    this.typeImports = new TypeImports();
  }

  generate(): Promise<string> {
    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ name, nameOut, id }) => {
        defTypeOut += `export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.#shouldGenerateTypeIn(id)) {
          defTypeOut += `export type ${name} = ${this.generateType(id)};\n\n`;
        }
      });

    const importTypes = this.typeImports.toImports('./types');
    const template = compileTemplate('typink', 'types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

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

  #removeGenericPart(typeName: string) {
    if (typeName.match(WRAPPER_TYPE_REGEX)) {
      return typeName.replace(WRAPPER_TYPE_REGEX, (_, $1) => $1);
    } else {
      return typeName;
    }
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
  }

  #generateType(typeId: TypeId, nestedLevel = 0, typeOut = false): string {
    const {
      type: { def, path },
    } = this.contractMetadata.types[typeId];

    assert(def, `Type def not found ${JSON.stringify(def)}`);

    const { tag, value } = normalizeContractTypeDef(def);

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
        if (path!.join('::') === 'Option') {
          const some = members.find((one) => one.name === 'Some');
          if (some) {
            return `${this.generateType(some.fields[0].typeId, nestedLevel + 1, typeOut)} | undefined`;
          }
        } else if (path!.join('::') === 'Result') {
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
          return members.map(({ name }) => `'${stringPascalCase(name)}'`).join(' | ');
        } else {
          const membersType: [key: string, value: string | null][] = [];
          for (const { fields, name } of members) {
            const keyName = stringPascalCase(name);
            if (fields.length === 0) {
              membersType.push([keyName, null]);
            } else if (fields[0]!.name === undefined) {
              const valueType =
                fields.length === 1
                  ? this.generateType(fields[0].typeId, nestedLevel + 1, typeOut)
                  : `[${fields
                      .map(({ typeId }) => `${this.generateType(typeId, nestedLevel + 1, typeOut)}`)
                      .join(', ')}]`;
              membersType.push([keyName, valueType]);
            } else {
              membersType.push([keyName, this.generateObjectType(fields, nestedLevel + 1, typeOut)]);
            }
          }

          const { tagKey, valueKey } = { tagKey: 'tag', valueKey: 'value' };

          return membersType
            .map(([keyName, valueType]) => ({
              tag: `${tagKey}: '${keyName}'`,
              value: valueType ? `, ${valueKey}${this.#isOptionalType(valueType) ? '?' : ''}: ${valueType} ` : '',
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
        const $innerType = normalizeContractTypeDef(this.contractMetadata.types[value.typeParam].type.def);
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
    const props = fields.map(({ typeId, name }) => {
      const type = this.generateType(typeId, nestedLevel + 1, typeOut);
      return {
        name: normalizeName(name!),
        type,
        optional: this.#isOptionalType(type),
      };
    });

    return `{${props.map(({ name, type, optional }) => `${name}${optional ? '?' : ''}: ${type}`).join(',\n')}}`;
  }

  #isOptionalType(type: string) {
    return type.endsWith('| undefined');
  }

  #includeTypes(): Record<number, NamedType> {
    const types = extractContractTypes(this.contractMetadata);
    const typesWithPath = types.filter((one) => one.path.length > 0 && !IGNORE_TYPES.includes(one.path[0]));
    const pathsCount = new Map<string, Array<number>>();
    const typeSuffixes = new Map<TypeId, string>();
    const skipIds: number[] = [];

    typesWithPath.forEach(({ path, id }) => {
      const joinedPath = path.join();
      if (pathsCount.has(joinedPath)) {
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
        const suffix = typeSuffixes.get(id) || '';

        let knownType = false;
        let name, nameOut;

        if (isKnownCodecType(joinedPath)) {
          const codecType = findKnownCodecType(path.at(-1)!);
          name = codecType.typeIn;
          nameOut = codecType.typeOut;

          knownType = true;
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

  #shouldGenerateTypeIn(id: number) {
    const { messages } = this.contractMetadata.spec;

    return messages.some((message) => message.returnType.type === id);
  }

  #cleanPath(path: string[]) {
    return path.map((one) => stringPascalCase(one)).join('');
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

    const types = extractContractTypes(this.contractMetadata);
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
    const types = extractContractTypes(this.contractMetadata);
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
