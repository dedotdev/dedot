import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { devPairs, flipperV5Metadata, flipperV6Metadata, deployFlipperV5, deployFlipperV6 } from '../utils.js';

describe('Contract', () => {
  let contract: Contract<FlipperContractApi>;
  let alicePair = devPairs().alice;

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
    });

    it('should run tx properly', async () => {
      // Dry-run to estimate gas fee
      const { data: state } = await contract.query.get();

      expect(state).toBeDefined();
      console.log('Before state:', state);

      const { raw } = await contract.query.flip();
      await contract.tx
        .flip({ gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value })
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
      contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });
    });

    it('should dry run contract properly', async () => {
      const result = await contract.query.get();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should run tx properly', async () => {
      // Dry-run to estimate gas fee
      const { data: state } = await contract.query.get();

      expect(state).toBeDefined();
      console.log('Before state:', state);

      const { raw } = await contract.query.flip();
      await contract.tx
        .flip({ gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value })
        .signAndSend(alicePair)
        .untilFinalized();

      const { data: newState } = await contract.query.get();

      expect(newState).toBeDefined();
      expect(newState).toEqual(!state);
      console.log('After state:', newState);
    });
  });
});
