import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageContractApi } from '../../../../../examples/scripts/sol/storage/index.js';
import { deploySolStorage, devPairs } from '../../utils.js';

describe('sol Storage Contract', () => {
  let alicePair = devPairs().alice;
  let contract: Contract<StorageContractApi>;

  beforeEach(async () => {
    contract = await deploySolStorage(alicePair);
  });

  it('should have initial value of 0', async () => {
    const { data: value } = await contract.query.retrieve();
    expect(value).toBeDefined();
    expect(value).toBe(0n);
  });

  it('should store a new value', async () => {
    const newValue = 42n;

    // Store the value
    await contract.tx.store(newValue).signAndSend(alicePair).untilFinalized();

    // Retrieve and verify
    const { data: retrievedValue } = await contract.query.retrieve();
    expect(retrievedValue).toBe(newValue);
  });

  it('should update stored value multiple times', async () => {
    const values = [10n, 20n, 30n, 42n, 100n];

    for (const value of values) {
      // Store the value
      await contract.tx.store(value).signAndSend(alicePair).untilFinalized();

      // Verify it was stored
      const { data: retrievedValue } = await contract.query.retrieve();
      expect(retrievedValue).toBe(value);
    }
  });

  it('should handle large numbers', async () => {
    const largeValue = 9999999999999999n;

    // Store the large value
    await contract.tx.store(largeValue).signAndSend(alicePair).untilFinalized();

    // Retrieve and verify
    const { data: retrievedValue } = await contract.query.retrieve();
    expect(retrievedValue).toBe(largeValue);
  });

  it('should store zero', async () => {
    // First store a non-zero value
    await contract.tx.store(42n).signAndSend(alicePair).untilFinalized();

    // Verify it was stored
    const { data: nonZeroValue } = await contract.query.retrieve();
    expect(nonZeroValue).toBe(42n);

    // Now store zero
    await contract.tx.store(0n).signAndSend(alicePair).untilFinalized();

    // Verify zero was stored
    const { data: zeroValue } = await contract.query.retrieve();
    expect(zeroValue).toBe(0n);
  });

  it('should query without changing state', async () => {
    const initialValue = 42n;

    // Store initial value
    await contract.tx.store(initialValue).signAndSend(alicePair).untilFinalized();

    // Query multiple times
    for (let i = 0; i < 5; i++) {
      const { data: value } = await contract.query.retrieve();
      expect(value).toBe(initialValue);
    }

    // Value should still be the same
    const { data: finalValue } = await contract.query.retrieve();
    expect(finalValue).toBe(initialValue);
  });
});
