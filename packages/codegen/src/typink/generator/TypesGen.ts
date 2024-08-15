import { TypeId } from '@dedot/codecs';
import { ContractMessage, ContractMetadata, extractContractTypes, normalizeContractTypeDef } from '@dedot/contracts';
import { BaseTypesGen } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const SKIP_TYPES = ['Result', 'Option'];

export class TypesGen extends BaseTypesGen {
  constructor(public contractMetadata: ContractMetadata) {
    super(extractContractTypes(contractMetadata), SKIP_TYPES);
    this.includedTypes = this.includeTypes();
  }

  generate(useSubPaths: boolean = false): Promise<string> {
    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ nameOut, name, id }) => {
        defTypeOut += `export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.shouldGenerateTypeIn(id)) {
          defTypeOut += `export type ${name} = ${this.generateType(id, 0)};\n\n`;
        }
      });

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types'], useSubPaths });
    const template = compileTemplate('typink/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  override shouldGenerateTypeIn(id: TypeId): boolean {
    const { messages, constructors } = this.contractMetadata.spec;

    const idInParameters = (messages: ContractMessage[]) => {
      for (let message of messages) {
        // prettier-ignore
        const isIn = message.args.reduce(
          (a, { type: { type: typeId } }) => a || this.#typeDependOn(typeId, id),
          false,
        );

        if (isIn) return true;
      }

      return false;
    };

    return (idInParameters(messages) || idInParameters(constructors)) && this.#includeKnownTypes(id);
  }

  #includeKnownTypes(typeA: TypeId): boolean {
    if (this.knownTypes.has(typeA)) return true;

    const { types } = this.contractMetadata;
    const defA = normalizeContractTypeDef(types[typeA].type.def);
    const { type, value } = defA;

    switch (type) {
      case 'Struct':
        return value.fields.some(({ typeId }) => this.#includeKnownTypes(typeId));
      case 'Enum':
        return value.members.some(({ fields }) => fields.some(({ typeId }) => this.#includeKnownTypes(typeId)));
      case 'Tuple':
        return value.fields.some((typeId) => this.#includeKnownTypes(typeId));
      case 'Sequence':
      case 'SizedVec':
        const $innerType = this.types[value.typeParam].typeDef;
        if ($innerType.type === 'Primitive' && $innerType.value.kind === 'u8') {
          return true; // ByteLikes
        } else {
          return this.#includeKnownTypes(value.typeParam);
        }
      case 'Primitive':
      case 'Compact':
      case 'BitSequence':
        return false;
    }
  }

  // Find out does typeA depends on typeB
  #typeDependOn(typeA: TypeId, typeB: TypeId): boolean {
    if (typeA === typeB) return true;

    const { types } = this.contractMetadata;
    const defA = normalizeContractTypeDef(types[typeA].type.def);
    const { type, value } = defA;

    // prettier-ignore
    switch (type) {
      case 'Struct':
        return value.fields.reduce(
          (a, { typeId }) => a || this.#typeDependOn(typeId, typeB),
          false,
        );
      case 'Enum':
        return value.members.reduce(
          (a, { fields }) => a || fields.reduce((a, { typeId }) => a || this.#typeDependOn(typeId, typeB), false),
          false,
        );
      case 'Tuple':
        return value.fields.reduce(
          (a, typeId) => a || this.#typeDependOn(typeId, typeB),
          false,
        );
      case 'Sequence':
      case 'SizedVec':
        return this.#typeDependOn(value.typeParam, typeB);
      case 'Primitive':
      case 'Compact':
      case 'BitSequence':
        return false;
    }
  }
}
