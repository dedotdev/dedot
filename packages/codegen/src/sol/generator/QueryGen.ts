import { normalizeLabel, SolAbi, SolAbiFunction } from '@dedot/contracts';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class QueryGen {
  constructor(
    public readonly abi: SolAbi,
    public readonly typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType(
      'GenericContractQuery',
      'GenericContractQueryCall',
      'ContractCallOptions',
      'GenericContractCallResult',
      'ContractCallResult',
      'MetadataType',
    );

    const functions = this.abi.filter((item) => item.type === 'function') as SolAbiFunction[];

    const queryCallsOut = this.doGenerate(functions, 'ContractCallOptions');
    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/query.hbs');

    return beautifySourceCode(template({ importTypes, queryCallsOut }));
  }

  doGenerate(functions: SolAbiFunction[], optionsTypeName?: string) {
    let callsOut = '';

    functions.forEach((def) => {
      const { inputs, name } = def;

      // In case there is an arg has label `options`,
      // we use the name `_options` for the last options param
      // This is just and edge case, so this approach works for now
      const optionsParamName = inputs.some(({ name }) => name === 'options') ? '_options' : 'options';

      callsOut += `${commentBlock(
        inputs.map(
          (input, idx) => `@param {${this.typesGen.generateType(input, def, 1)}} ${input.name || `arg${idx}`}`,
        ),
        optionsTypeName ? `@param {${optionsTypeName}} ${optionsParamName}` : '',
      )}`;
      callsOut += `${normalizeLabel(name)}: ${this.generateMethodDef(def, optionsParamName)};\n\n`;
    });

    return callsOut;
  }

  generateMethodDef(abiItem: SolAbiFunction, optionsParamName = 'options'): string {
    const { outputs } = abiItem;

    const paramsOut = this.generateParamsOut(abiItem);
    const typeOutInner = `${outputs.map((o) => this.typesGen.generateType(o, abiItem, 1, true)).join(',')}`;

    // If there is only one output, we don't need to wrap it in a tuple, for user-friendly
    const typeOut = outputs.length === 1 ? typeOutInner : `[${typeOutInner}]`;

    return `GenericContractQueryCall<ChainApi, (${paramsOut && `${paramsOut},`} ${optionsParamName}?: ContractCallOptions) => Promise<GenericContractCallResult<${typeOut}, ContractCallResult>>, Type>`;
  }

  generateParamsOut(abiItem: SolAbiFunction): string {
    return abiItem.inputs
      .map((input, idx) => `${input.name || `arg${idx}`}: ${this.typesGen.generateType(input, abiItem, 1)}`)
      .join(', ');
  }
}
