import { beautifySourceCode, compileTemplate } from './utils.js';
import { stringPascalCase } from '@dedot/utils';

export class IndexGen {
  constructor(readonly chain: string) {}

  async generate() {
    const interfaceName = stringPascalCase(this.chain);

    const template = compileTemplate('index.hbs');

    return beautifySourceCode(template({ interfaceName }));
  }
}
