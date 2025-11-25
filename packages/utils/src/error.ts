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
