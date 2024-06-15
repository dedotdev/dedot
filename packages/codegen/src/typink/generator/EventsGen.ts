import { ContractEventMeta } from '@dedot/contracts';
import { stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils';
import { QueryGen } from './QueryGen';

export class EventsGen extends QueryGen {
  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();

    this.typesGen.typeImports.addContractType('GenericContractEvents', 'GenericContractEvent');

    const { events } = this.contractMetadata.spec;

    let eventsOut = '';

    events.forEach((event) => {
      const { docs, label } = event;

      eventsOut += `${commentBlock(docs)}`;
      eventsOut += `${stringPascalCase(label)}: ${this.#generateEventDef(event)};\n\n`;
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, eventsOut }));
  }

  #generateEventDef(event: ContractEventMeta) {
    const { args, label } = event;

    args.forEach(({ type: { type } }) => this.importType(type));

    const paramsOut = this.generateParamsOut(args);

    return `GenericContractEvent<'${stringPascalCase(label)}', {${paramsOut}}>`;
  }
}
