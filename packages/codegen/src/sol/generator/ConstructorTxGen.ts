import { SolABIConstructor } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { ConstructorQueryGen } from './ConstructorQueryGen.js';

export class ConstructorTxGen extends ConstructorQueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'SolGenericConstructorTx',
      'SolGenericConstructorTxCall',
      'ConstructorTxOptions',
      'SolGenericInstantiateSubmittableExtrinsic',
    );

    const constructor = this.abiItems.find((item) => item.type === 'constructor') as SolABIConstructor;

    const constructorsOut = this.doGenerateConstructorFragment(constructor, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: SolABIConstructor, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def);

    return `SolGenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ConstructorTxOptions) => SolGenericInstantiateSubmittableExtrinsic<ChainApi>>`;
  }
}
