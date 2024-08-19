import { SubstrateRuntimeVersion } from '@dedot/api';
import { TypeImports } from '../../shared/index.js';
import { beautifySourceCode, commentBlock, compileTemplate } from '../../utils.js';

export class IndexGen {
  constructor(
    readonly interfaceName: string,
    readonly runtimeVersion: SubstrateRuntimeVersion,
  ) {}

  async generate(useSubPaths: boolean = false) {
    const interfaceName = this.interfaceName;

    const typeImports = new TypeImports();
    typeImports.addKnownType('GenericSubstrateApi', 'RpcLegacy', 'RpcV2', 'RpcVersion');

    const importTypes = typeImports.toImports({ useSubPaths });
    const interfaceDocs = commentBlock([
      `@name: ${interfaceName}`, // prettier-end-here
      `@specVersion: ${this.runtimeVersion.specVersion}`,
    ]);

    const template = compileTemplate('chaintypes/templates/index.hbs');

    return beautifySourceCode(template({ interfaceName, interfaceDocs, importTypes }));
  }
}
