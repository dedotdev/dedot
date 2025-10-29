import { EnumTypeDef, Field, TypeId } from '@dedot/codecs';
import { assert, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { getVariantDeprecationComment } from '../../utils.js';
import { ApiGen } from './ApiGen.js';

export class EventsGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainEvents', 'GenericPalletEvent');

    let defTypeOut = '';

    for (let pallet of pallets) {
      const eventTypeId = pallet.event;
      if (!eventTypeId) {
        continue;
      }

      const eventDefs = this.#getEventDefs(eventTypeId.typeId);
      const flatMembers = eventDefs.every((d) => d.fields.length === 0);

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s events`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${eventDefs
          .map((def, index) => {
            const genericParts: any[] = [`'${pallet.name}'`, `'${def.name}'`];
            const eventDataPart = this.#generateMemberDefType(def.fields);
            if (eventDataPart) {
              genericParts.push(eventDataPart);
            } else {
              genericParts.push(flatMembers ? 'undefined' : 'null');
            }

            const { docs } = def;
            const deprecationComments = getVariantDeprecationComment(eventTypeId.deprecationInfo, index);
            if (deprecationComments.length > 0) {
              docs.push('\n', ...deprecationComments);
            }

            return { ...def, genericParts, docs };
          })
          .map(
            ({ name, docs, genericParts }) =>
              `${commentBlock(docs)}${stringPascalCase(name)}: GenericPalletEvent<${genericParts.join(', ')}>`,
          )
          .join(',\n')}
          
        ${commentBlock('Generic pallet event')}[prop: string]: GenericPalletEvent,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('chaintypes/templates/events.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getEventDefs(typeId: TypeId): EnumTypeDef['members'] {
    const def = this.metadata.types[typeId];
    assert(def, `Event def not found for id ${typeId}`);

    const { type, value } = def.typeDef;
    assert(type === 'Enum', 'Invalid pallet event type!');

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
