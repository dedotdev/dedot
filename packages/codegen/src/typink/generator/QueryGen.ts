import { GenericInkContractMetadata, GenericInkContractMessage, GenericInkContractMessageArg } from '@dedot/types';
import { stringCamelCase, normalizeLabel } from '@dedot/utils';
import { SmartContractApi } from '../../shared/TypeImports.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class QueryGen {
  contractMetadata: GenericInkContractMetadata;
  typesGen: TypesGen;

  constructor(contractMetadata: GenericInkContractMetadata, typeGen: TypesGen) {
    this.contractMetadata = contractMetadata;
    this.typesGen = typeGen;
  }

  generate(useSubPaths: boolean = false, smartContractApi: SmartContractApi = SmartContractApi.ContractsApi) {
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
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths, smartContractApi });
    const template = compileTemplate('typink/templates/query.hbs');

    return beautifySourceCode(template({ importTypes, queryCallsOut }));
  }

  doGenerate(messages: GenericInkContractMessage[], optionsTypeName?: string) {
    let callsOut = '';

    messages.forEach((messageDef) => {
      const { label, docs, selector, args } = messageDef;

      // In case there is an arg has label `options`,
      // we use the name `_options` for the last options param
      // This is just and edge case, so this approach works for now
      const optionsParamName = args.some(({ label }) => label === 'options') ? '_options' : 'options';

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

  generateMethodDef(def: GenericInkContractMessage, optionsParamName = 'options'): string {
    const { args, returnType } = def;

    const paramsOut = this.generateParamsOut(args);
    const typeOutRaw = this.typesGen.generateType(returnType.type, 0, true);

    // Unwrap langError result
    const typeOut = typeOutRaw.match(/^(\w+)<(.*), (.*)>$/)!.at(2);

    return `GenericContractQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ContractCallOptions) => Promise<GenericContractCallResult<${typeOut}, ContractCallResult<ChainApi>>>>`;
  }

  generateParamsOut(args: GenericInkContractMessageArg[]) {
    return args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');
  }
}
