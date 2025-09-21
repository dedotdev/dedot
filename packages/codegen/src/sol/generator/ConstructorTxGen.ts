import { SolABIConstructor } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { ConstructorQueryGen } from './ConstructorQueryGen.js';

export class ConstructorTxGen extends ConstructorQueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'SolGenericConstructorTx',
      'SolGenericContractApi',
      'SolGenericConstructorTxCall',
      'ConstructorTxOptions',
      'SolGenericInstantiateSubmittableExtrinsic',
    );

    let constructor = this.abiItems.find((item) => item.type === 'constructor') as SolABIConstructor;
    if (!constructor) {
      // fallback to default constructor
      constructor = {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      };
    }

    const constructorsOut = this.doGenerateConstructorFragment(constructor, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(abiItem: SolABIConstructor, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(abiItem);

    return `SolGenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorTxOptions) => SolGenericInstantiateSubmittableExtrinsic<ChainApi, ContractApi>>`;
  }
}
