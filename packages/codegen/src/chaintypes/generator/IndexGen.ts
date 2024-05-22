import { stringPascalCase } from '@dedot/utils';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

export class IndexGen {
  constructor(readonly chain: string) {}

  async generate(useSubPaths: boolean = false) {
    const interfaceName = stringPascalCase(this.chain);

    const typeImports = new TypeImports();
    typeImports.addKnownType('GenericSubstrateApi', 'RpcLegacy', 'RpcV2', 'RpcVersion');

    const importTypes = typeImports.toImports({ useSubPaths });

    const template = compileTemplate('chaintypes/templates/index.hbs');

    return beautifySourceCode(template({ importTypes, interfaceName }));
  }
}
