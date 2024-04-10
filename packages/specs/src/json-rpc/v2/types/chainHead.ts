import { BlockHash } from '@dedot/codecs';

export type OperationId = string;

export interface NamedEvent {
  event: string;
}

export interface WithOperationId {
  operationId: OperationId;
}

export type RuntimeEvent =
  | {
      type: 'valid';
      spec: ChainHeadRuntimeVersion;
    }
  | { type: 'invalid'; error: string };

export interface ChainHeadRuntimeVersion {
  specName: string;
  implName: string;
  specVersion: number;
  implVersion: number;
  apis: Record<string, number>;
  transactionVersion: number;
}

export interface Initialized<Hash = BlockHash> extends NamedEvent {
  event: 'initialized';
  finalizedBlockHashes: Array<Hash>;
  finalizedBlockRuntime: RuntimeEvent | null;
}

export interface NewBlock<Hash = BlockHash> extends NamedEvent {
  event: 'newBlock';
  blockHash: Hash;
  parentBlockHash: Hash;
  newRuntime: RuntimeEvent | null;
}

export interface BestBlockChanged<Hash = BlockHash> extends NamedEvent {
  event: 'bestBlockChanged';
  bestBlockHash: Hash;
}

export interface Finalized<Hash = BlockHash> extends NamedEvent {
  event: 'finalized';
  finalizedBlockHashes: Array<Hash>;
  prunedBlockHashes: Array<Hash>;
}

export interface OperationBodyDone extends NamedEvent, WithOperationId {
  event: 'operationBodyDone';
  value: Array<string>;
}

export interface OperationCallDone extends NamedEvent, WithOperationId {
  event: 'operationCallDone';
  output: string;
}

export interface StorageResult {
  key: string;
  value?: string;
  hash?: string;
  closestDescendantMerkleValue?: string;
}

export interface OperationStorageItems extends NamedEvent, WithOperationId {
  event: 'operationStorageItems';
  items: Array<StorageResult>;
}

export interface OperationWaitingForContinue extends NamedEvent, WithOperationId {
  event: 'operationWaitingForContinue';
}

export interface OperationStorageDone extends NamedEvent, WithOperationId {
  event: 'operationStorageDone';
}

export interface OperationInaccessible extends NamedEvent, WithOperationId {
  event: 'operationInaccessible';
}

export interface OperationError extends NamedEvent, WithOperationId {
  event: 'operationError';
  error: string;
}

export interface Stop extends NamedEvent {
  event: 'stop';
}

export type FollowOperationEvent =
  | OperationBodyDone
  | OperationCallDone
  | OperationStorageItems
  | OperationWaitingForContinue
  | OperationStorageDone
  | OperationInaccessible
  | OperationError;

export type FollowEvent<Hash = BlockHash> =
  | Initialized<Hash>
  | NewBlock<Hash>
  | BestBlockChanged<Hash>
  | Finalized<Hash>
  | FollowOperationEvent
  | Stop;

export type MethodResponse =
  | { result: 'started'; operationId: OperationId; discardedItems?: number }
  | { result: 'limitReached' };

export interface StorageQuery<Key = string> {
  key: Key;
  type: StorageQueryType;
}

export type StorageQueryType =
  /// Fetch the value of the provided key.
  | 'value'
  /// Fetch the hash of the value of the provided key.
  | 'hash'
  /// Fetch the closest descendant merkle value.
  | 'closestDescendantMerkleValue'
  /// Fetch the values of all descendants of they provided key.
  | 'descendantsValues'
  /// Fetch the hashes of the values of all descendants of they provided key.
  | 'descendantsHashes';
