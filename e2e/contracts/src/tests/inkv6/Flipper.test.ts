import { assert } from '@dedot/utils';
import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../../../../../examples/scripts/inkv6/flipper/index.js';
import { deployInkv6Flipper, devPairs } from '../../utils.js';

describe('inkv6 Flipper Contract', () => {
  let alicePair = devPairs().alice;
  let contract: Contract<FlipperContractApi>;

  beforeEach(async () => {
    contract = await deployInkv6Flipper(alicePair);
  });

  it('should query initial value', async () => {
    const { data: value } = await contract.query.get();
    expect(value).toBeDefined();
    expect(typeof value).toBe('boolean');
    expect(value).toBe(true); // deployed with initial value true
  });

  it('should flip the value', async () => {
    const { data: initialValue } = await contract.query.get();
    expect(initialValue).toBe(true);

    // Execute flip transaction
    const result = await contract.tx.flip().signAndSend(alicePair).untilFinalized();

    // Verify Flipped event was emitted
    const flippedEvent = contract.events.Flipped.find(result.events);
    assert(flippedEvent, 'Flipped event should be emitted');
    expect(flippedEvent.data.old).toBe(initialValue);
    expect(flippedEvent.data.new).toBe(!initialValue);

    // Query new value
    const { data: newValue } = await contract.query.get();
    expect(newValue).toBe(!initialValue);
  });

  it('should flip with seed', async () => {
    const seed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Execute flipWithSeed transaction
    const result = await contract.tx.flipWithSeed(seed).signAndSend(alicePair).untilFinalized();

    // Verify Flipped event was emitted
    const flippedEvent = contract.events.Flipped.find(result.events);
    assert(flippedEvent, 'Flipped event should be emitted');
  });

  it('should access root storage', async () => {
    const root = await contract.storage.root();

    expect(root.value).toBeDefined();
    expect(typeof root.value).toBe('boolean');

    // Verify root storage matches query
    const { data: queryValue } = await contract.query.get();
    expect(root.value).toBe(queryValue);
  });

  it('should verify storage consistency after flip', async () => {
    // Get initial values
    const { data: initialQuery } = await contract.query.get();
    const initialRoot = await contract.storage.root();

    expect(initialRoot.value).toBe(initialQuery);

    // Flip the value
    await contract.tx.flip().signAndSend(alicePair).untilFinalized();

    // Get new values
    const { data: newQuery } = await contract.query.get();
    const newRoot = await contract.storage.root();

    // Should match and be different from initial
    expect(newRoot.value).toBe(newQuery);
    expect(newQuery).toBe(!initialQuery);
  });

  it('should verify multiple flips with events', async () => {
    const { data: value0 } = await contract.query.get();

    // First flip
    const result1 = await contract.tx.flip().signAndSend(alicePair).untilFinalized();
    const event1 = contract.events.Flipped.find(result1.events);
    assert(event1, 'First Flipped event should be emitted');
    expect(event1.data.old).toBe(value0);
    expect(event1.data.new).toBe(!value0);

    // Second flip
    const result2 = await contract.tx.flip().signAndSend(alicePair).untilFinalized();
    const event2 = contract.events.Flipped.find(result2.events);
    assert(event2, 'Second Flipped event should be emitted');
    expect(event2.data.old).toBe(!value0);
    expect(event2.data.new).toBe(value0);

    // Final value should be back to original
    const { data: finalValue } = await contract.query.get();
    expect(finalValue).toBe(value0);
  });
});
