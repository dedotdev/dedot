import {
  Contract,
  ContractDeployer,
  ContractInstantiateDispatchError,
  ContractInstantiateLangError,
  ContractLangError,
} from '@dedot/contracts';
import { generateRandomHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { deployFlipperV5, devPairs, flipperV5Metadata, flipperV6Metadata } from '../utils.js';

describe('Errors', () => {
  let alicePair = devPairs().alice;

  describe('Contracts', () => {
    it('should decode error properly', async () => {
      const deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
      const blank = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const salt = generateRandomHex();

      const { data, flags } = await deployer.query.fromSeed(blank, { salt });

      expect(data.isErr && data.err === 'ZeroSum').toEqual(true);
      expect(flags.bits).toEqual(1);
      expect(flags.revert).toEqual(true);
    });

    it('should throw ContractInstantiateDispatchError', async () => {
      const deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
      const salt = generateRandomHex();

      const { raw } = await deployer.query.newDefault({ salt });
      await deployer.tx // --
        .newDefault({ gasLimit: raw.gasRequired, salt })
        .signAndSend(alicePair)
        .untilFinalized();

      expect(deployer.query.newDefault({ gasLimit: raw.gasRequired, salt })).rejects.toThrowError(
        ContractInstantiateDispatchError,
      );
    });

    it('should throw ContractInstantiateLangError', async () => {
      const deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
      const salt = generateRandomHex();

      expect(deployer.query.fromSeed('0x_error', { salt })).rejects.toThrowError(ContractInstantiateLangError);
    });

    it('should throw ContractLangError', async () => {
      const contractAddress = await deployFlipperV5(alicePair);
      const contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });

      expect(contract.query.flipWithSeed('0x_error')).rejects.toThrowError(ContractLangError);
    });

    it('should throw error when contract not existed', async () => {
      const fakeAddress = generateRandomHex(32);

      const contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, fakeAddress, {
        defaultCaller: alicePair.address,
      });

      expect(contract.query.flip()).rejects.toThrowError(
        new Error(`Contract with address ${fakeAddress} does not exist on chain!`),
      );
    });
  });

  describe('Revive', () => {
    it('should decode error properly', async () => {
      const deployer = new ContractDeployer<FlipperContractApi>(
        reviveClient, // prettier-end-here
        flipperV6Metadata,
        flipperV6Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
      const blank = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const salt = generateRandomHex();

      const { data, flags } = await deployer.query.fromSeed(blank, { salt });

      expect(data.isErr && data.err === 'ZeroSum').toEqual(true);
      expect(flags.bits).toEqual(1);
      expect(flags.revert).toEqual(true);
    });

    it('should throw ContractInstantiateDispatchError', async () => {
      const deployer = new ContractDeployer<FlipperContractApi>(
        reviveClient, // prettier-end-here
        flipperV6Metadata,
        flipperV6Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
      const salt = generateRandomHex();

      const { raw } = await deployer.query.newDefault({ salt });
      await deployer.tx // --
        .newDefault({ gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value, salt })
        .signAndSend(alicePair)
        .untilFinalized();

      expect(deployer.query.newDefault({ salt })).rejects.toThrowError(ContractInstantiateDispatchError);
    });

    it('should throw error when contract not existed', async () => {
      const fakeAddress = generateRandomHex(20);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, fakeAddress, {
        defaultCaller: alicePair.address,
      });

      expect(contract.query.flip()).rejects.toThrowError(
        new Error(`Contract with address ${fakeAddress} does not exist on chain!`),
      );
    });
  });
});
