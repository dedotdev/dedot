import { StorageQuery, StorageResult } from './chainHead.js';

export type MethodResult = { success: true; result: string } | { success: false; error: string };

export type ArchiveStorageResult = { result?: Array<StorageResult>; discardedItems?: number; error?: string };

export interface PaginatedStorageQuery<Key = string> extends StorageQuery<Key> {
  paginationStartKey?: Key;
}
