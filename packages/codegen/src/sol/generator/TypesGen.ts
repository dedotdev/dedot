import { SolABIItem, SolABITypeDef } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/TypeImports.js';
import { beautifySourceCode, compileTemplate, isNativeType } from '../../utils.js';

const NUMBER_TYPES = /^(u?int(8|16|32)?)$/;
const BIGINT_TYPES = /^(u?int(64|128|256))$/;
const NUMBER_ARRAY_TYPES = /^(u?int(8|16|32)\[])$/;
const BIGINT_ARRAY_TYPES = /^(u?int(64|128|256)\[])$/;

const ARRAY_WITH_SIZE = /^(u?int(8|16|32|64|128|256)\[(\d+)])$/;
const BYTES_TYPES = /^bytes([1-9]|[12]\d|3[0-2])?$/;

const SUPPORTED_SOLIDITY_TYPES = [
  NUMBER_ARRAY_TYPES,
  BIGINT_ARRAY_TYPES,
  NUMBER_TYPES,
  BIGINT_TYPES,
  ARRAY_WITH_SIZE,
  BYTES_TYPES,
  'string',
  'bool',
  'address',
  'tuple',
  'function',
];

export const BASIC_KNOWN_TYPES = [/^H160$/, /^FixedBytes<(\d+)>$/, /FixedArray/];

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

    if (type.match(NUMBER_TYPES)) {
      return 'number';
    } else if (type.match(BIGINT_TYPES)) {
      return 'bigint';
    } else if (type.match(NUMBER_ARRAY_TYPES)) {
      return 'number[]';
    } else if (type.match(BIGINT_ARRAY_TYPES)) {
      return 'bigint[]';
    } else if (type.match(ARRAY_WITH_SIZE)) {
      const [_, bits, size] = type.match(ARRAY_WITH_SIZE)!;

      console.log(bits, size);
      return 'number[]';
    } else if (type.match(BYTES_TYPES)) {
      const [_, n] = type.match(BYTES_TYPES)!;

      console.log(n);
      return `FixedBytes<${n}>`;
    } else if (type === 'bool') {
      return 'boolean';
    } else if (type === 'string') {
      return 'string';
    } else if (type === 'tuple') {
      const { components = [] } = typeDef;

      if (components.length === 0) {
        return '{}';
      } else {
        return this.generateObjectType(components, nestedLevel + 1, typeOut);
      }
    } else if (type === 'address') {
      return typeOut ? 'H160' : 'string';
    } else if (type === 'function') {
      // Ref: https://docs.soliditylang.org/en/latest/abi-spec.html#:~:text=function%3A%20an%20address%20(20%20bytes)%20followed%20by%20a%20function%20selector%20(4%20bytes).%20Encoded%20identical%20to%20bytes24.
      return `FixedBytes<24>`;
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

    if (BASIC_KNOWN_TYPES.some((re) => typeName.match(re))) {
      this.typeImports.addCodecType(typeName);
      return;
    }

    this.typeImports.addPortableType(typeName);
  }
}
