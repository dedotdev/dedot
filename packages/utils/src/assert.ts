export function assert(condition: unknown, message?: string | Error): asserts condition {
  if (condition) {
    return;
  }

  throwError(message);
}

/**
 * Throw out error if condition is undefined, false, null, '' or 0
 *
 * @param condition
 * @param message
 */
export function assertFalse(condition: unknown, message?: string | Error): asserts condition {
  assert(!condition, message);
}

function throwError(message?: string | Error): never {
  if (message instanceof Error) {
    throw message;
  }

  throw new Error(message);
}

/**
 * Ensure presence for value, else throw an error!
 * @param value
 * @param message
 */
export function ensurePresence<T>(value: T, message?: string): NonNullable<T> {
  return value ?? throwError(message || 'Value is not present (null or undefined)');
}
