import { DedotError } from '@dedot/utils';

export enum RetryStrategy {
  NOW = 'NOW', // Retry immediately
  QUEUED = 'QUEUED', // Retry one by one via an async queue
}

export class ChainHeadError extends DedotError {
  name = 'ChainHeadError';
  retryStrategy?: RetryStrategy | undefined;
}

/**
 * Operation Inaccessible Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#operationinaccessible
 */
export class ChainHeadOperationInaccessibleError extends ChainHeadError {
  name = 'ChainHeadOperationInaccessibleError';
  retryStrategy = RetryStrategy.NOW;
}

/**
 * Stop Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#stop
 */
export class ChainHeadStopError extends ChainHeadError {
  name = 'ChainHeadStopError';
  retryStrategy = RetryStrategy.QUEUED;
}

/**
 * Operation Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#operationerror
 */
export class ChainHeadOperationError extends ChainHeadError {
  name = 'ChainHeadOperationError';
}

/**
 * Limit Reached Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_storage.html#limitreached
 */
export class ChainHeadLimitReachedError extends ChainHeadError {
  name = 'ChainHeadLimitReachedError';
  retryStrategy = RetryStrategy.QUEUED;
}

/**
 * Invalid Runtime Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_storage.html#limitreached
 */
export class ChainHeadInvalidRuntimeError extends ChainHeadError {
  name = 'ChainHeadInvalidRuntimeError';
}

export class ChainHeadBlockNotPinnedError extends ChainHeadError {
  name = 'ChainHeadBlockNotPinnedError';
}

export class ChainHeadBlockPrunedError extends ChainHeadError {
  name = 'ChainHeadBlockPrunedError';
}
