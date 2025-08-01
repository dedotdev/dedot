import { StorageEntryLatest } from '@dedot/codecs';
import { normalizeName, stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { getDeprecationComment } from '../../utils.js';
import { ApiGen } from './ApiGen.js';

export class QueryGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
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

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('chaintypes/templates/query.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #generateEntry(entry: StorageEntryLatest) {
    const { name, storageType, docs, modifier, deprecationInfo } = entry;

    let valueType, keyTypeOut, keyTypeIn;
    if (storageType.type === 'Plain') {
      valueType = this.typesGen.generateType(storageType.value.valueTypeId, 1, true);
    } else if (storageType.type === 'Map') {
      valueType = this.typesGen.generateType(storageType.value.valueTypeId, 1, true);
      keyTypeOut = this.typesGen.generateType(storageType.value.keyTypeId, 1, true);
      keyTypeIn = this.typesGen.generateType(storageType.value.keyTypeId, 1);
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

    const deprecationComments = getDeprecationComment(deprecationInfo);
    if (deprecationComments.length > 0) {
      docs.push('\n', ...deprecationComments);
    }

    return {
      name: normalizeName(name),
      valueType,
      keyType: keyTypeIn ? `arg: ${keyTypeIn}` : '',
      keyTypeOut,
      docs,
    };
  }
}
