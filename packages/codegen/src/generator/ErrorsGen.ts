import { ApiGen } from './ApiGen';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';
import { assert } from '@delightfuldot/utils';

export class ErrorsGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainErrors', 'GenericModuleError');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const errorTypeId = pallet.error;
      if (!errorTypeId) {
        continue;
      }

      const errorDefs = this.#getErrorDefs(errorTypeId);

      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${errorDefs
          .map(({ name, docs }) => `${commentBlock(docs)}${stringPascalCase(name)}: GenericModuleError`)
          .join(',\n')}
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
