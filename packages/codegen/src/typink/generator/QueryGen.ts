import {
  normalizeContractTypeDef,
  ContractMetadata,
  ContractMessage,
  normalizeLabel,
  ContractMessageArg,
} from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class QueryGen {
  contractMetadata: ContractMetadata;
  typesGen: TypesGen;

  constructor(contractMetadata: ContractMetadata, typeGen: TypesGen) {
    this.contractMetadata = contractMetadata;
    this.typesGen = typeGen;
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericContractQuery',
      'GenericContractQueryCall',
      'ContractCallOptions',
      'GenericContractCallResult',
      'ContractCallResult',
    );

    const { messages } = this.contractMetadata.spec;

    const queryCallsOut = this.doGenerate(messages, 'ContractCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/query.hbs');

    return beautifySourceCode(template({ importTypes, queryCallsOut }));
  }

  doGenerate(messages: ContractMessage[], optionsTypeName?: string) {
    let callsOut = '';

    messages.forEach((messageDef) => {
      const { label, docs, selector, args } = messageDef;
      callsOut += `${commentBlock(
        docs,
        '\n',
        args.map((arg) => `@param {${this.typesGen.generateType(arg.type.type, 1)}} ${stringCamelCase(arg.label)}`),
        optionsTypeName ? `@param {${optionsTypeName}} options` : '',
        '\n',
        `@selector ${selector}`,
      )}`;
      callsOut += `${normalizeLabel(label)}: ${this.generateMethodDef(messageDef)};\n\n`;
    });

    return callsOut;
  }

  generateMethodDef(def: ContractMessage): string {
    const { args, returnType } = def;

    this.importType(returnType.type);
    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = this.generateParamsOut(args);
    const typeOut = this.typesGen.generateType(returnType.type, 0, true);

    return `GenericContractQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} options: ContractCallOptions) => Promise<GenericContractCallResult<${typeOut}, ContractCallResult<ChainApi>>>>`;
  }

  generateParamsOut(args: ContractMessageArg[]) {
    return args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');
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
