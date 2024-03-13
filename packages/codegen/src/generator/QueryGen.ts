import { stringLowerFirst } from '@polkadot/util';
import { StorageEntryLatest } from '@dedot/codecs';
import { normalizeName } from '@dedot/utils';
import { ApiGen } from '../generator/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';

export class QueryGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainStorage', 'GenericStorageQuery', 'Callback');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const storage = pallet.storage;
      if (!storage) continue;

      const queries = storage.entries.map((one) => this.#generateEntry(one));
      const queryDefs = queries.map(
        ({ name, valueType, keyType, docs }) =>
          `${commentBlock(docs)}${name}: GenericStorageQuery<(${keyType}) => ${valueType}>`,
      );

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s storage queries`);
      defTypeOut += `${stringLowerFirst(pallet.name)}: {
        ${queryDefs.join(',\n')}
        
        ${commentBlock('Generic pallet storage query')}[storage: string]: GenericStorageQuery;
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('query.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #generateEntry(entry: StorageEntryLatest) {
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
    valueType = `${valueType}${isOptional ? ' | undefined' : ''}`;

    docs.push('\n');
    if (keyType) {
      docs.push(`@param {${keyType}} arg`);
    }
    docs.push(`@param {Callback<${valueType}> =} callback`);

    return {
      name: normalizeName(name),
      valueType,
      keyType: keyType ? `arg: ${keyType}` : '',
      docs,
    };
  }
}
