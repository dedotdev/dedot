import { assert, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { getVariantDeprecationComment } from '../../utils.js';
import { ApiGen } from './ApiGen.js';

export class ErrorsGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainErrors', 'GenericPalletError');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const errorTypeId = pallet.error;
      if (!errorTypeId) {
        continue;
      }

      const errorDefs = this.#getErrorDefs(errorTypeId.typeId);

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s errors`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${errorDefs
          .map((def, index) => {
            const { docs } = def;
            const deprecationComments = getVariantDeprecationComment(errorTypeId.deprecationInfo, index);
            if (deprecationComments.length > 0) {
              docs.push('\n', ...deprecationComments);
            }

            return { ...def, docs };
          })
          .map(({ name, docs }) => `${commentBlock(docs)}${stringPascalCase(name)}: GenericPalletError`)
          .join(',\n')}
          
        ${commentBlock('Generic pallet error')}[error: string]: GenericPalletError,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('chaintypes/templates/errors.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }

  #getErrorDefs(errorTypeId: number) {
    const def = this.metadata.types[errorTypeId];
    assert(def, `Error def not found for id ${errorTypeId}`);

    const { type, value } = def.typeDef;
    assert(type === 'Enum', 'Invalid pallet error type!');

    return value.members;
  }
}
