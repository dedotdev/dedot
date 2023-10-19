import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';

export * from './types';
export * from './consts';

export interface AstarApi extends GenericSubstrateApi {
  consts: ChainConsts;
}
