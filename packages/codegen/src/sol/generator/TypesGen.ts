import { TypeId } from '@dedot/codecs';
import { SolABIItem, SolABITypeDef } from '@dedot/contracts';
import { TypeImports } from '../../shared/TypeImports.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const INTERNAL_TYPE_REGEX = /^(struct|enum|tuple) \w+\.\w+$/;
const SOLIDITY_TYPES = [
  'uint8',
  'uint16',
  'uint32',
  'int8',
  'int16',
  'int32',
  'uint',
  'uint64',
  'uint128',
  'uint256',
  'int',
  'int64',
  'int128',
  'int256',
  'address',

  'bool',

  'string',

  'fixed',
  'ufixed',
  'fixed<M>x<N>',
  'ufixed<M>x<N>',

  'function',

  'tuple',

  'bytes<M>',
  'bytes',
];

export class TypesGen {
  types: SolABITypeDef[];
  typeImports: TypeImports;

  constructor(abiItems: SolABIItem[]) {
    this.types = this.extractTypes(abiItems);
    this.typeImports = new TypeImports();
  }

  generate(useSubPaths: boolean = false): Promise<string> {
    let defTypeOut = '';

    // TODO: Fix this
    const generatedTypes: string[] = [];
    this.types
      .filter((o) => o.internalType?.match(INTERNAL_TYPE_REGEX))
      .forEach((typeDef) => {
        const typeName = typeDef.internalType.split('.').pop()!;

        if (generatedTypes.includes(typeName)) {
          return;
        }

        defTypeOut += `export type ${typeName} = ${this.generateType(typeDef, 0, true)};\n`;

        generatedTypes.push(typeName);
      });

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types.js'], useSubPaths });
    const template = compileTemplate('sol/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  extractTypes(abiItems: SolABIItem[]): SolABITypeDef[] {
    const types: SolABITypeDef[] = [];

    abiItems.forEach((item) => {
      switch (item.type) {
        case 'function':
          types.push(...item.outputs);

          const innerOutputs = item.outputs
            .filter((o) => o.components && o.components.length > 0)
            .flatMap((o) => this.extractComponentTypes(o));

          types.push(...innerOutputs);
        case 'constructor':
          types.push(...item.inputs);

        case 'event':
        case 'error':
          if (item.type === 'event' || item.type === 'error') {
            const typeDef: SolABITypeDef = {
              name: item.name,
              components: item.inputs,
              internalType: item.type,
              type: 'tuple',
            };

            types.push(typeDef);
          }

          const innerInputs = item.inputs
            .filter((o) => o.components && o.components.length > 0)
            .flatMap((o) => this.extractComponentTypes(o));

          types.push(...innerInputs);

          break;

        default:
          throw new Error(`Unsupported ABI item type: ${item}`);

        // Actually we have it in real solidity contract
        // case 'fallback':
      }
    });

    return types;
  }

  extractComponentTypes(typeDef: SolABITypeDef): SolABITypeDef[] {
    const types: SolABITypeDef[] = [typeDef];

    typeDef.components?.forEach((item) => {
      if (item.type === 'tuple' && item.components && item.components.length > 0) {
        types.push(...this.extractComponentTypes(item));
      }
    });

    return types;
  }

  generateType(typeDef: SolABITypeDef, nestedLevel = 0, typeOut = false): string {
    if (nestedLevel > 0) {
      if (typeDef.internalType.match(INTERNAL_TYPE_REGEX)) {
        const [_, typeName] = typeDef.internalType.split('.');
        this.addTypeImport(typeName);

        return typeName;
      } else {
        return this.#generateType(typeDef);
      }
    }

    const typeCacheKey = `${typeDef.internalType}/${typeOut ? 'typeOut' : 'typeIn'}`;

    if (this.typeCache[typeCacheKey]) {
      return this.typeCache[typeCacheKey];
    }

    const type = this.#generateType(typeDef, nestedLevel, typeOut);
    this.typeCache[typeCacheKey] = type;

    return type;
  }

  shouldGenerateTypeIn(_id: TypeId): boolean {
    return false;
  }

  typeCache: Record<string, string> = {};

  clearCache() {
    this.typeCache = {};
    this.typeImports.clear();
  }

  #generateType(typeDef: SolABITypeDef, nestedLevel = 0, typeOut = false): string {
    const { type } = typeDef;

    switch (type) {
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'int8':
      case 'int16':
      case 'int32':
        return 'number';
      case 'uint':
      case 'uint64':
      case 'uint128':
      case 'uint256':
      case 'int':
      case 'int64':
      case 'int128':
      case 'int256':
        return 'bigint';

      // It is uint160
      case 'address':
        return 'bigint';

      case 'bool':
        return 'boolean';

      case 'string':
        return 'string';

      case 'fixed':
      case 'ufixed':
      case 'fixed<M>x<N>':
      case 'ufixed<M>x<N>':
        throw new Error('Does not support yet!');

      case 'function':
        throw new Error('Does not support yet!');

      case 'tuple': {
        const { components = [] } = typeDef;

        if (components.length === 0) {
          return '{}';
        } else {
          return this.generateObjectType(components, nestedLevel + 1, typeOut);
        }
      }

      case 'bytes<M>':
      case 'bytes': {
        /*
        const fixedSize = type === 'SizedVec' ? `${value.len}` : null;
        const $innerType = this.types[value.typeParam].typeDef;
        if ($innerType.type === 'Primitive' && $innerType.value.kind === 'u8') {
          return fixedSize ? `FixedBytes<${fixedSize}>` : typeOut ? 'Bytes' : 'BytesLike';
        } else {
          const innerType = this.generateType(value.typeParam, nestedLevel + 1, typeOut);
          return fixedSize ? `FixedArray<${innerType}, ${fixedSize}>` : `Array<${innerType}>`;
        }
        */

        throw new Error('Does not support yet!');
      }

      default:
        throw new Error(`Invalid type! ${type}`);
    }
  }

  generateObjectType(components: SolABITypeDef[], nestedLevel = 0, typeOut = false) {
    const props = components.map((typeDef) => {
      const type = this.generateType(typeDef, nestedLevel + 1, typeOut);
      return {
        name: typeDef.name,
        type,
      };
    });

    return `{${props.map(({ name, type }) => `${name}: ${type}`).join(',\n')}}`;
  }

  addTypeImport(typeName: string | string[]) {
    if (Array.isArray(typeName)) {
      typeName.forEach((one) => this.addTypeImport(one));
      return;
    }

    if (SOLIDITY_TYPES.includes(typeName)) {
      return;
    }

    this.typeImports.addPortableType(typeName);
  }
}
