import { beautifySourceCode } from './utils';
import { NetworkInfo } from '../types';
import { stringPascalCase } from '@polkadot/util';

export class IndexGen {
  constructor(readonly networkInfo: NetworkInfo) {}
  async generate() {
    const { chain } = this.networkInfo;
    const interfaceName = stringPascalCase(chain);

    return beautifySourceCode(`
import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';
import { ChainStorage } from './query';
import { RpcCalls } from './rpc';

export * from './types';
export * from './consts';

export interface ${interfaceName}Api extends GenericSubstrateApi {
  rpc: RpcCalls;
  consts: ChainConsts;
  query: ChainStorage;
}
    `);
  }
}
