import { SolAbiFunction } from '@dedot/contracts';
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
      'MetadataType',
    );

    const txFunctions = this.abi.filter(
      (item) => item.type === 'function' && item.stateMutability !== 'view',
    ) as SolAbiFunction[];

    const txCallsOut = this.doGenerate(txFunctions, 'ContractTxOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/tx.hbs');

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  override generateMethodDef(abiItem: SolAbiFunction, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(abiItem);

    return `GenericContractTxCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>, Type>`;
  }
}
