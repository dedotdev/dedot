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
      'GenericConstructorCallResult',
      'ConstructorCallOptions',
      'ContractInstantiateResult',
    );

    const { constructors } = this.contractMetadata.spec;

    const constructorsOut = this.doGenerate(constructors, 'ConstructorCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/constructor-query.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  override generateMethodDef(def: ContractConstructorMessage, optionsParamName = 'options'): string {
    const { args, returnType } = def;

    const paramsOut = this.generateParamsOut(args);
    const typeOutRaw = this.typesGen.generateType(returnType.type, 0, true);

    // Unwrap langError result
    const typeOut = typeOutRaw.match(/^(\w+)<(.*), (.*)>$/)!.at(2);

    return `GenericConstructorQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}: ConstructorCallOptions) => Promise<GenericConstructorCallResult<${typeOut}, ContractInstantiateResult<ChainApi>>>>`;
  }
}
