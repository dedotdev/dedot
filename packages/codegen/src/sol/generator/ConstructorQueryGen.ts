import { SolABIConstructor, SolABIItem } from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class ConstructorQueryGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorQuery',
      'GenericConstructorQueryCall',
      'GenericConstructorCallResult',
      'ConstructorCallOptions',
      'ContractInstantiateResult',
    );

    const constructorFragment = this.abiItems.find((item) => item.type === 'constructor')!;

    const constructorsOut = this.doGenerateConstructorFragment(constructorFragment, 'ConstructorCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-query.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  doGenerateConstructorFragment(constructorFragment: SolABIConstructor, optionsTypeName?: string) {
    let callsOut = '';

    const { inputs } = constructorFragment;

    // In case there is an arg has label `options`,
    // we use the name `_options` for the last options param
    // This is just and edge case, so this approach works for now
    const optionsParamName = inputs.some(({ name }) => name === 'options') ? '_options' : 'options';

    callsOut += `${commentBlock(
      inputs.map((input) => `@param {${this.typesGen.generateType(input, 1)}} ${stringCamelCase(input.name)}`),
      optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
    )}`;
    callsOut += `initialize: ${this.generateMethodDef(constructorFragment, optionsParamName)};\n\n`;

    return callsOut;
  }

  override generateMethodDef(def: SolABIItem, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.inputs);

    return `GenericConstructorQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorCallOptions) => Promise<GenericConstructorCallResult<[], ContractInstantiateResult<ChainApi>>>>`;
  }
}
