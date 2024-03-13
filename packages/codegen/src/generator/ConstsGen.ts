import { stringLowerFirst } from '@polkadot/util';
import { normalizeName } from '@dedot/utils';
import { ApiGen } from '../generator/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from './utils.js';

export class ConstsGen extends ApiGen {
  generate() {
    const { pallets } = this.metadata;

    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericChainConsts');

    let defTypeOut = '';
    for (let pallet of pallets) {
      const typedConstants = pallet.constants.map((one) => ({
        name: normalizeName(one.name),
        type: this.typesGen.generateType(one.typeId, 1, true),
        docs: one.docs,
      }));

      defTypeOut += commentBlock(`Pallet \`${pallet.name}\`'s constants`);
      defTypeOut += `${stringLowerFirst(pallet.name)}: {
        ${typedConstants.map(({ name, type, docs }) => `${commentBlock(docs)}${name}: ${type}`).join(',\n')}
          
        ${commentBlock('Generic pallet constant')}[name: string]: any,
      },`;
    }

    const importTypes = this.typesGen.typeImports.toImports();
    const template = compileTemplate('consts.hbs');

    return beautifySourceCode(template({ importTypes, defTypeOut }));
  }
}
