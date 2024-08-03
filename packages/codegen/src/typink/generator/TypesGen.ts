import { TypeId } from '@dedot/codecs';
import { ContractMessage, ContractMetadata, extractContractTypes, normalizeContractTypeDef } from '@dedot/contracts';
import { BaseTypesGen } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const SKIP_TYPES = ['Result', 'Option'];

export class TypesGen extends BaseTypesGen {
  contractMetadata: ContractMetadata;

  constructor(contractMetadata: ContractMetadata) {
    super(extractContractTypes(contractMetadata));
    this.contractMetadata = contractMetadata;
    this.skipTypes = SKIP_TYPES;
    this.includedTypes = this.includeTypes();
  }

  generate(useSubPaths: boolean = false): Promise<string> {
    let defTypeOut = '';

    Object.values(this.includedTypes)
      .filter(({ skip, knownType }) => !(skip || knownType))
      .forEach(({ nameOut, name, id }) => {
        defTypeOut += `export type ${nameOut} = ${this.generateType(id, 0, true)};\n\n`;

        if (this.shouldGenerateTypeIn(id)) {
          console.log(id);
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
        const { args } = message;

        const result = args.reduce((a, { type: { type: typeId } }) => a || this.#typeDependOn(typeId, id), false);

        if (result) {
          return true;
        }
      }

      return false;
    };

    return idInParameters(messages) || idInParameters(constructors);
  }

  #typeDependOn(typeA: TypeId, typeB: TypeId): boolean {
    if (typeA === typeB) return true;

    const { types } = this.contractMetadata;
    const defA = normalizeContractTypeDef(types[typeA].type.def);
    const { type, value } = defA;

    switch (type) {
      case 'Struct':
        return value.fields.reduce((a, { typeId }) => a || this.#typeDependOn(typeId, typeB), false);
      case 'Enum':
        return value.members.reduce(
          (a, { fields }) => a || fields.reduce((a, { typeId }) => a || this.#typeDependOn(typeId, typeB), false),
          false,
        );
      case 'Tuple':
        return value.fields.reduce((a, typeId) => a || this.#typeDependOn(typeId, typeB), false);
      case 'Sequence':
        return this.#typeDependOn(value.typeParam, typeB);
      case 'SizedVec':
        return this.#typeDependOn(value.typeParam, typeB);
      case 'Primitive':
      case 'Compact':
      case 'BitSequence':
        return false;
    }
  }
}
