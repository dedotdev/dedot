import { SolAbi, SolAbiEvent } from '@dedot/contracts';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class EventsGen {
  constructor(
    public readonly abi: SolAbi,
    public readonly typesGen: TypesGen,
  ) {}

  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType('GenericContractEvents', 'GenericContractEvent', 'MetadataType');

    const events = this.abi.filter((o) => o.type === 'event') as SolAbiEvent[];

    let eventsOut = '';
    events.forEach((event) => {
      const { name, anonymous } = event;

      eventsOut += `${stringPascalCase(name)}: ${this.#generateEventDef(event)};\n\n`;
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('sol/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, eventsOut }));
  }

  #generateEventDef(abiItem: SolAbiEvent) {
    const { name } = abiItem;

    const paramsOut = this.generateParamsOut(abiItem);

    return `GenericContractEvent<'${stringPascalCase(name)}', {${paramsOut}}, Type>`;
  }

  generateParamsOut(abiItem: SolAbiEvent) {
    const { inputs } = abiItem;

    return inputs
      .map(
        (o, idx) =>
          `${commentBlock(`@indexed: ${o.indexed}`)}${stringCamelCase(o.name || `arg${idx}`)}: ${this.typesGen.generateType(o, abiItem, 1)}`,
      )
      .join(', ');
  }
}
