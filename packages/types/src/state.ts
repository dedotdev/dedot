import { BlockHash, StorageData, StorageKey } from '@delightfuldot/codecs';
import { registry } from './registry';

/**
 * Storage change set
 */
export interface StorageChangeSet<Hash = BlockHash> {
  /**
   * Block hash
   */
  block: Hash;

  /**
   * A list of changes
   */
  changes: Array<[StorageKey, StorageData | null]>;
}
registry.add('StorageChangeSet');
