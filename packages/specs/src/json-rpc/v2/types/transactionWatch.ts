import { BlockHash } from '@dedot/codecs';
import { NamedEvent } from './types.js';

export interface TransactionValidated extends NamedEvent {
  event: 'validated';
}

export interface TransactionBlock<Hash = BlockHash> {
  hash: Hash;
  index: number;
}

export interface TransactionBestChainBlockIncluded<Hash = BlockHash> extends NamedEvent {
  event: 'bestChainBlockIncluded';
  block: TransactionBlock<Hash> | null;
}

export interface TransactionFinalized<Hash = BlockHash> extends NamedEvent {
  event: 'finalized';
  block: TransactionBlock<Hash>;
}

export interface TransactionError extends NamedEvent {
  event: 'error';
  error: string;
}

export interface TransactionInvalid extends NamedEvent {
  event: 'invalid';
  error: string;
}

export interface TransactionDropped extends NamedEvent {
  event: 'dropped';
  error: string;
}

export type TransactionEvent<Hash = BlockHash> =
  | TransactionValidated
  | TransactionBestChainBlockIncluded<Hash>
  | TransactionFinalized<Hash>
  | TransactionError
  | TransactionInvalid
  | TransactionDropped;
