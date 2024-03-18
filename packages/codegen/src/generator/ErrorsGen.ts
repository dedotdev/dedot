import { ApiGen } from './ApiGen.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';
import { assert, stringCamelCase, stringPascalCase } from '@dedot/utils';

export class ErrorsGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainErrors', 'GenericPalletError');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const errorTypeId = pallet.error;
      if (!errorTypeId) {
        continue;
      }

      const errorDefs = this.#getErrorDefs(errorTypeId);

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s errors`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${errorDefs
          .map(({ name, docs }) => `${commentBlock(docs)}${stringPascalCase(name)}: GenericPalletError`)
          .join(',\n')}
          
        ${commentBlock('Generic pallet error')}[error: string]: GenericPalletError,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('errors.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getErrorDefs(errorTypeId: number) {
    const def = this.metadata.types[errorTypeId];
    assert(def, `Error def not found for id ${errorTypeId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', `Invalid pallet error type!`);

    return value.members;
  }
}
