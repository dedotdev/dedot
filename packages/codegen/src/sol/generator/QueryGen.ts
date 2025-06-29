import { normalizeLabel, SolABIItem, SolABIFunction, SolABITypeDef } from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class QueryGen {
  abiItems: SolABIItem[];
  typesGen: TypesGen;

  constructor(abiItems: SolABIItem[], typeGen: TypesGen) {
    this.abiItems = abiItems;
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

    const functionFragments = this.abiItems.filter((item) => item.type === 'function');

    const queryCallsOut = this.doGenerate(functionFragments, 'ContractCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/query.hbs');

    return beautifySourceCode(template({ importTypes, queryCallsOut }));
  }

  doGenerate(fragments: SolABIItem[], optionsTypeName?: string) {
    let callsOut = '';

    fragments.forEach((fragmentDef) => {
      const { inputs, name } = fragmentDef as SolABIFunction;

      // In case there is an arg has label `options`,
      // we use the name `_options` for the last options param
      // This is just and edge case, so this approach works for now
      const optionsParamName = inputs.some(({ name }) => name === 'options') ? '_options' : 'options';

      callsOut += `${commentBlock(
        inputs.map((input) => `@param {${this.typesGen.generateType(input, 1)}} ${stringCamelCase(input.name)}`),
        optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
      )}`;
      callsOut += `${normalizeLabel(name)}: ${this.generateMethodDef(fragmentDef, optionsParamName)};\n\n`;
    });

    return callsOut;
  }

  generateMethodDef(def: SolABIItem, optionsParamName = 'options'): string {
    const { inputs, outputs } = def as SolABIFunction;

    const paramsOut = this.generateParamsOut(inputs);
    const typeOut = `[${outputs.map((o) => this.typesGen.generateType(o, 1, true)).join(',')}]`;

    return `GenericContractQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ContractCallOptions) => Promise<GenericContractCallResult<${typeOut}, ContractCallResult<ChainApi>>>>`;
  }

  generateParamsOut(args: SolABITypeDef[]) {
    return args.map((arg) => `${stringCamelCase(arg.name)}: ${this.typesGen.generateType(arg, 1)}`).join(', ');
  }
}
