import { TypesGen } from '@dedot/codegen/sol/generator/TypesGen';
import { beautifySourceCode, commentBlock, compileTemplate } from '@dedot/codegen/utils';
import { SolABIEvent, SolABIItem } from '@dedot/contracts';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';

export class ErrorsGen {
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
      const { name, inputs, anonymous } = event;

      eventsOut += `${stringPascalCase(name)}: ${this.#generateEventDef(event)};\n\n`;
    });

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('typink/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, eventsOut }));
  }

  #generateEventDef(event: SolABIEvent) {
    const { name } = event;

    const paramsOut = this.generateParamsOut(event);

    return `SolGenericContractEvent<'${stringPascalCase(name)}', {${paramsOut}}>`;
  }

  generateParamsOut(event: SolABIEvent) {
    const { inputs } = event;

    return inputs
      .map(
        (o) =>
          `${commentBlock(`@indexed: ${o.indexed}`)}${stringCamelCase(o.name)}: ${this.typesGen.generateType(o, event, 1, true)}`,
      )
      .join(', ');
  }
}
