import { ApiGen } from './ApiGen';
import { stringLowerFirst } from '@polkadot/util';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';

export class ErrorsGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainErrors', 'GenericModuleError');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const error = pallet.error;
      if (!error) {
        continue;
      }

      const errors = this.#getErrorVariants(error);

      defTypeOut += `${stringLowerFirst(pallet.name)}: {
        ${errors.map(({ name, docs }) => `${commentBlock(docs)}${name}: GenericModuleError`).join(',\n')}
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('errors.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getErrorVariants(errorId: number) {
    const def = this.metadata.types[errorId];
    if (!def) {
      throw new Error(`Error def not found: ${JSON.stringify(def)}`);
    }

    const { tag, value } = def.type;
    if (tag !== 'Enum') {
      throw new Error(`Invalid pallet error type!`);
    }

    return value.members;
  }
}
