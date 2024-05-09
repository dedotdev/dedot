import { ContractConstructor, ContractMetadata } from '@dedot/contracts';
import { stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';
import { TypesGen } from './TypesGen.js';

export class ConstructorGen extends QueryGen {
  constructor(contractMetadata: ContractMetadata, typeGen: TypesGen) {
    super(contractMetadata, typeGen);
  }

  generate() {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addContractType(
      'GenericContractTx',
      'GenericContractTxCall',
      'ConstructorOptions',
      'ChainSubmittableExtrinsic',
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

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('typink/templates/constructor.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  #generateMethodDef(def: ContractConstructor): string {
    const { args, returnType } = def;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = args
      .map(({ type: { type }, label }) => `${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1)}`)
      .join(', ');

    return `GenericContractTxCall<(${paramsOut ? `${paramsOut},` : ''} options: ConstructorOptions) => ChainSubmittableExtrinsic<ChainApi>>`;
  }
}
