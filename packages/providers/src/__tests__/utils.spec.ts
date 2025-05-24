import { describe, expect, it, vi } from 'vitest';
import { pickRandomItem } from '../utils.js';

describe('selectRandomItem', () => {
  it('throws error for empty array', () => {
    expect(() => pickRandomItem([])).toThrow('Cannot select from empty array');
  });

  it('returns the only item from single-item array', () => {
    const items = ['only-item'];
    const result = pickRandomItem(items);
    expect(result).toBe('only-item');
  });

  it('returns an item from the array', () => {
    const items = ['item1', 'item2', 'item3'];
    const result = pickRandomItem(items);
    expect(items).toContain(result);
  });

  it('excludes specified item when possible', () => {
    const items = ['item1', 'item2', 'item3'];
    const excludeItem = 'item2';

    // Mock Math.random to always return 0 for predictable testing
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = pickRandomItem(items, excludeItem);

    // Should return first item from filtered array ['item1', 'item3']
    expect(result).toBe('item1');
    expect(result).not.toBe(excludeItem);

    mockRandom.mockRestore();
  });

  it('falls back to original array when all items would be excluded', () => {
    const items = ['only-item'];
    const excludeItem = 'only-item';

    const result = pickRandomItem(items, excludeItem);
    expect(result).toBe('only-item');
  });

  it('works with different data types', () => {
    const numbers = [1, 2, 3, 4, 5];
    const result = pickRandomItem(numbers, 3);
    expect(numbers).toContain(result);

    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const excludeObj = { id: 2 };
    const objResult = pickRandomItem(objects, excludeObj);
    expect(objects).toContain(objResult);
  });

  it('handles undefined excludeItem correctly', () => {
    const items = ['item1', 'item2', 'item3'];
    const result = pickRandomItem(items, undefined);
    expect(items).toContain(result);
  });

  it('distributes selection randomly', () => {
    const items = ['item1', 'item2', 'item3'];
    const results = new Set();

    // Run multiple times to check randomness
    for (let i = 0; i < 100; i++) {
      const result = pickRandomItem(items);
      results.add(result);
    }

    // Should have selected multiple different items
    expect(results.size).toBeGreaterThan(1);
  });

  it('respects exclusion in random distribution', () => {
    const items = ['item1', 'item2', 'item3'];
    const excludeItem = 'item2';
    const results = new Set();

    // Run multiple times to check that excluded item is never selected
    for (let i = 0; i < 100; i++) {
      const result = pickRandomItem(items, excludeItem);
      results.add(result);
    }

    // Should never contain the excluded item
    expect(results.has(excludeItem)).toBe(false);
    // Should contain other items
    expect(results.has('item1')).toBe(true);
    expect(results.has('item3')).toBe(true);
  });
});
