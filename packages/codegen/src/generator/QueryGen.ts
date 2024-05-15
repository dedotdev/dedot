import { StorageEntryLatest } from 'dedot/codecs';
import { normalizeName, stringCamelCase } from 'dedot/utils';
import { ApiGen } from './ApiGen.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';

export class QueryGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainStorage', 'GenericStorageQuery', 'Callback', 'RpcVersion');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const storage = pallet.storage;
      if (!storage) continue;

      const queries = storage.entries.map((one) => this.#generateEntry(one));
      const queryDefs = queries.map(({ name, valueType, keyType, docs, keyTypeOut }) => {
        if (keyTypeOut) {
          return `${commentBlock(docs)}${name}: GenericStorageQuery<Rv, (${keyType}) => ${valueType}, ${keyTypeOut}>`;
        } else {
          return `${commentBlock(docs)}${name}: GenericStorageQuery<Rv, (${keyType}) => ${valueType}>`;
        }
      });

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s storage queries`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${queryDefs.join(',\n')}
        
        ${commentBlock('Generic pallet storage query')}[storage: string]: GenericStorageQuery<Rv>;
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('query.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #generateEntry(entry: StorageEntryLatest) {
    const { name, type, docs, modifier } = entry;

    let valueType, keyTypeOut, keyTypeIn;
    if (type.tag === 'Plain') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1, true);
    } else if (type.tag === 'Map') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1, true);
      keyTypeOut = this.typesGen.generateType(type.value.keyTypeId, 1, true);
      keyTypeIn = this.typesGen.generateType(type.value.keyTypeId, 1);
    } else {
      throw Error('Invalid entry type!');
    }

    const isOptional = modifier === 'Optional';
    valueType = `${valueType}${isOptional ? ' | undefined' : ''}`;

    docs.push('\n');
    if (keyTypeIn) {
      docs.push(`@param {${keyTypeIn}} arg`);
    }
    docs.push(`@param {Callback<${valueType}> =} callback`);

    return {
      name: normalizeName(name),
      valueType,
      keyType: keyTypeIn ? `arg: ${keyTypeIn}` : '',
      keyTypeOut,
      docs,
    };
  }
}
