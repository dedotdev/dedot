import { TypeId } from '@dedot/codecs';
import {
  ContractMessage,
  ContractMetadata,
  extractContractTypes,
  isLazyType,
  KnownLazyType,
  normalizeContractTypeDef,
} from '@dedot/contracts';
import { BaseTypesGen } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

const SKIP_TYPES = ['Result', 'Option'];

export class TypesGen extends BaseTypesGen {
  constructor(public contractMetadata: ContractMetadata) {
    super(extractContractTypes(contractMetadata), SKIP_TYPES);
    this.includedTypes = this.calculateIncludedTypes();
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

    const importTypes = this.typeImports.toImports({ excludeModules: ['./types.js'], useSubPaths });
    const template = compileTemplate('typink/templates/types.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  generateType(typeId: TypeId, nestedLevel = 0, typeOut = false): string {
    const types = this.contractMetadata.types;
    const typeDef = types.find(({ id }) => id == typeId)!;

    const generatedType = super.generateType(typeId, nestedLevel, typeOut);

    if (nestedLevel > 0) {
      const lazyType = isLazyType(typeDef.type.path);

      if (lazyType === KnownLazyType.LAZY) {
        const ValueType = super.generateType(typeDef.type.params![0].type, 1, true);

        return `{ get(): Promise<${ValueType} | undefined> }`;
      } else if (lazyType === KnownLazyType.MAPPING) {
        const KeyType = super.generateType(typeDef.type.params![0].type, 1);
        const ValueType = super.generateType(typeDef.type.params![1].type, 1, true);

        return `{ get(arg: ${KeyType}): Promise<${ValueType} | undefined> }`;
      } else if (lazyType === KnownLazyType.STORAGE_VEC) {
        const ValueType = super.generateType(typeDef.type.params![0].type, 1, true);

        return `{ len(): Promise<number>; get(index: number): Promise<${ValueType} | undefined> }`;
      }
    }

    return generatedType;
  }

  override shouldGenerateTypeIn(id: TypeId): boolean {
    const { messages, constructors } = this.contractMetadata.spec;

    return (
      (this.#idInParameters(id, messages) || this.#idInParameters(id, constructors)) && this.#includeKnownTypes(id)
    );
  }

  #idInParameters(id: TypeId, messages: ContractMessage[]): boolean {
    for (let message of messages) {
      // prettier-ignore
      const isIn = message.args.reduce(
          (a, {type: {type: typeId}}) => a || this.#typeDependOn(typeId, id),
          false,
      );

      if (isIn) return true;
    }

    return false;
  }

  // Find out does type depends on known types
  //
  // Example:
  // type TypeA = Struct { field: AccountId } => includeKnownTypes(TypeA) === true
  // type TypeA = Struct { field: TypeB }; type TypeB = Struct { field: AccountId, type: TypeA } => includeKnownTypes(TypeA) === true
  //
  // `checked` is used to prevent circular dependencies
  #includeKnownTypes(typeId: TypeId, checked: Set<TypeId> = new Set<TypeId>()): boolean {
    // Return `false` because `typeId` is already checked
    // If it were a known type, the first check would have returned `true`.
    if (checked.has(typeId)) return false;
    if (this.knownTypes[typeId]) return true;

    checked.add(typeId);

    const { types } = this.contractMetadata;
    const defA = normalizeContractTypeDef(types[typeId].type.def);
    const { type, value } = defA;

    switch (type) {
      case 'Struct':
        return value.fields.some(({ typeId }) => this.#includeKnownTypes(typeId, checked));
      case 'Enum':
        return value.members.some(({ fields }) =>
          fields.some(({ typeId }) => this.#includeKnownTypes(typeId, checked)),
        );
      case 'Tuple':
        return value.fields.some((typeId) => this.#includeKnownTypes(typeId, checked));
      case 'Sequence':
      case 'SizedVec':
      case 'Compact':
        const $innerType = this.types[value.typeParam].typeDef;
        if ($innerType.type === 'Primitive' && $innerType.value.kind === 'u8') {
          return true; // ByteLikes
        } else {
          return this.#includeKnownTypes(value.typeParam, checked);
        }
      case 'Primitive':
      case 'BitSequence':
        return false;
    }
  }

  // Find out does typeA depends on typeB
  //
  // Example:
  // type TypeA = Struct { field: TypeB } => typeDependOn(TypeA, TypeB) === true
  // type TypeA = Struct { field: TypeB }; type TypeB = Struct { field: TypeA } => typeDependOn(TypeA, TypeB) === true
  //
  // `checked` is used to prevent circular dependencies
  #typeDependOn(typeA: TypeId, typeB: TypeId, checked: Set<TypeId> = new Set<TypeId>()): boolean {
    if (checked.has(typeA)) return false;
    if (typeA === typeB) return true;

    checked.add(typeA);

    const { types } = this.contractMetadata;
    const defA = normalizeContractTypeDef(types[typeA].type.def);
    const { type, value } = defA;

    // prettier-ignore
    switch (type) {
      case 'Struct':
        return value.fields.reduce(
            (a, {typeId}) => a || this.#typeDependOn(typeId, typeB, checked),
            false,
        );
      case 'Enum':
        return value.members.reduce(
            (a, {fields}) => a || fields.reduce((a, {typeId}) => a || this.#typeDependOn(typeId, typeB, checked), false),
            false,
        );
      case 'Tuple':
        return value.fields.reduce(
            (a, typeId) => a || this.#typeDependOn(typeId, typeB, checked),
            false,
        );
      case 'Sequence':
      case 'SizedVec':
      case 'Compact':
        return this.#typeDependOn(value.typeParam, typeB, checked);
      case 'Primitive':
      case 'BitSequence':
        return false;
    }
  }
}
