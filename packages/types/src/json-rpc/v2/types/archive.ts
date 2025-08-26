import { StorageQuery, StorageResult } from './chainHead.js';
import { NamedEvent } from './types.js';

export type MethodResult = { success: true; value: string } | { success: false; error: string };

export type ArchiveStorageResult = Array<StorageResult>;

export interface PaginatedStorageQuery<Key = string> extends StorageQuery<Key> {
  // TODO paginationStartKey seems to not being implemented on polkadot-sdk right not
  // https://github.com/paritytech/polkadot-sdk/blob/fd2bfd59c5c5ddb561cb1a2d60df3dd4b4d343cc/substrate/client/rpc-spec-v2/src/archive/archive.rs#L221
  paginationStartKey?: Key;
}

export interface ArchiveStorageDiffItem<Key = string> {
  key: Key;
  returnType: 'value' | 'hash';
  childTrie?: string;
}

export interface ArchiveStorageDiffValue {
  key: string;
  value?: string;
  hash?: string;
  type: 'added' | 'modified' | 'deleted';
  childTrieKey?: string;
}

export interface ArchiveStorageDiffResult {
  values: Array<ArchiveStorageDiffValue>;
}

export interface ArchiveStorageEvent extends NamedEvent, StorageResult {
  event: 'storage';
}

export interface ArchiveStorageDone extends NamedEvent {
  event: 'storageDone';
}

export interface ArchiveStorageError extends NamedEvent {
  event: 'storageError';
  error: string;
}

export type ArchiveStorageEventType = ArchiveStorageEvent | ArchiveStorageDone | ArchiveStorageError;

export interface ArchiveStorageDiffEvent extends NamedEvent, ArchiveStorageDiffValue {
  event: 'storageDiff';
}

export interface ArchiveStorageDiffDone extends NamedEvent {
  event: 'storageDiffDone';
}

export interface ArchiveStorageDiffError extends NamedEvent {
  event: 'storageDiffError';
  error: string;
}

export type ArchiveStorageDiffEventType = ArchiveStorageDiffEvent | ArchiveStorageDiffDone | ArchiveStorageDiffError;
