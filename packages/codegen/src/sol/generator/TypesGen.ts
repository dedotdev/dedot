import { SolABIItem, SolABITypeDef } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/TypeImports.js';
import { beautifySourceCode, compileTemplate, isNativeType } from '../../utils.js';

const INT_TYPES = /^int(\d+)?(\[(\d+)?])?$/;
const UINT_TYPES = /^uint(\d+)?(\[(\d+)?])?$/;
const BYTES_TYPES = /^bytes(\d+)?(\[(\d+)?])??$/;
const FIXED_TYPES = /^fixed(\d+x\d+)?(\[(\d+)])?$/;
const UNFIXED_TYPES = /^ufixed(\d+x\d+)?(\[(\d+)?])?$/;
const STRING_TYPES = /^string(\[(\d+)?])?$/;
const BOOL_TYPES = /^bool(\[(\d+)?])?$/;
const ADDRESS_TYPES = /^address(\[(\d+)?])?$/;
const FUNCTION_TYPES = /^function(\[(\d+)?])?$/;
const COMPONENT_TYPES = /^tuple(\[(\d+)?])?$/;

const SUPPORTED_SOLIDITY_TYPES = [
  INT_TYPES,
  UINT_TYPES,
  BYTES_TYPES,
  FIXED_TYPES,
  UNFIXED_TYPES,
  STRING_TYPES,
  BOOL_TYPES,
  ADDRESS_TYPES,
  FUNCTION_TYPES,
  COMPONENT_TYPES,
];

export const BASIC_KNOWN_TYPES = [
  /^(H160)(\[])?$/,
  /^(FixedBytes)<(\d+)>(\[])?$/,
  /^(Bytes)(\[])?$/,
  /^(BytesLike)(\[])?$/,
];

export class TypesGen {
  abiItems: SolABIItem[];
  typeImports: TypeImports;

  constructor(abiItems: SolABIItem[]) {
    this.abiItems = abiItems;
    this.typeImports = new TypeImports();
  }

