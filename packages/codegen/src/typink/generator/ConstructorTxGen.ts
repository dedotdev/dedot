import { ContractConstructorMessage, ContractMetadata } from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';
import { TypesGen } from './TypesGen.js';

export class ConstructorTxGen extends QueryGen {
  constructor(contractMetadata: ContractMetadata, typeGen: TypesGen) {
    super(contractMetadata, typeGen);
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addContractType(
      'GenericConstructorTx',
      'GenericConstructorTxCall',
      'ConstructorTxOptions',
      'GenericConstructorSubmittableExtrinsic',
    );

    const { constructors } = this.contractMetadata.spec;

    let constructorsOut = '';
    constructors.forEach((constructorDef) => {
      const { label, docs, selector, args } = constructorDef;
      constructorsOut += `${commentBlock(
        docs,
        '\n',
        args.map((arg) => `@param {${this.typesGen.generateType(arg.type.type, 1)}} ${stringCamelCase(arg.label)}`),
        '\n',
        `@selector {${selector}}`,
      )}`;
      constructorsOut += `${stringCamelCase(label.replaceAll('::', '_'))}: ${this.#generateMethodDef(constructorDef)};\n\n`;
      this.#generateMethodDef(constructorDef);
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/constructor-tx.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  #generateMethodDef(def: ContractConstructorMessage): string {
    const { args, returnType } = def;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');

    return `GenericConstructorTxCall<ChainApi, (${paramsOut && `${paramsOut},`} options: ConstructorTxOptions) => GenericConstructorSubmittableExtrinsic<ChainApi>>`;
  }
}
