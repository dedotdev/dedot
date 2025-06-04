import { Contract, ContractDeployer, create1, create2, toEthAddress } from '@dedot/contracts';
import { generateRandomHex } from '@dedot/utils';
import { beforeAll, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { devPairs, flipperV5Metadata, flipperV6Metadata } from '../utils.js';

describe('ContractDeployer', () => {
  let alicePair = devPairs().alice;

  describe('Contracts', () => {
    let deployer: ContractDeployer<FlipperContractApi>;
    beforeAll(async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
    });

    it('should dry run properly', async () => {
      const result = await deployer.query.new(true);

      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.flags).toBeDefined();
    });

    it('should deploy contract properly', async () => {
      const salt = generateRandomHex();

      const { raw } = await deployer.query.new(true, {
        salt,
      });

      const { events } = await deployer.tx
        .new(true, { gasLimit: raw.gasRequired, salt })
        .signAndSend(alicePair)
        .untilFinalized();

      const instantiatedEvent = contractsClient.events.contracts.Instantiated.find(events);

      expect(instantiatedEvent).toBeDefined();

      const contractAddress = instantiatedEvent!.palletEvent.data.contract.raw;
      const contract = new Contract<FlipperContractApi>(contractsClient, flipperV5Metadata, contractAddress!, {
        defaultCaller: alicePair.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });
  });

  describe('Revive', () => {
    let deployer: ContractDeployer<FlipperContractApi>;
    beforeAll(async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        reviveClient,
        flipperV6Metadata,
        flipperV6Metadata.source.code!,
        {
          defaultCaller: alicePair.address,
        },
      );
    });

    it('should dryrun properly', async () => {
      const result = await deployer.query.new(true);

      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.flags).toBeDefined();
    });

    it('should deploy contract without salt properly', async () => {
      const result = await deployer.query.new(true);

      const nonce = await reviveClient.call.accountNonceApi.accountNonce(alicePair.address);
      const contractAddress = create1(toEthAddress(alicePair.address), nonce);

      await deployer.tx
        .new(true, { gasLimit: result.raw.gasRequired, storageDepositLimit: result.raw.storageDeposit.value })
        .signAndSend(alicePair)
        .untilFinalized();

      console.log('Deployed contract address:', contractAddress);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    it('should deploy contract with salt properly', async () => {
      const salt = generateRandomHex();
      const { raw } = await deployer.query.new(true, { salt });

      const contractAddress = create2(
        toEthAddress(alicePair.address),
        flipperV6Metadata.source.code!,
        raw.inputBytes!,
        salt,
      );

      await deployer.tx
        .new(true, { gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value, salt })
        .signAndSend(alicePair)
        .untilFinalized();

      console.log('Deployed contract address:', contractAddress);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alicePair.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });
  });
});
