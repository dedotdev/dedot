import { BlockHash, Bytes, FixedBytes, Option, StorageData, StorageKey } from '@delightfuldot/codecs';
import { registry } from './registry';
import { SerdeEnum } from '@delightfuldot/types/serde';

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
registry.add('ReadProof');

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
  TraceError: TraceError;
  BlockTrace: BlockTrace;
}>;
registry.add('TraceBlockResponse');

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
registry.add('MigrationStatusResult');

/**
 * Runtime version.
 * This should not be thought of as classic Semver (major/minor/tiny).
 * This triplet have different semantics and mis-interpretation could cause problems.
 *
 * In particular: bug fixes should result in an increment of `spec_version` and possibly
 * `authoring_version`, absolutely not `impl_version` since they change the semantics of the
 * runtime.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/version/src/lib.rs#L152-L215
 */
export interface RuntimeVersion {
  specName: string;
  implName: string;
  authoringVersion: number;
  specVersion: number;
  implVersion: number;
  apis: Array<[FixedBytes<8>, number]>;
  transactionVersion: number;
  stateVersion: number;
}
registry.add('RuntimeVersion');
