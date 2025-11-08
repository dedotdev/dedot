import { Contract, isSolContractExecutionError } from 'dedot/contracts';
import { assert } from 'dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../../../../../examples/scripts/sol/flipper/index.js';
import { deploySolFlipper, devPairs } from '../../utils.js';

describe('sol Flipper Contract', () => {
  let alicePair = devPairs().alice;
  let contract: Contract<FlipperContractApi>;

  beforeEach(async () => {
    contract = await deploySolFlipper(alicePair);
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
    const flippedEvents = contract.events.Flipped.filter(result.events);
    expect(flippedEvents.length).toBe(1);
    expect(flippedEvents[0].data.old_value).toBe(initialValue);
    expect(flippedEvents[0].data.new_value).toBe(!initialValue);

    // Query new value
    const { data: newValue } = await contract.query.get();
    expect(newValue).toBe(!initialValue);
  });

  it('should flip with struct', async () => {
    const { data: initialValue } = await contract.query.get();

    // Execute flip with should_flip: true
    const result = await contract.tx
      .flipWithStruct({ should_flip: true, reason: 'I need you to flip!' })
      .signAndSend(alicePair)
      .untilFinalized();

    // Verify Flipped event was emitted
    const flippedEvents = contract.events.Flipped.filter(result.events);
    expect(flippedEvents.length).toBe(1);

    // Query new value
    const { data: newValue } = await contract.query.get();
    expect(newValue).toBe(!initialValue);
  });

  it('should handle throwUnitError', async () => {
    try {
      await contract.query.throwUnitError();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a custom contract error');
      expect(error.message).toBe('Error: UnitError');
      expect(error.details).toBeDefined();
    }
  });

  it('should handle throwErrorWithParams', async () => {
    try {
      await contract.query.throwErrorWithParams();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a custom contract error');
      expect(error.message).toBe('Error: ErrorWithParams');
      expect(error.details).toBeDefined();
    }
  });

  it('should handle throwErrorWithNamedParams', async () => {
    try {
      await contract.query.throwErrorWithNamedParams();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a custom contract error');
      expect(error.details).toBeDefined();
    }
  });

  it('should track multiple flips with events', async () => {
    const flips = 3;
    const events = [];

    for (let i = 0; i < flips; i++) {
      const { data: before } = await contract.query.get();
      const result = await contract.tx.flip().signAndSend(alicePair).untilFinalized();
      const { data: after } = await contract.query.get();

      const flippedEvents = contract.events.Flipped.filter(result.events);
      expect(flippedEvents.length).toBe(1);
      expect(flippedEvents[0].data.old_value).toBe(before);
      expect(flippedEvents[0].data.new_value).toBe(after);

      events.push(...flippedEvents);
    }

    expect(events.length).toBe(flips);
  });

  it('should verify dry-run does not change state', async () => {
    const { data: initialValue } = await contract.query.get();

    // Dry-run flip (query)
    const dryRunResult = await contract.query.flip();
    expect(dryRunResult).toBeDefined();

    // Value should remain unchanged
    const { data: valueAfterDryRun } = await contract.query.get();
    expect(valueAfterDryRun).toBe(initialValue);
  });
});
