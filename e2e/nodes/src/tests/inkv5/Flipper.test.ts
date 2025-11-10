import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../../../../../examples/scripts/inkv5/flipper/index.js';
import { deployInkv5Flipper, devPairs } from '../../utils.js';

describe('inkv5 Flipper Contract', () => {
  let alicePair = devPairs().alice;
  let contract: Contract<FlipperContractApi>;

  beforeEach(async () => {
    contract = await deployInkv5Flipper(alicePair);
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
    await contract.tx.flip().signAndSend(alicePair).untilFinalized();

    // Query new value
    const { data: newValue } = await contract.query.get();
    expect(newValue).toBe(!initialValue);
  });

  it('should access root storage', async () => {
    const root = await contract.storage.root();

    const rootValue = await root.value.get();
    const rootOwner = await root.owner.get();

    expect(rootValue).toBeDefined();
    expect(rootOwner).toBeDefined();
    expect(typeof rootValue).toBe('boolean');

    // Verify root storage matches query
    const { data: queryValue } = await contract.query.get();
    expect(rootValue).toBe(queryValue);
  });

  it('should access lazy storage', async () => {
    const lazy = contract.storage.lazy();

    const lazyValue = await lazy.value.get();
    const lazyOwner = await lazy.owner.get();

    expect(lazyValue).toBeDefined();
    expect(lazyOwner).toBeDefined();
    expect(typeof lazyValue).toBe('boolean');

    // Verify lazy storage matches query
    const { data: queryValue } = await contract.query.get();
    expect(lazyValue).toBe(queryValue);
  });

  it('should verify storage consistency after flip', async () => {
    // Get initial values from all sources
    const { data: initialQuery } = await contract.query.get();
    const initialRoot = await contract.storage.root();
    const lazy = contract.storage.lazy();
    const initialLazy = await lazy.value.get();

    const initialRootValue = await initialRoot.value.get();

    // All sources should match
    expect(initialRootValue).toBe(initialQuery);
    expect(initialLazy).toBe(initialQuery);

    // Flip the value
    await contract.tx.flip().signAndSend(alicePair).untilFinalized();

    // Get new values from all sources
    const { data: newQuery } = await contract.query.get();
    const newRoot = await contract.storage.root();
    const newLazy = await lazy.value.get();

    const newRootValue = await newRoot.value.get();

    // All sources should still match and be different from initial
    expect(newRootValue).toBe(newQuery);
    expect(newLazy).toBe(newQuery);
    expect(newQuery).toBe(!initialQuery);
  });
});