  generate(useSubPaths: boolean = false): Promise<string> {
    let defTypeOut = '';

    this.abiItems.forEach((abiItem) => {
      if (abiItem.type === 'fallback' || abiItem.type === 'receive') return;

      if (
        abiItem.type === 'function' ||
        abiItem.type === 'constructor' ||
        abiItem.type === 'event' ||
        abiItem.type === 'error'
      ) {
        const { inputs } = abiItem;

        inputs
          .filter((o) => o.components && o.components.length > 0)
          .forEach((o) => {
            defTypeOut += `export type ${this.generateTypeName(o, abiItem)} = ${this.generateType(o, abiItem, 0)};\n`;
          });
      }

      if (abiItem.type === 'function') {
        const { outputs } = abiItem;

        outputs
          .filter((o) => o.components && o.components.length > 0)
          .forEach((o) => {
            defTypeOut += `export type ${this.generateTypeName(o, abiItem, true)} = ${this.generateType(o, abiItem, 0, true)};\n`;
          });
      }
    });

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types.js'], useSubPaths });
    const template = compileTemplate('sol/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  generateTypeName(typeDef: SolABITypeDef, abiItem: SolABIItem, typeOut = false): string {
    if (abiItem.type === 'fallback' || abiItem.type === 'receive') return '';

    if (typeDef.type === 'tuple') {
      const baseName =
        abiItem.type === 'constructor'
          ? `${typeDef.name}_input`
          : `${abiItem.name}_${typeDef.name}_${typeOut ? 'output' : 'input'}`;

      return stringPascalCase(baseName);
    }

    return '';
  }

  generateType(typeDef: SolABITypeDef, abiItem?: SolABIItem, nestedLevel = 0, typeOut = false): string {
    if (nestedLevel > 0 && abiItem) {
      let typeName = this.generateTypeName(typeDef, abiItem, typeOut);

      if (typeName.length === 0) {
        typeName = this.#generateType(typeDef, nestedLevel, typeOut);
      }

      this.addTypeImport(typeName);
      return typeName;
    }

    return this.#generateType(typeDef, nestedLevel, typeOut);
  }

  #generateType(typeDef: SolABITypeDef, nestedLevel = 0, typeOut = false): string {
    const { type } = typeDef;

    if (INT_TYPES.test(type)) {
      const [_, bitsStr, isArray] = type.match(INT_TYPES)!;

      // Default to 256 when unspecified
      const bits = bitsStr ? parseInt(bitsStr) : 256;
      const isSafeNumber = bits <= 48;

      if (isArray) return isSafeNumber ? 'number[]' : 'bigint[]';
      return isSafeNumber ? 'number' : 'bigint';
    } else if (UINT_TYPES.test(type)) {
      const [_, bitsStr, isArray] = type.match(UINT_TYPES)!;

      // Default to 256 when unspecified
      const bits = bitsStr ? parseInt(bitsStr) : 256;
      const isSafeNumber = bits <= 48;

      if (isArray) return isSafeNumber ? 'number[]' : 'bigint[]';
      return isSafeNumber ? 'number' : 'bigint';
    } else if (BYTES_TYPES.test(type)) {
      const [_, n, isArray] = type.match(BYTES_TYPES)!;

      if (n) {
        return isArray ? `FixedBytes<${n}>[]` : `FixedBytes<${n}>`;
      }

      if (typeOut) {
        return isArray ? `Bytes[]` : `Bytes`;
      }

      return isArray ? `BytesLike[]` : `BytesLike`;
    } else if (BOOL_TYPES.test(type)) {
      const [_, isArray] = type.match(BOOL_TYPES)!;

      return isArray ? 'boolean[]' : 'boolean';
    } else if (STRING_TYPES.test(type)) {
      const [_, isArray] = type.match(STRING_TYPES)!;

      return isArray ? 'string[]' : 'string';
    } else if (COMPONENT_TYPES.test(type)) {
      const { components = [] } = typeDef;
      const [_, isArray] = type.match(COMPONENT_TYPES)!;

      if (components.length === 0) {
        return isArray ? '{}[]' : '{}';
      } else {
        const objectType = this.generateObjectType(components, nestedLevel + 1, typeOut);

        return isArray ? `(${objectType})[]` : objectType;
      }
    } else if (ADDRESS_TYPES.test(type)) {
      const [_, isArray] = type.match(ADDRESS_TYPES)!;

      if (typeOut) {
        return isArray ? `H160[]` : `H160`;
      }

      return isArray ? `string[]` : `string`;
    } else if (FUNCTION_TYPES.test(type)) {
      const [_, isArray] = type.match(FUNCTION_TYPES)!;

      // Function type is an address (20 bytes) followed by a function selector (4 bytes).
      // Ref: https://docs.soliditylang.org/en/latest/abi-spec.html#:~:text=function%3A%20an%20address%20(20%20bytes)%20followed%20by%20a%20function%20selector%20(4%20bytes).%20Encoded%20identical%20to%20bytes24.
      return isArray ? `FixedBytes<24>[]` : `FixedBytes<24>`;
    } else if (FIXED_TYPES.test(type) || UNFIXED_TYPES.test(type)) {
      const [_, __, isArray] = type.match(FIXED_TYPES) || type.match(UNFIXED_TYPES)!;

      // TODO: Use a more precise type
      return isArray ? 'number[]' : 'number';
    } else {
      throw new Error(`Unsupported Solidity type: ${type}`);
    }
  }

  generateObjectType(components: SolABITypeDef[], nestedLevel = 0, typeOut = false) {
    const props = components.map((typeDef) => {
      const type = this.generateType(typeDef, undefined, nestedLevel + 1, typeOut);
      return {
        name: typeDef.name,
        type,
      };
    });

    if (props.length > 0 && props.at(0)!.name.length === 0) {
      return `[${props.map(({ type }) => `${type}`).join(', ')}]`;
    }

    return `{${props.map(({ name, type }) => `${name}: ${type}`).join(',\n')}}`;
  }

  addTypeImport(typeName: string | string[]) {
    if (Array.isArray(typeName)) {
      typeName.forEach((one) => this.addTypeImport(one));
      return;
    }

    if (isNativeType(typeName)) {
      return;
    }

    const re = BASIC_KNOWN_TYPES.find((re) => typeName.match(re));
    if (re) {
      const typeBase = typeName.match(re)![1];
      this.typeImports.addCodecType(typeBase);
      return;
    }

    this.typeImports.addPortableType(typeName);
  }
}
