import { ContractMessage } from '@dedot/contracts';
import { SmartContractApi } from '../../shared/TypeImports.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class TxGen extends QueryGen {
  generate(useSubPaths: boolean = false, smartContractApi: SmartContractApi = SmartContractApi.ContractsApi) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericContractTx',
      'GenericContractTxCall',
      'ContractTxOptions',
      'ContractSubmittableExtrinsic',
    );

    const { messages } = this.contractMetadata.spec;
    const txMessages = messages.filter((one) => one.mutates);

    const txCallsOut = this.doGenerate(txMessages, 'ContractTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths, smartContractApi });
    const template = compileTemplate('typink/templates/tx.hbs');

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  override generateMethodDef(def: ContractMessage, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.args);

    return `GenericContractTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>>`;
  }
}
