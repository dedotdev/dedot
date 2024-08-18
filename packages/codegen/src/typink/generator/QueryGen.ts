import { ContractMetadata, ContractMessage, normalizeLabel, ContractMessageArg } from '@dedot/contracts';
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
      const optionsParamName = args.some(({ label }) => stringCamelCase(label) === 'options') ? '_options' : 'options';
      callsOut += `${commentBlock(
        docs,
        '\n',
        args.map((arg) => `@param {${this.typesGen.generateType(arg.type.type, 1)}} ${stringCamelCase(arg.label)}`),
        optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
        '\n',
        `@selector ${selector}`,
      )}`;
      callsOut += `${normalizeLabel(label)}: ${this.generateMethodDef(messageDef, optionsParamName)};\n\n`;
    });

    return callsOut;
  }

  generateMethodDef(def: ContractMessage, optionsParamName = 'options'): string {
    const { args, returnType } = def;

    const paramsOut = this.generateParamsOut(args);
    const typeOutRaw = this.typesGen.generateType(returnType.type, 0, true);

    // Unwrap langError result
    const typeOut = typeOutRaw.match(/^(\w+)<(.*), (.*)>$/)!.at(2);

    return `GenericContractQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ContractCallOptions) => Promise<GenericContractCallResult<${typeOut}, ContractCallResult<ChainApi>>>>`;
  }

  generateParamsOut(args: ContractMessageArg[]) {
    return args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');
  }
}
