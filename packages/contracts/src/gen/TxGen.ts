import { ContractMessage, ContractMetadata } from '../types';
import { TypeGen } from './TypeGen';
import { beautifySourceCode, commentBlock, compileTemplate } from '@dedot/codegen';
import { stringCamelCase } from '@dedot/utils';
import path from 'path';
import process from 'process';
import { QueryGen } from './QueryGen';

export class TxGen extends QueryGen {
  constructor(contractMetadata: ContractMetadata, typeGen: TypeGen) {
    super(contractMetadata, typeGen);
  }

  generate() {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addOutType(
      'GenericContractTx',
      'GenericContractTxCall',
      'ContractOptions',
      'ChainSubmittableExtrinsic',
    );

    const { messages } = this.contractMetadata.spec;
    const txMessages = messages.filter((one) => one.mutates);

    let txCallsOut = '';
    txMessages.forEach((txDef) => {
      const { label, docs, selector, args } = txDef;
      txCallsOut += `${commentBlock(
        docs,
        '\n',
        args.map((arg) => `@param {${this.typesGen.generateType(arg.type.type)}} ${stringCamelCase(arg.label)}`),
        '\n',
        `@selector {${selector}}`,
      )}`;
      txCallsOut += `${stringCamelCase(label.replaceAll('::', '_'))}: ${this.#generateMethodDef(txDef)};\n\n`;
      this.#generateMethodDef(txDef);
    });

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('tx.hbs', path.resolve(process.cwd(), 'packages/contracts/src/gen'));

    return beautifySourceCode(template({ importTypes, txCallsOut }));
  }

  #generateMethodDef(def: ContractMessage) {
    const { args, returnType } = def;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type)}`)
      .join(', ');

    return `GenericContractTxCall<(${paramsOut ? `${paramsOut},` : ''} options: ContractOptions) => ChainSubmittableExtrinsic>`;
  }
}
