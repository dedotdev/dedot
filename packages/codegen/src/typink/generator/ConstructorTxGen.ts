import { GenericInkContractConstructorMessage } from '@dedot/types';
import { SmartContractApi } from '../../shared/TypeImports.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class ConstructorTxGen extends QueryGen {
  generate(useSubPaths: boolean = false, smartContractApi: SmartContractApi = SmartContractApi.ContractsApi) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorTx',
      'GenericConstructorTxCall',
      'ConstructorTxOptions',
      'GenericInstantiateSubmittableExtrinsic',
    );

    const { constructors } = this.contractMetadata.spec;

    const constructorsOut = this.doGenerate(constructors, 'ConstructorTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths, smartContractApi });
    const template = compileTemplate('typink/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: GenericInkContractConstructorMessage, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.args);

    return `GenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ConstructorTxOptions) => GenericInstantiateSubmittableExtrinsic<ChainApi>>`;
  }
}
