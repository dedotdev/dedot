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
