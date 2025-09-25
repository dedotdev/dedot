import { SolAbiConstructor } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { ConstructorQueryGen } from './ConstructorQueryGen.js';

export class ConstructorTxGen extends ConstructorQueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorTx',
      'SolGenericContractApi',
      'GenericConstructorTxCall',
      'ConstructorTxOptions',
      'GenericInstantiateSubmittableExtrinsic',
      'MetadataType',
    );

    let constructor = this.findConstructor();

    const constructorsOut = this.doGenerateConstructorFragment(constructor, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(abiItem: SolAbiConstructor, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(abiItem);

    return `GenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorTxOptions) => GenericInstantiateSubmittableExtrinsic<ChainApi, ContractApi>, Type>`;
  }
}
