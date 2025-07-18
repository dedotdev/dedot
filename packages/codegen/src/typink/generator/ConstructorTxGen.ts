import { ContractConstructorMessage } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class ConstructorTxGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorTx',
      'GenericConstructorTxCall',
      'ConstructorTxOptions',
      'GenericContractApi',
      'GenericInstantiateSubmittableExtrinsic',
    );

    const { constructors } = this.contractMetadata.spec;

    const constructorsOut = this.doGenerate(constructors, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: ContractConstructorMessage, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.args);

    return `GenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorTxOptions) => GenericInstantiateSubmittableExtrinsic<ChainApi, ContractApi>>`;
  }
}
