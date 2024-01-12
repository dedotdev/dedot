import { stringLowerFirst } from '@polkadot/util';
import { StorageEntry } from '@delightfuldot/codecs';
import { normalizeName } from '@delightfuldot/utils';
import { ApiGen } from '../generator';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';

export class QueryGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainStorage', 'GenericStorageQuery');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const storage = pallet.storage;
      if (!storage) {
        continue;
      }

      const queries = storage.entries.map((one) => this.#generateEntry(one));
      const queryDefs = queries.map(
        ({ name, valueType, keyType, docs }) =>
          `${commentBlock(docs)}${name}: GenericStorageQuery<(${keyType}) => ${valueType}>`,
      );

      defTypeOut += `${stringLowerFirst(pallet.name)}: {
        ${queryDefs.join(',\n')}
        
        ${commentBlock('Generic pallet storage query')}[storage: string]: GenericStorageQuery;
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('query.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #generateEntry(entry: StorageEntry) {
    const { name, type, docs, modifier } = entry;

    let valueType, keyType;
    if (type.tag === 'Plain') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1, true);
    } else if (type.tag === 'Map') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1, true);
      keyType = this.typesGen.generateType(type.value.keyTypeId, 1);
    } else {
      throw Error('Invalid entry type!');
    }

    const isOptional = modifier === 'Optional';

    return {
      name: normalizeName(name),
      valueType: `${valueType}${isOptional ? ' | undefined' : ''}`,
      keyType: keyType ? `arg: ${keyType}` : '',
      docs,
    };
  }
}
