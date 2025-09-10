import { Contract, ContractDeployer, CREATE1, CREATE2, toEvmAddress } from 'dedot/contracts';
import { assert, generateRandomHex } from 'dedot/utils';
import { beforeAll, describe, expect, it } from 'vitest';
import { FlipperContractApi } from '../contracts/flipper';
import { devPairs, flipperV5Metadata, flipperV6Metadata } from '../utils.js';

describe('ContractDeployer', () => {
  let alice = devPairs().alice;

  describe('Contracts', () => {
    let deployer: ContractDeployer<FlipperContractApi>;
    beforeAll(async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.wasm!,
        { defaultCaller: alice.address },
      );
    });

    it('should dry run properly', async () => {
      const result = await deployer.query.new(true);

      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.inputData).toBeDefined();
    });

    it('should deploy contract properly using wasm', async () => {
      const salt = generateRandomHex();

      const { raw } = await deployer.query.new(true, {
        salt,
      });

      const { events } = await deployer.tx
        .new(true, { gasLimit: raw.gasRequired, salt })
        .signAndSend(alice)
        .untilFinalized();

      const instantiatedEvent = contractsClient.events.contracts.Instantiated.find(events);

      expect(instantiatedEvent).toBeDefined();

      const contractAddress = instantiatedEvent!.palletEvent.data.contract.raw;
      const contract = new Contract<FlipperContractApi>(
        contractsClient, // --
        flipperV5Metadata,
        contractAddress!,
        { defaultCaller: alice.address },
      );

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    it('should deploy contract properly using code hash', async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        contractsClient, // prettier-end-here
        flipperV5Metadata,
        flipperV5Metadata.source.hash,
        { defaultCaller: alice.address },
      );

      await deployer.client.tx.contracts
        .uploadCode(flipperV5Metadata.source.wasm!, undefined, 'Enforced')
        .signAndSend(alice)
        .untilFinalized();

      const salt = generateRandomHex();

      const { raw } = await deployer.query.new(true, {
        salt,
      });

      const { events } = await deployer.tx
        .new(true, { gasLimit: raw.gasRequired, salt })
        .signAndSend(alice)
        .untilFinalized();

      const instantiatedEvent = contractsClient.events.contracts.Instantiated.find(events);

      expect(instantiatedEvent).toBeDefined();

      const contractAddress = instantiatedEvent!.palletEvent.data.contract.raw;
      const contract = new Contract<FlipperContractApi>(
        contractsClient, // --
        flipperV5Metadata,
        contractAddress!,
        { defaultCaller: alice.address },
      );

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    describe('auto dry-run', () => {
      it('should deploy contract properly using wasm', async () => {
        const salt = generateRandomHex();

        const txResult = await deployer.tx
          .new(true, { salt }) // --
          .signAndSend(alice)
          .untilFinalized();

        const contract = await txResult.contract();
        const value = await contract.query.get();
        expect(value).toBeDefined();
        expect(value.data).toBeDefined();
        expect(value.data).toEqual(true);
      });

      it('should deploy contract properly using code hash', async () => {
        deployer = new ContractDeployer<FlipperContractApi>(
          contractsClient, // prettier-end-here
          flipperV5Metadata,
          flipperV5Metadata.source.hash,
          { defaultCaller: alice.address },
        );

        await deployer.client.tx.contracts
          .uploadCode(flipperV5Metadata.source.wasm!, undefined, 'Enforced')
          .signAndSend(alice)
          .untilFinalized();

        const salt = generateRandomHex();

        const txResult = await deployer.tx
          .new(true, { salt }) // --
          .signAndSend(alice)
          .untilFinalized();

        const contract = await txResult.contract();

        const value = await contract.query.get();
        expect(value).toBeDefined();
        expect(value.data).toBeDefined();
        expect(value.data).toEqual(true);
      });
    });
  });

  describe('Revive', () => {
    let deployer: ContractDeployer<FlipperContractApi>;
    beforeAll(async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        reviveClient,
        flipperV6Metadata,
        flipperV6Metadata.source.contract_binary!,
        { defaultCaller: alice.address },
      );
    });

    it('should dry run properly', async () => {
      const result = await deployer.query.new(true);

      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.inputData).toBeDefined();
    });

    it('should deploy contract using code hash properly', async () => {
      deployer = new ContractDeployer<FlipperContractApi>(
        reviveClient,
        flipperV6Metadata,
        flipperV6Metadata.source.hash!,
        {
          defaultCaller: alice.address,
        },
      );

      const dryRunResult = await reviveClient.call.reviveApi.uploadCode(
        alice.address,
        flipperV6Metadata.source.contract_binary!,
        undefined,
      );

      assert(dryRunResult.isOk, 'Dry run result should be ok');

      await reviveClient.tx.revive
        .uploadCode(flipperV6Metadata.source.contract_binary!, dryRunResult.value.deposit)
        .signAndSend(alice)
        .untilFinalized();

      const result = await deployer.query.new(true);

      const nonce = await reviveClient.call.accountNonceApi.accountNonce(alice.address);
      const contractAddress = CREATE1(toEvmAddress(alice.address), nonce);

      await deployer.tx
        .new(true, { gasLimit: result.raw.gasRequired, storageDepositLimit: result.raw.storageDeposit.value })
        .signAndSend(alice)
        .untilFinalized();

      console.log('Deployed contract address:', contractAddress);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alice.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    it('should deploy contract without salt properly', async () => {
      const result = await deployer.query.new(true);

      const nonce = await reviveClient.call.accountNonceApi.accountNonce(alice.address);
      const contractAddress = CREATE1(toEvmAddress(alice.address), nonce);

      await deployer.tx
        .new(true, { gasLimit: result.raw.gasRequired, storageDepositLimit: result.raw.storageDeposit.value })
        .signAndSend(alice)
        .untilFinalized();

      console.log('Deployed contract address:', contractAddress);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alice.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    it('should deploy contract with salt properly', async () => {
      const salt = generateRandomHex();
      const { raw, inputData } = await deployer.query.new(true, { salt });

      const contractAddress = CREATE2(
        toEvmAddress(alice.address),
        flipperV6Metadata.source.contract_binary!,
        inputData,
        salt,
      );

      await deployer.tx
        .new(true, { gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value, salt })
        .signAndSend(alice)
        .untilFinalized();

      console.log('Deployed contract address:', contractAddress);

      const contract = new Contract<FlipperContractApi>(reviveClient, flipperV6Metadata, contractAddress, {
        defaultCaller: alice.address,
      });

      const value = await contract.query.get();
      expect(value).toBeDefined();
      expect(value.data).toBeDefined();
      expect(value.data).toEqual(true);
    });

    describe('auto dry-run', () => {
      it('should deploy contract using code hash properly', async () => {
        deployer = new ContractDeployer<FlipperContractApi>(
          reviveClient,
          flipperV6Metadata,
          flipperV6Metadata.source.hash!,
          { defaultCaller: alice.address },
        );

        const dryRun = await reviveClient.call.reviveApi.uploadCode(
          alice.address,
          flipperV6Metadata.source.contract_binary!,
        );

        assert(dryRun.isOk, 'Dry run result should be ok');

        await reviveClient.tx.revive
          .uploadCode(flipperV6Metadata.source.contract_binary!, dryRun.value.deposit)
          .signAndSend(alice)
          .untilFinalized();

        const txResult = await deployer.tx
          .new(true) // --
          .signAndSend(alice)
          .untilFinalized();

        console.log('Deployed contract address:', await txResult.contractAddress());

        const contract = await txResult.contract();

        const value = await contract.query.get();
        expect(value).toBeDefined();
        expect(value.data).toBeDefined();
        expect(value.data).toEqual(true);
      });

      it('should deploy contract without salt properly', async () => {
        const txResult = await deployer.tx // --
          .new(true)
          .signAndSend(alice)
          .untilFinalized();

        console.log('Deployed contract address:', await txResult.contractAddress());

        const contract = await txResult.contract();

        const value = await contract.query.get();
        expect(value).toBeDefined();
        expect(value.data).toBeDefined();
        expect(value.data).toEqual(true);
      });

      it('should deploy contract with salt properly', async () => {
        const salt = generateRandomHex();

        const txResult = await deployer.tx
          .new(true, { salt }) // --
          .signAndSend(alice)
          .untilFinalized();

        console.log('Deployed contract address:', await txResult.contractAddress());

        const contract = await txResult.contract();

        const value = await contract.query.get();
        expect(value).toBeDefined();
        expect(value.data).toBeDefined();
        expect(value.data).toEqual(true);
      });
    });
  });
});
