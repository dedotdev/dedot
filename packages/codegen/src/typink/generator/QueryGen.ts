import { normalizeContractTypeDef } from '@dedot/contracts';
import { ContractMetadata, ContractMessage } from '@dedot/types';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils';
import { TypeGen } from './TypeGen';

export class QueryGen {
  contractMetadata: ContractMetadata;
  typesGen: TypeGen;

  constructor(contractMetadata: ContractMetadata, typeGen: TypeGen) {
    this.contractMetadata = contractMetadata;
    this.typesGen = typeGen;
  }

  generate() {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addCodecType('AccountIdLike');
    this.typesGen.typeImports.addKnownType(
      'GenericSubstrateApi',
      'GenericContractQuery',
      'GenericContractQueryCall',
      'ContractOptions',
      'GenericContractResult',
      'ContractResult',
    );

    const { messages } = this.contractMetadata.spec;

    let queryCallsOut = '';
    messages.forEach((queryDef) => {
      const { label, docs, selector, args } = queryDef;
      queryCallsOut += `${commentBlock(
        docs,
        '\n',
        args.map((arg) => `@param {${this.typesGen.generateType(arg.type.type, 1)}} ${stringCamelCase(arg.label)}`),
        '\n',
        `@selector {${selector}}`,
      )}`;
      queryCallsOut += `${stringCamelCase(label.replaceAll('::', '_'))}: ${this.#generateMethodDef(queryDef)};\n\n`;

      this.#generateMethodDef(queryDef);
    });

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('contracts-query.hbs');

    return beautifySourceCode(template({ importTypes, queryCallsOut }));
  }

  #generateMethodDef(def: ContractMessage) {
    const { args, returnType } = def;

    this.importType(returnType.type);
    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');

    const typeOut = this.typesGen.generateType(returnType.type, 0, true);

    return `GenericContractQueryCall<(${paramsOut ? `${paramsOut},` : ''} caller?: AccountIdLike, options?: ContractOptions) => Promise<GenericContractResult<${typeOut}, ContractResult<ChainApi>>>>`;
  }

  importType(typeId: number): any {
    const type = this.contractMetadata.types[typeId];
    const def = normalizeContractTypeDef(this.contractMetadata.types[typeId].type.def);

    if (this.typesGen.includedTypes[type.id]) {
      this.typesGen.addTypeImport(this.typesGen.includedTypes[type.id].name);
      return;
    }
    const { tag, value } = def;

    switch (tag) {
      case 'Compact':
      case 'Primitive':
      case 'BitSequence':
        return;
      case 'Struct':
        return value.fields.forEach(({ typeId }) => this.importType(typeId));
      case 'Enum':
        return value.members.forEach(({ fields }) => fields.map(({ typeId }) => this.importType(typeId)).flat());
      case 'Tuple':
        return value.fields.forEach((typeId) => this.importType(typeId));
      case 'SizedVec':
        return this.importType(value.typeParam);
      case 'Sequence':
        return this.importType(value.typeParam);
    }
  }
}
