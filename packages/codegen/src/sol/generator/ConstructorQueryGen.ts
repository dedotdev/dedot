import { TypesGen } from '@dedot/codegen/sol/generator/TypesGen';
import { SolAbi, SolAbiConstructor } from '@dedot/contracts';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';

export class ConstructorQueryGen {
  constructor(
    public readonly abi: SolAbi,
    public readonly typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericConstructorQuery',
      'GenericConstructorQueryCall',
      'GenericConstructorCallResult',
      'ConstructorCallOptions',
      'ContractInstantiateResult',
      'MetadataType',
    );

    let constructor = this.findConstructor();

    const constructorsOut = this.doGenerateConstructorFragment(constructor, 'ConstructorCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/constructor-query.hbs');

    return beautifySourceCode(template({ importTypes, constructorsOut }));
  }

  doGenerateConstructorFragment(abiItem: SolAbiConstructor, optionsTypeName?: string) {
    let callsOut = '';

    const { inputs = [] } = abiItem;

    // In case there is an arg has label `options`,
    // we use the name `_options` for the last options param
    // This is just and edge case, so this approach works for now
    const optionsParamName = inputs.some(({ name }) => name === 'options') ? '_options' : 'options';

    callsOut += `${commentBlock(
      inputs.map(
        (input, idx) =>
          `@param {${this.typesGen.generateType(input, abiItem, 1)}} ${input.name || `arg${idx}`}`,
      ),
      optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
    )}`;
    callsOut += `new: ${this.generateMethodDef(abiItem, optionsParamName)};\n\n`;

    return callsOut;
  }

  generateMethodDef(abiItem: SolAbiConstructor, optionsParamName = 'options'): string {
    const paramsOut = this.generateParamsOut(abiItem);

    return `GenericConstructorQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ConstructorCallOptions) => Promise<GenericConstructorCallResult<[], ContractInstantiateResult<ChainApi>>>, Type>`;
  }

  generateParamsOut(abiItem: SolAbiConstructor): string {
    return abiItem.inputs
      .map((input, idx) => `${input.name || `arg${idx}`}: ${this.typesGen.generateType(input, abiItem, 1)}`)
      .join(', ');
  }

  protected findConstructor(): SolAbiConstructor {
    let constructor = this.abi.find((item) => item.type === 'constructor');

    // Fallback to default constructor
    if (!constructor) {
      constructor = {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      };
    }

    return constructor as SolAbiConstructor;
  }
}
