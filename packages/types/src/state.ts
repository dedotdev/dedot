import { BlockHash, Bytes, Option, StorageData, StorageKey } from '@dedot/codecs';
import { SerdeEnum } from '@dedot/types/serde';

export interface ReadProof<Hash = BlockHash> {
  /**
   * Block hash used to generate the proof
   */
  at: Hash;

  /**
   * A proof used to prove that storage entries are included in the storage trie
   */
  proof: Array<Bytes>;
}

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

/**
 * Container for all related spans and events for the block being traced.
 */
export interface BlockTrace {
  // Hash of the block being traced
  blockHash: string;
  // Parent hash
  parentHash: string;
  // Module targets that were recorded by the tracing subscriber.
  // Empty string means record all targets.
  tracingTargets: string;
  // Storage key targets used to filter out events that do not have one of the storage keys.
  // Empty string means do not filter out any events.
  storageKeys: string;
  // Method targets used to filter out events that do not have one of the event method.
  // Empty string means do not filter out any events.
  methods: string;
  // Vec of tracing spans
  spans: Array<Span>;
  // Vec of tracing events
  events: Array<Event>;
}

/**
 * Represents a tracing event, complete with recorded data.
 */
export interface Event {
  // Event target
  target: string;
  // Associated data
  data: Data;
  // Parent id, if it exists
  parentId: Option<bigint>;
}

/**
 * Represents a single instance of a tracing span.
 * Exiting a span does not imply that the span will not be re-entered.
 */
export interface Span {
  // id for this span
  id: bigint;
  // id of the parent span, if any
  parentId: Option<bigint>;
  // Name of this span
  name: string;
  // Target, typically module
  target: string;
  // Indicates if the span is from wasm
  wasm: boolean;
}

/**
 * Holds associated values for a tracing span.
 */
export interface Data {
  // HashMap of `String` values recorded while tracing
  stringValues: Record<string, string>;
}

/**
 * Error response for the `state_traceBlock` RPC.
 */
export type TraceError = {
  error: string;
};

/**
 * Response for the `state_traceBlock` RPC.
 */
export type TraceBlockResponse = SerdeEnum<{
  traceError: TraceError;
  blockTrace: BlockTrace;
}>;

/**
 * Current state migration status.
 */
export interface MigrationStatusResult {
  // Number of top items that should migrate.
  topRemainingToMigrate: bigint;
  // Number of child items that should migrate.
  childRemainingToMigrate: bigint;
  // Number of top items that we will iterate on.
  totalTop: bigint;
  // Number of child items that we will iterate on.
  totalChild: bigint;
}
