import { SolABIItem } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { ConstructorQueryGen } from './ConstructorQueryGen.js';

export class ConstructorTxGen extends ConstructorQueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorTx',
      'GenericConstructorTxCall',
      'ConstructorTxOptions',
      'GenericInstantiateSubmittableExtrinsic',
    );

    const constructorFragment = this.abiItems.find((item) => item.type === 'constructor')!;

    const constructorsOut = this.doGenerateConstructorFragment(constructorFragment, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: SolABIItem, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.inputs);

    return `GenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ConstructorTxOptions) => GenericInstantiateSubmittableExtrinsic<ChainApi>>`;
  }
}
