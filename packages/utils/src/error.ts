export class DedotError extends Error {
  name = 'DedotError';
}
/**
 * Throwing when a api is unknown upon evaluation
 */
export class UnknownApiError extends DedotError {
  name = 'UnknownApiError';
}
