import { TypesGen } from '@dedot/codegen/sol/generator/TypesGen';
import { SolABIConstructor, SolABIItem } from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';

export class ConstructorQueryGen {
  abiItems: SolABIItem[];
  typesGen: TypesGen;

  constructor(abiItems: SolABIItem[], typeGen: TypesGen) {
    this.abiItems = abiItems;
    this.typesGen = typeGen;
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'SolGenericConstructorQuery',
      'SolGenericConstructorQueryCall',
      'GenericConstructorCallResult',
      'ConstructorCallOptions',
      'ContractInstantiateResult',
    );

    const constructor = this.abiItems.find((item) => item.type === 'constructor') as SolABIConstructor;

    const constructorsOut = this.doGenerateConstructorFragment(constructor, 'ConstructorCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-query.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  doGenerateConstructorFragment(abiItem: SolABIConstructor, optionsTypeName?: string) {
    let callsOut = '';

    const { inputs } = abiItem;

    // In case there is an arg has label `options`,
    // we use the name `_options` for the last options param
    // This is just and edge case, so this approach works for now
    const optionsParamName = inputs.some(({ name }) => name === 'options') ? '_options' : 'options';

    callsOut += `${commentBlock(
      inputs.map((input) => `@param {${this.typesGen.generateType(input, abiItem, 1)}} ${stringCamelCase(input.name)}`),
      optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
    )}`;
    callsOut += `initialize: ${this.generateMethodDef(abiItem, optionsParamName)};\n\n`;

    return callsOut;
  }

  generateMethodDef(abiItem: SolABIConstructor, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(abiItem);

    return `SolGenericConstructorQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorCallOptions) => Promise<GenericConstructorCallResult<[], ContractInstantiateResult<ChainApi>>>>`;
  }

  generateParamsOut(abiItem: SolABIConstructor): string {
    return abiItem.inputs
      .map((input) => `${stringCamelCase(input.name)}: ${this.typesGen.generateType(input, abiItem, 1)}`)
      .join(', ');
  }
}
