import { stringLowerFirst } from '@polkadot/util';
import { StorageEntry } from '@delightfuldot/codecs';
import { normalizeName } from '@delightfuldot/utils';
import { ApiGen } from '../generator';
import { commentBlock, compileTemplate, format, resolveFilePath } from './utils';


export class QueryGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();

    let defTypeOut = '';
    for (let pallet of pallets) {
      const storage = pallet.storage;
      if (!storage) {
        continue;
      }

      const queries = storage.entries.map((one) => this.#generateEntry(one));

      defTypeOut += `${stringLowerFirst(pallet.name)}: {${queries
        .map(({ name, valueType, keyType, docs }) => `${commentBlock(docs)}${name}(${keyType}): Promise<${valueType}>`)
        .join(',\n')}},`;
    }

    // TODO improve this!
    const toImportTypes = [...this.typesGen.usedNameTypes];

    const queryTemplateFilePath = resolveFilePath('packages/codegen/src/templates/query.hbs');
    const template = compileTemplate(queryTemplateFilePath);

    return format(template({ toImportTypes, defTypeOut }));
  }

  #generateEntry(entry: StorageEntry) {
    const { name, type, docs, modifier } = entry;

    let valueType, keyType;
    if (type.tag === 'Plain') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1);
    } else if (type.tag === 'Map') {
      valueType = this.typesGen.generateType(type.value.valueTypeId, 1);
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