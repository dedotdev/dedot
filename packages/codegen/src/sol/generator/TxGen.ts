import { SolABIFunction } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class TxGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'SolGenericContractTx',
      'SolGenericContractTxCall',
      'ContractTxOptions',
      'ContractSubmittableExtrinsic',
    );

    const txFunctions = this.abiItems.filter(
      (item) => item.type === 'function' && item.stateMutability !== 'view',
    ) as SolABIFunction[];

    const txCallsOut = this.doGenerate(txFunctions, 'ContractTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/tx.hbs');

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  override generateMethodDef(def: SolABIFunction, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def);

    return `SolGenericContractTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>>`;
  }
}
