import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { generateRandomHex } from '@dedot/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractDeployer } from '../ContractDeployer.js';
import { SolRegistry } from '../SolRegistry.js';
import { CREATE1, CREATE2, toEvmAddress } from '../utils/index.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V6,
  FLIPPER_SOL_ABI,
  FLIPPER_SOL_CONTRACT_CODE,
  PSP22_CONTRACT_METADATA,
} from './contracts-metadata.js';

describe('ContractDeployer', () => {
  let api: LegacyClient,
    provider: MockProvider,
    flipper: ContractDeployer,
    psp22: ContractDeployer,
    solFlipper: ContractDeployer;

  describe('api support pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      flipper = new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V4.source.hash);
      psp22 = new ContractDeployer(api, PSP22_CONTRACT_METADATA, PSP22_CONTRACT_METADATA.source.hash);
    });

    it('should found constructor messages meta', () => {
      expect(flipper.tx.new.meta).toBeDefined();
      expect(flipper.query.new.meta).toBeDefined();
      expect(psp22.tx.new.meta).toBeDefined();
      expect(psp22.query.new.meta).toBeDefined();
    });

    it('should throw if constructor meta not found', () => {
      expect(() => flipper.tx.notFound()).toThrowError('Constructor message not found: notFound');
      expect(() => flipper.query.notFound()).toThrowError('Constructor message not found: notFound');
    });

    it('should throw error if invalid code hash or code', () => {
      expect(() => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, '0xffff')).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      const invalidCodeHash = generateRandomHex(128);
      expect(() => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, invalidCodeHash)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      expect(
        () =>
          new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V6.source.contract_binary!),
      ).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_CONTRACT_METADATA_V5.source.wasm!),
      ).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );
    });
  });

  describe('sol contract deployer support', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      solFlipper = new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE);
    });

    it('should create sol contract deployer instance', () => {
      expect(solFlipper).toBeDefined();
      expect(solFlipper.metadata).toBe(FLIPPER_SOL_ABI);
      expect(solFlipper.tx).toBeDefined();
      expect(solFlipper.query).toBeDefined();
      expect(solFlipper.registry).toBeInstanceOf(SolRegistry);
    });

    it('should have sol constructor methods available', () => {
      expect(solFlipper.tx).toBeDefined();
      expect(solFlipper.query).toBeDefined();
    });

    it('should handle sol constructor calls properly', async () => {
      // Sol contracts use a single constructor method, not named constructors
      // The constructor should require proper parameters based on ABI
      // FLIPPER_SOL_ABI constructor requires init_value: bool
      expect(() => solFlipper.tx.constructor()).toThrow('Expected at least 1 arguments, got 0');

      // For async query, we need to handle it differently
      await expect(async () => {
        await solFlipper.query.constructor();
      }).rejects.toThrow('Expected at least 1 arguments, got 0');
    });

    it('should throw error if invalid code hash or code for sol contracts', () => {
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, '0xffff')).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      const invalidCodeHash = generateRandomHex(128);
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, invalidCodeHash)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      // Test with ink contract WASM code for sol contract (should fail)
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_CONTRACT_METADATA_V5.source.wasm!)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );
    });

    it('should accept valid 32-byte hash for sol contracts', () => {
      const validHash = generateRandomHex(32); // 32 bytes, generateRandomHex already includes 0x prefix
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, validHash)).not.toThrow();
    });

    it('should accept valid PVM code for sol contracts', () => {
      // The FLIPPER_SOL_CONTRACT_CODE should be valid PVM bytecode
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE)).not.toThrow();
    });
  });

  describe('revive contract address resolution', () => {
    const signer = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const callOptions = { gasLimit: 1n, storageDepositLimit: 1n } as const;

    const createMockSubmittable = () => {
      const extrinsic: any = {
        call: { palletCall: { params: { ...callOptions } } },
        hooks: undefined,
      };

      extrinsic.withHooks = vi.fn((hooks) => {
        extrinsic.hooks = hooks;
        return extrinsic;
      });

      return extrinsic;
    };

    const createMockClient = () => {
      const extrinsic = createMockSubmittable();
      const instantiateMock = vi.fn(() => extrinsic);
      const accountNonceSpy = vi.fn().mockResolvedValue(0);
      const eventFinder = vi.fn();

      const client: any = {
        tx: {
          revive: {
            call: { meta: {} },
            instantiateWithCode: instantiateMock,
          },
        },
        call: {
          reviveApi: { call: { meta: {} } },
          accountNonceApi: { accountNonce: accountNonceSpy },
        },
        events: {
          revive: { Instantiated: { find: eventFinder } },
        },
      };

      return { client, extrinsic, instantiateMock, accountNonceSpy, eventFinder };
    };

    const scenarios = [
      {
        label: 'ink',
        createDeployer: (client: any) =>
          new ContractDeployer(
            client,
            FLIPPER_CONTRACT_METADATA_V6,
            FLIPPER_CONTRACT_METADATA_V6.source.contract_binary,
            {
              defaultCaller: signer,
            },
          ),
        execute: (deployer: ContractDeployer, options = callOptions) => deployer.tx.new(true, options),
      },
      {
        label: 'sol',
        createDeployer: (client: any) =>
          new ContractDeployer(client, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE, {
            defaultCaller: signer,
          }),
        execute: (deployer: ContractDeployer, options = callOptions) => deployer.tx.constructor(true, options),
      },
    ] as const;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe.each(scenarios)('$label', ({ createDeployer, execute }) => {
      it('should prefers revive.Instantiated event address when available', async () => {
        const { client, extrinsic, instantiateMock, accountNonceSpy, eventFinder } = createMockClient();
        const eventAddress = '0xbeef000000000000000000000000000000000000';
        eventFinder.mockReturnValue({
          pallet: 'Revive',
          palletEvent: { data: { contract: eventAddress } },
        } as any);

        const deployer = createDeployer(client);
        const tx = execute(deployer);

        expect(tx).toBe(extrinsic);
        expect(instantiateMock).toHaveBeenCalledOnce();
        expect(extrinsic.withHooks).toHaveBeenCalledOnce();

        await extrinsic.hooks.beforeSign(tx, signer);
        expect(accountNonceSpy).toHaveBeenCalledWith(signer);

        const result = {
          status: { type: 'Finalized' },
          dispatchError: undefined,
          events: [],
        } as any;

        const augmentedResult = extrinsic.hooks.transformResult(result);
        const address = await augmentedResult.contractAddress();

        expect(eventFinder).toHaveBeenCalledWith(result.events);
        expect(address).toBe(eventAddress);
      });

      it('should falls back to calculated address when revive.Instantiated event missing', async () => {
        const { client, extrinsic, instantiateMock, accountNonceSpy, eventFinder } = createMockClient();

        const deployerNonce = 7;
        accountNonceSpy.mockResolvedValue(deployerNonce);
        eventFinder.mockReturnValue(undefined);

        const deployer = createDeployer(client);
        const tx = execute(deployer);

        expect(tx).toBe(extrinsic);
        expect(instantiateMock).toHaveBeenCalledOnce();

        await extrinsic.hooks.beforeSign(tx, signer);
        expect(accountNonceSpy).toHaveBeenCalledWith(signer);

        const result = {
          status: { type: 'Finalized' },
          dispatchError: undefined,
          events: [],
        } as any;

        const augmentedResult = extrinsic.hooks.transformResult(result);
        const address = await augmentedResult.contractAddress();

        expect(eventFinder).toHaveBeenCalledWith(result.events);
        const expected = CREATE1(toEvmAddress(signer), deployerNonce);
        expect(address).toBe(expected);
      });

      it('should falls back to CREATE2 calculation when salt is provided and event missing', async () => {
        const { client, extrinsic, instantiateMock, accountNonceSpy, eventFinder } = createMockClient();
        const salt = generateRandomHex(32);

        eventFinder.mockReturnValue(undefined);

        const deployer = createDeployer(client);
        // @ts-ignore
        const tx = execute(deployer, { ...callOptions, salt });

        expect(tx).toBe(extrinsic);
        expect(instantiateMock).toHaveBeenCalledOnce();

        await extrinsic.hooks.beforeSign(tx, signer);
        expect(accountNonceSpy).not.toHaveBeenCalled();

        const result = {
          status: { type: 'Finalized' },
          dispatchError: undefined,
          events: [],
        } as any;

        const augmentedResult = extrinsic.hooks.transformResult(result);
        const address = await augmentedResult.contractAddress();

        const instantiateArgs = instantiateMock.mock.calls[0] as any[];
        const codeArg = instantiateArgs[3];
        const bytesArg = instantiateArgs[4];

        const expected = CREATE2(toEvmAddress(signer), codeArg, bytesArg, salt);
        expect(address).toBe(expected);
      });
    });
  });

  describe('api not support pallet', () => {
    it('should throw error if api not support pallet-contracts', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V4.source.hash),
      ).toThrowError('Pallet Contracts is not available');
    });

    it('should throw error if api not support pallet-revive', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_CONTRACT_METADATA_V6.source.hash),
      ).toThrowError('Pallet Revive is not available');
    });

    it('should throw error if api not support pallet-revive for sol contracts', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE)).toThrowError(
        'Pallet Revive is not available',
      );
    });
  });
});
