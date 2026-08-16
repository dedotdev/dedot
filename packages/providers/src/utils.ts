import { DedotError } from '@dedot/utils';

/**
 * Picks a random item from an array, optionally excluding a specific item
 *
 * @param items Array of items to select from
 * @param excludeItem Optional item to exclude from selection
 * @returns A randomly selected item
 * @throws Error if the items array is empty
 */
export function pickRandomItem<T>(items: T[], excludeItem?: T): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }

  const availableItems = excludeItem !== undefined ? items.filter((item) => item !== excludeItem) : items;

  // Fallback to original array if no items left after filtering
  const finalItems = availableItems.length > 0 ? availableItems : items;

  return finalItems[Math.floor(Math.random() * finalItems.length)];
}

/**
 * Check whether the current runtime is able to send custom headers
 * along with the websocket opening handshake.
 *
 * Both the `ws` package (used on Node.js < 22) and the native `WebSocket`
 * implementation (Node.js >= 22, Bun) accept an options object as the second
 * constructor argument. Browsers (and Deno) follow the WHATWG spec where the
 * second argument is a list of subprotocols, so custom headers cannot be set there.
 */
export function canSendRequestHeaders(): boolean {
  const global = globalThis as any;

  // Deno exposes `process.versions.node` for compatibility reasons,
  // but its WebSocket implementation follows the WHATWG spec
  if (global.Deno) return false;

  const versions = global.process?.versions;

  return !!(versions?.node || versions?.bun);
}

/**
 * Validate that an endpoint is properly formatted
 */
export function validateEndpoint(endpoint: string): string {
  if (!endpoint || (!endpoint.startsWith('ws://') && !endpoint.startsWith('wss://'))) {
    throw new DedotError(`Invalid websocket endpoint ${endpoint}, a valid endpoint should start with wss:// or ws://`);
  }

  return endpoint;
}
