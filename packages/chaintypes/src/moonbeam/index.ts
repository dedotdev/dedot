import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';

export * from './types';
export * from './consts';

export interface MoonbeamApi extends GenericSubstrateApi {
  consts: ChainConsts;
}
