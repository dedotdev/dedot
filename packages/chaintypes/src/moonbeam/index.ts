import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';
import { ChainStorage } from './query';

export * from './types';
export * from './consts';

export interface MoonbeamApi extends GenericSubstrateApi {
  consts: ChainConsts;
  query: ChainStorage;
}
