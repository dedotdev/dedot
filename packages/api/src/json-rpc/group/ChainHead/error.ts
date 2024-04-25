import { DedotError } from '@dedot/utils';

export class ChainHeadError extends DedotError {
  shouldRetry = false;
}

/**
 * Operation Inaccessible Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#operationinaccessible
 */
export class ChainHeadOperationInaccessibleError extends ChainHeadError {
  shouldRetry = true;
}

/**
 * Stop Error
 *
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_follow.html#stop
 */
export class ChainHeadStopError extends ChainHeadError {}

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
  // shouldRetry = true; TODO retry after a delayed?
}

/**
 * Invalid Runtime Error
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/chainHead_v1_storage.html#limitreached
 */
export class ChainHeadInvalidRuntimeError extends ChainHeadError {}

export class ChainHeadBlockNotPinnedError extends ChainHeadError {}
