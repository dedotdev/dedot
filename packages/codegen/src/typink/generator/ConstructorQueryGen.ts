import { ContractConstructorMessage } from '@dedot/contracts';
import { beautifySourceCode, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class ConstructorQueryGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorQuery',
      'GenericConstructorQueryCall',
      'ConstructorCallOptions',
      'ConstructorResult',
    );

    const { constructors } = this.contractMetadata.spec;

    const constructorsOut = this.doGenerate(constructors);
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/constructor-query.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: ContractConstructorMessage): string {
    const { args } = def;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = this.generateParamsOut(args);

    return `GenericConstructorQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} options: ConstructorCallOptions) => Promise<ConstructorResult<ChainApi>>>`;
  }
}
