import { ApiGen } from './ApiGen.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';
import { EnumTypeDef, Field, TypeId } from '@dedot/codecs';
import { assert } from '@dedot/utils';

export class EventsGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainEvents', 'GenericPalletEvent');

    let defTypeOut = '';

    for (let pallet of pallets) {
      const eventTypeId = pallet.event;
      if (!eventTypeId) {
        continue;
      }

      const eventDefs = this.#getEventDefs(eventTypeId);
      const flatMembers = eventDefs.every((d) => d.fields.length === 0);

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s events`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${eventDefs
          .map((def) => {
            const genericParts: any[] = [`'${pallet.name}'`, `'${def.name}'`];

            const eventDataPart = this.#generateMemberDefType(def.fields);
            if (eventDataPart) {
              genericParts.push(eventDataPart);
            } else {
              genericParts.push(flatMembers ? 'undefined' : 'null');
            }

            return { ...def, genericParts };
          })
          .map(
            ({ name, docs, fields, genericParts }) =>
              `${commentBlock(docs)}${stringPascalCase(name)}: GenericPalletEvent<${genericParts.join(', ')}>`,
          )
          .join(',\n')}
          
        ${commentBlock('Generic pallet event')}[prop: string]: GenericPalletEvent,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('events.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getEventDefs(typeId: TypeId): EnumTypeDef['members'] {
    const def = this.metadata.types[typeId];
    assert(def, `Event def not found for id ${typeId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', 'Invalid pallet event type!');

    return value.members;
  }

  #generateMemberDefType(fields: Field[]) {
    if (fields.length === 0) {
      return null;
    } else if (fields[0]!.name === undefined) {
      return fields.length === 1
        ? this.typesGen.generateType(fields[0].typeId, 1, true)
        : `[${fields
            .map(({ typeId, docs }) => `${commentBlock(docs)}${this.typesGen.generateType(typeId, 1, true)}`)
            .join(', ')}]`;
    } else {
      return this.typesGen.generateObjectType(fields, 1, true);
    }
  }
}
