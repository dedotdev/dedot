import { SolABIItem } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class TxGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericContractTx',
      'GenericContractTxCall',
      'ContractTxOptions',
      'ContractSubmittableExtrinsic',
    );

    const txFragments = this.abiItems.filter((item) => item.type === 'function' && item.stateMutability !== 'view');

    const txCallsOut = this.doGenerate(txFragments, 'ContractTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/tx.hbs');

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  override generateMethodDef(def: SolABIItem, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(def.inputs);

    return `GenericContractTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>>`;
  }
}
