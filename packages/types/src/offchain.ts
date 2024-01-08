import { registry } from './registry';

/*
 * A type of supported crypto.
 */
export enum StorageKind {
  // Persistent storage is non-revertible and not fork-aware. It means that any value
  // set by the offchain worker triggered at block `N(hash1)` is persisted even
  // if that block is reverted as non-canonical and is available for the worker
  // that is re-run at block `N(hash2)`.
  // This storage can be used by offchain workers to handle forks
  // and coordinate offchain workers running on different forks.
  PERSISTENT = 'PERSISTENT',
  // Local storage is revertible and fork-aware. It means that any value
  // set by the offchain worker triggered at block `N(hash1)` is reverted
  // if that block is reverted as non-canonical and is NOT available for the worker
  // that is re-run at block `N(hash2)`.
  LOCAL = 'LOCAL',
}

registry.add('StorageKind');
