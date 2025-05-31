import { GenericInkContractEventArg, GenericInkContractEventMeta } from '@dedot/types';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import { SmartContractApi } from '../../shared/TypeImports.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { QueryGen } from './QueryGen.js';

export class EventsGen extends QueryGen {
  generate(useSubPaths: boolean = false, smartContractApi: SmartContractApi = SmartContractApi.ContractsApi) {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericSubstrateApi');
    this.typesGen.typeImports.addContractType('GenericContractEvents', 'GenericContractEvent');

    const { events } = this.contractMetadata.spec;

    let eventsOut = '';

    const isV5 = this.contractMetadata.version === 5;

    events.forEach((event: GenericInkContractEventMeta) => {
      const { docs, label } = event;

      eventsOut += `${commentBlock(docs, '\n', isV5 ? ('signature_topic' in event ? `@signature_topic: ${event.signature_topic}` : '- Anonymous event') : '')}`;
      eventsOut += `${stringPascalCase(label)}: ${this.#generateEventDef(event)};\n\n`;
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths, smartContractApi });
    const template = compileTemplate('typink/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, eventsOut }));
  }

  #generateEventDef(event: GenericInkContractEventMeta) {
    const { args, label } = event;

    const paramsOut = this.generateParamsOut(args);

    return `GenericContractEvent<'${stringPascalCase(label)}', {${paramsOut}}>`;
  }

  generateParamsOut(args: GenericInkContractEventArg[]) {
    return args
      .map(
        ({ type: { type }, label, docs, indexed }) =>
          `${commentBlock(docs, '\n', `@indexed: ${indexed}`)}${stringCamelCase(label)}: ${this.typesGen.generateType(type, 1, true)}`,
      )
      .join(', ');
  }
}
