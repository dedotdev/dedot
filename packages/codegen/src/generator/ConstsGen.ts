import { normalizeName, stringCamelCase } from '@dedot/utils';
import { ApiGen } from './ApiGen.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';

export class ConstsGen extends ApiGen {
  generate(useSubPaths: boolean = false) {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainConsts', 'RpcVersion');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const typedConstants = pallet.constants.map((one) => ({
        name: normalizeName(one.name),
        type: this.typesGen.generateType(one.typeId, 1, true),
        docs: one.docs,
      }));

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s constants`);
      defTypeOut += `${stringCamelCase(pallet.name)}: {
        ${typedConstants.map(({ name, type, docs }) => `${commentBlock(docs)}${name}: ${type}`).join(',\n')}
          
        ${commentBlock('Generic pallet constant')}[name: string]: any,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('consts.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }
}
