import { stringPascalCase } from '@dedot/utils';
import { beautifySourceCode, compileTemplate } from '../../utils.js';

export class IndexGen {
  constructor(readonly chain: string) {}

  async generate() {
    const interfaceName = stringPascalCase(this.chain);

    const template = compileTemplate('chaintypes/templates/index.hbs');

    return beautifySourceCode(template({ interfaceName }));
  }
}