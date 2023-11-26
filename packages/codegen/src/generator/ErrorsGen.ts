import { ApiGen } from './ApiGen';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { stringCamelCase } from '@polkadot/util';
import { assert } from '@delightfuldot/utils';

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

      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${errors
          .map(({ name, docs }) => `${commentBlock(docs)}${stringCamelCase(name)}: GenericModuleError`)
          .join(',\n')}
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('errors.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getErrorVariants(errorId: number) {
    const def = this.metadata.types[errorId];
    assert(def, `Error def not found for id ${errorId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', `Invalid pallet error type!`);

    return value.members;
  }
}
