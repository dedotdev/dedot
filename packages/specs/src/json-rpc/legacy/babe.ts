import { GenericJsonRpcApis } from '@dedot/types';
import { EpochAuthorship } from './types/index.js';

export interface BabeJsonRpcApi extends GenericJsonRpcApis {
  /**
   * Returns data about which slots (primary or secondary) can be claimed in the current epoch with the keys in the keystore.
   *
   * @rpcname babe_epochAuthorship
   **/
  babe_epochAuthorship: () => Promise<Record<string, EpochAuthorship>>;
}
