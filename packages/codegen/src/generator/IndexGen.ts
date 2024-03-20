import { beautifySourceCode, compileTemplate } from './utils.js';
import { NetworkInfo } from '../types.js';
import { stringPascalCase } from '@dedot/utils';

export class IndexGen {
  constructor(readonly networkInfo: NetworkInfo) {}

  async generate() {
    const { chain } = this.networkInfo;
    const interfaceName = stringPascalCase(chain);

    const template = compileTemplate('index.hbs');

    return beautifySourceCode(template({ interfaceName }));
  }
}
