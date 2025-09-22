import { SolABIEvent, SolABIItem } from '@dedot/contracts';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { TypesGen } from './TypesGen.js';

export class EventsGen {
  abiItems: SolABIItem[];
  typesGen: TypesGen;

  constructor(abiItems: SolABIItem[], typeGen: TypesGen) {
    this.abiItems = abiItems;
    this.typesGen = typeGen;
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType('SolGenericContractEvents', 'SolGenericContractEvent');

    const events = this.abiItems.filter((o) => o.type === 'event') as SolABIEvent[];

    let eventsOut = '';
    events.forEach((event) => {
      const { name, anonymous } = event;

      eventsOut += `${stringPascalCase(name)}: ${this.#generateEventDef(event)};\n\n`;
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, eventsOut }));
  }

  #generateEventDef(abiItem: SolABIEvent) {
    const { name } = abiItem;

    const paramsOut = this.generateParamsOut(abiItem);

    return `SolGenericContractEvent<'${stringPascalCase(name)}', {${paramsOut}}>`;
  }

  generateParamsOut(abiItem: SolABIEvent) {
    const { inputs } = abiItem;

    return inputs
      .map(
        (o, idx) =>
          `${commentBlock(`@indexed: ${o.indexed}`)}${stringCamelCase(o.name || `arg${idx}`)}: ${this.typesGen.generateType(o, abiItem, 1)}`,
      )
      .join(', ');
  }
}
