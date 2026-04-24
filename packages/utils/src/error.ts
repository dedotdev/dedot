export class DedotError extends Error {
  name = 'DedotError';
}
/**
 * Throwing when a api is unknown upon evaluation
 */
export class UnknownApiError extends DedotError {
  name = 'UnknownApiError';
}

/**
 * Thrown when API call parameters are incompatible with the API definition.
 * This typically happens when using outdated API definitions against an upgraded runtime.
 *
 * The error message includes:
 * - Which API/method was called
 * - What went wrong (parameter count mismatch, type mismatch, etc.)
 * - Specific parameter errors if applicable
 * - Suggestions for fixing the issue
 */
export class ApiCompatibilityError extends DedotError {
  name = 'ApiCompatibilityError';
}

/**
 * Thrown by `V2Client` when the connected node does not expose JSON-RPC v2 methods
 * (no `chainHead_*` methods in `rpc_methods`).
 *
 * `DedotClient` catches this error in auto-detect mode (no `rpcVersion` specified)
 * and transparently falls back to `LegacyClient`.
 */
export class JsonRpcV2NotSupportedError extends DedotError {
  name = 'JsonRpcV2NotSupportedError';
}
