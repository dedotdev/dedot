import { assert } from '@dedot/utils';
import { Contract, isSolContractExecutionError } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { FlipperSolContractApi } from '../contracts/flipper-sol';
import {
  devPairs,
  flipperV5Metadata,
  flipperV6Metadata,
  deployFlipperV5,
  deployFlipperV6,
  deployFlipperSol,
} from '../utils.js';

describe('Contract', () => {
  let alicePair = devPairs().alice;

  describe('ink! contract support', () => {
    let contract: Contract<FlipperContractApi>;
    describe('Contracts', () => {
      beforeEach(async () => {
        const contractAddress = await deployFlipperV5(alicePair);
        contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, contractAddress, {
          defaultCaller: alicePair.address,
        });
      });

      it('should dry run contract properly', async () => {
        const result = await contract.query.get();

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.inputData).toBeDefined();
      });

      it('should run tx properly', async () => {
        // Dry-run to estimate gas fee
        const { data: state } = await contract.query.get();

        expect(state).toBeDefined();
        console.log('Before state:', state);

        const { raw } = await contract.query.flip();
        await contract.tx
          .flip({ gasLimit: raw.gasRequired }) // --
          .signAndSend(alicePair)
          .untilFinalized();

        const { data: newState } = await contract.query.get();

        expect(newState).toBeDefined();
        expect(newState).toEqual(!state);
        console.log('After state:', newState);
      });

      it('should auto dry-run tx properly', async () => {
        const { data: state } = await contract.query.get();

        expect(state).toBeDefined();
        console.log('Before state:', state);

        await contract.tx
          .flip() // --
          .signAndSend(alicePair)
          .untilFinalized();

        const { data: newState } = await contract.query.get();

        expect(newState).toBeDefined();
        expect(newState).toEqual(!state);
        console.log('After state:', newState);
      });
    });

    describe('Revive', () => {
      beforeEach(async () => {
        const contractAddress = await deployFlipperV6(alicePair);
        contract = new Contract<FlipperContractApi>(
          reviveClient, // --
          flipperV6Metadata,
          contractAddress,
          { defaultCaller: alicePair.address },
        );
      });

      it('should dry run contract properly', async () => {
        const result = await contract.query.get();

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.inputData).toBeDefined();
      });

      it('should run tx properly', async () => {
        // Dry-run to estimate gas fee
        const { data: state } = await contract.query.get();

        expect(state).toBeDefined();
        console.log('Before state:', state);

        const { raw } = await contract.query.flip();
        await contract.tx
          .flip({
            gasLimit: raw.gasRequired,
            storageDepositLimit: raw.storageDeposit.value,
          })
          .signAndSend(alicePair)
          .untilFinalized();

        const { data: newState } = await contract.query.get();

        expect(newState).toBeDefined();
        expect(newState).toEqual(!state);
        console.log('After state:', newState);
      });

      it('should auto dry-run tx properly', async () => {
        // Dry-run to estimate gas fee
        const { data: state } = await contract.query.get();

        expect(state).toBeDefined();
        console.log('Before state:', state);

        await contract.tx
          .flip()
          .signAndSend(alicePair) // --
          .untilFinalized();

        const { data: newState } = await contract.query.get();

        expect(newState).toBeDefined();
        expect(newState).toEqual(!state);
        console.log('After state:', newState);
      });
    });
  });

  describe('solidity contract support', () => {
    let contract: Contract<FlipperSolContractApi>;

    beforeEach(async () => {
      contract = await deployFlipperSol(alicePair);
    });

    it('should dry run sol contract properly', async () => {
      const result = await contract.query.get();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.inputData).toBeDefined();
      expect(typeof result.data).toBe('boolean');
    });

    it('should run sol contract tx properly', async () => {
      // Get initial state
      const { data: state } = await contract.query.get();

      expect(state).toBeDefined();
      expect(typeof state).toBe('boolean');
      console.log('Before state:', state);

      // Execute flip transaction
      const { raw } = await contract.query.flip();
      const { events } = await contract.tx
        .flip({
          gasLimit: raw.gasRequired,
          storageDepositLimit: raw.storageDeposit.value,
        })
        .signAndSend(alicePair)
        .untilFinalized();

      // Check for Flipped events
      const flippedEvents = contract.events.Flipped.filter(events);
      expect(flippedEvents).toHaveLength(1);
      expect(flippedEvents[0].data.old).toBe(state);
      expect(flippedEvents[0].data.new).toBe(!state);

      // Verify state changed
      const { data: newState } = await contract.query.get();
      expect(newState).toBeDefined();
      expect(newState).toEqual(!state);
      console.log('After state:', newState);
    });

    it('should auto dry-run sol contract tx properly', async () => {
      const { data: state } = await contract.query.get();

      expect(state).toBeDefined();
      console.log('Before state:', state);

      const { events } = await contract.tx.flip().signAndSend(alicePair).untilFinalized();

      // Check events
      const flippedEvents = contract.events.Flipped.filter(events);
      expect(flippedEvents).toHaveLength(1);

      const { data: newState } = await contract.query.get();
      expect(newState).toBeDefined();
      expect(newState).toEqual(!state);
      console.log('After state:', newState);
    });

    it('should handle sol contract error functions', async () => {
      try {
        await contract.query.throwUnitError();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        assert(isSolContractExecutionError(error), 'Should be a custom contract error');
        expect(error.message).toBe('Error: UnitError');
        expect(error.details).toBeDefined();
      }

      try {
        await contract.query.throwErrorWithParams();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        assert(isSolContractExecutionError(error), 'Should be a custom contract error');
        expect(error.message).toBe('Error: ErrorWithParams');
        expect(error.details).toBeDefined();
      }

      try {
        await contract.query.throwErrorWithNamedParams();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        assert(isSolContractExecutionError(error), 'Should be a custom contract error');
        expect(error.details).toBeDefined();
      }
    });
  });
});
