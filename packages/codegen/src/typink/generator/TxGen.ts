import { Message } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class TxGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addContractType(
      'GenericContractTx',
      'GenericContractTxCall',
      'ContractTxOptions',
      'ChainSubmittableExtrinsic',
    );

    const { messages } = this.contractMetadata.spec;
    const txMessages = messages.filter((one) => one.mutates);

    const txCallsOut = this.doGenerate(txMessages);
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/tx.hbs');

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  override generateMethodDef(def: Message): string {
    const { args } = def;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = this.generateParamsOut(args);

    return `GenericContractTxCall<ChainApi, (${paramsOut && `${paramsOut},`} options: ContractTxOptions) => ChainSubmittableExtrinsic<ChainApi>>`;
  }
}
