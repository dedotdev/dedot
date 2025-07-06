import { normalizeName, stringCamelCase } from '@dedot/utils';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';
import { getDeprecationComment } from '../../utils.js';
import { ApiGen } from './ApiGen.js';

export class ConstsGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainConsts', 'RpcVersion');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const typedConstants = pallet.constants.map((one) => {
        const { deprecationInfo, docs } = one;
        const deprecationComments = getDeprecationComment(deprecationInfo);
        if (deprecationComments.length > 0) {
          docs.push('\n', ...deprecationComments);
        }

        return {
          name: normalizeName(one.name),
          type: this.typesGen.generateType(one.typeId, 1, true),
          docs,
        };
      });

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s constants`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${typedConstants.map(({ name, type, docs }) => `${commentBlock(docs)}${name}: ${type}`).join(',\n')}
          
        ${commentBlock('Generic pallet constant')}[name: string]: any,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('chaintypes/templates/consts.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }
}
