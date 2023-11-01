import { stringLowerFirst } from '@polkadot/util';
import { normalizeName } from '@delightfuldot/utils';
import { ApiGen } from '../generator';
import { commentBlock, compileTemplate, beautifySourceCode, resolveFilePath } from './utils';


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

      defTypeOut += `${stringLowerFirst(pallet.name)}: {${typedConstants
        .map(({ name, type, docs }) => `${commentBlock(docs)}${name}: ${type}`)
        .join(',\n')}},`;
    }

    // TODO improve this!
    const toImportTypes = [...this.typesGen.usedNameTypes];

    const constsTemplateFilePath = resolveFilePath('packages/codegen/src/templates/consts.hbs');
    const template = compileTemplate(constsTemplateFilePath);
    return beautifySourceCode(template({toImportTypes, defTypeOut}));
  }
}
