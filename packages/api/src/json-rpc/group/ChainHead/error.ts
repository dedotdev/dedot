import { DedotError } from '@dedot/utils';

export enum RetryStrategy {
  NOW = 'NOW', // Retry immediately
  QUEUED = 'QUEUED', // Retry one by one via an async queue
}

export class ChainHeadError extends DedotError {
  retryStrategy?: RetryStrategy | undefined;
}

/**
 * Operation Inaccessible Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#operationinaccessible
 */
export class ChainHeadOperationInaccessibleError extends ChainHeadError {
  retryStrategy = RetryStrategy.NOW;
}

/**
 * Stop Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#stop
 */
export class ChainHeadStopError extends ChainHeadError {
  retryStrategy = RetryStrategy.QUEUED;
}

/**
 * Operation Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#operationerror
 */
export class ChainHeadOperationError extends ChainHeadError {}

/**
 * Limit Reached Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_storage.html#limitreached
 */
export class ChainHeadLimitReachedError extends ChainHeadError {
  retryStrategy = RetryStrategy.QUEUED;
}

/**
 * Invalid Runtime Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_storage.html#limitreached
 */
export class ChainHeadInvalidRuntimeError extends ChainHeadError {}

export class ChainHeadBlockNotPinnedError extends ChainHeadError {}

export class ChainHeadBlockPrunedError extends ChainHeadError {}
