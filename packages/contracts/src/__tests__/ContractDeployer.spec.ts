import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { AccountId32 } from '@dedot/codecs';
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
          revive: { Instantiated: { filter: eventFinder } },
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
        eventFinder.mockReturnValue([
          {
            pallet: 'Revive',
            palletEvent: { data: { deployer: toEvmAddress(signer), contract: eventAddress } },
          },
        ] as any);

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

      const resolveAddress = async (instantiatedEvents: any[]) => {
        const { client, extrinsic, eventFinder } = createMockClient();
        eventFinder.mockReturnValue(instantiatedEvents);

        const tx = execute(createDeployer(client));
        await extrinsic.hooks.beforeSign(tx, signer);

        const result = { status: { type: 'Finalized' }, dispatchError: undefined, events: [] } as any;
        return extrinsic.hooks.transformResult(result).contractAddress();
      };

      const reviveEvent = (deployer: string, contract: string) => ({
        pallet: 'Revive',
        palletEvent: { name: 'Instantiated', data: { deployer, contract } },
      });

      it('should return the parent address when the constructor instantiates a child contract', async () => {
        const parent = '0xaaaa000000000000000000000000000000000000';
        const child = '0xcccc000000000000000000000000000000000000';

        // The child is instantiated by the parent's constructor, so its event is emitted first
        const address = await resolveAddress([
          reviveEvent(parent, child), // --
          reviveEvent(toEvmAddress(signer), parent),
        ]);

        expect(address).toBe(parent);
      });

      it('should match the deployer regardless of the events order & address casing', async () => {
        const parent = '0xaaaa000000000000000000000000000000000000';
        const child = '0xcccc000000000000000000000000000000000000';

        const address = await resolveAddress([
          reviveEvent(toEvmAddress(signer).toUpperCase().replace('0X', '0x'), parent), // --
          reviveEvent(parent, child),
        ]);

        expect(address).toBe(parent);
      });

      it('should fall back to the last Instantiated event when no deployer matches the signer', async () => {
        const parent = '0xaaaa000000000000000000000000000000000000';
        const child = '0xcccc000000000000000000000000000000000000';
        const someoneElse = '0xdddd000000000000000000000000000000000000';

        const address = await resolveAddress([
          reviveEvent(parent, child), // --
          reviveEvent(someoneElse, parent),
        ]);

        expect(address).toBe(parent);
      });

      it('should falls back to calculated address when revive.Instantiated event missing', async () => {
        const { client, extrinsic, instantiateMock, accountNonceSpy, eventFinder } = createMockClient();

        const deployerNonce = 7;
        accountNonceSpy.mockResolvedValue(deployerNonce);
        eventFinder.mockReturnValue([]);

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

        eventFinder.mockReturnValue([]);

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

  describe('contracts pallet address resolution', () => {
    const signer = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // alice
    const parent = '5DMM7EfBsEezzFrSbVBNz8gr4v83c8qXBK8DqBuBkTPsKEA2';
    const child = '5FpuGwoj1nt2Lb4Fg8bU1aHTeTn3DkDagrJaduFsmf7kZa22';

    const contractsEvent = (deployer: string, contract: string) => ({
      pallet: 'Contracts',
      palletEvent: {
        name: 'Instantiated',
        data: { deployer: new AccountId32(deployer), contract: new AccountId32(contract) },
      },
    });

    const resolveAddress = async (instantiatedEvents: any[]) => {
      const extrinsic: any = {
        call: { palletCall: { params: { gasLimit: 1n } } },
        hooks: undefined,
      };

      extrinsic.withHooks = vi.fn((hooks) => {
        extrinsic.hooks = hooks;
        return extrinsic;
      });

      const client: any = {
        tx: { contracts: { call: { meta: {} }, instantiateWithCode: vi.fn(() => extrinsic) } },
        call: { contractsApi: { call: { meta: {} } } },
        events: { contracts: { Instantiated: { filter: vi.fn(() => instantiatedEvents) } } },
      };

      const deployer = new ContractDeployer(
        client, // --
        FLIPPER_CONTRACT_METADATA_V5,
        FLIPPER_CONTRACT_METADATA_V5.source.wasm!,
        { defaultCaller: signer },
      );

      const tx = deployer.tx.new(true, { gasLimit: 1n } as any);
      await extrinsic.hooks.beforeSign(tx, signer);

      const result = { status: { type: 'Finalized' }, dispatchError: undefined, events: [] } as any;
      return extrinsic.hooks.transformResult(result).contractAddress();
    };

    it('should return the address of a single instantiated contract', async () => {
      expect(await resolveAddress([contractsEvent(signer, parent)])).toBe(parent);
    });

    it('should return the parent address when the constructor instantiates a child contract', async () => {
      // The child is instantiated by the parent's constructor, so its event is emitted first
      const address = await resolveAddress([
        contractsEvent(parent, child), // --
        contractsEvent(signer, parent),
      ]);

      expect(address).toBe(parent);
    });

    it('should return the parent address when the constructor instantiates multiple contracts', async () => {
      const grandChild = '5GzWBRd6BJihRDaKbwGzs1yEXbv4EGCdSbWwgySvAyHmTQAo';

      const address = await resolveAddress([
        contractsEvent(child, grandChild), // --
        contractsEvent(parent, child),
        contractsEvent(signer, parent),
      ]);

      expect(address).toBe(parent);
    });

    it('should fall back to the last Instantiated event when no deployer matches the signer', async () => {
      const someoneElse = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'; // bob

      const address = await resolveAddress([
        contractsEvent(parent, child), // --
        contractsEvent(someoneElse, parent),
      ]);

      expect(address).toBe(parent);
    });

    it('should throw if there is no Instantiated event', async () => {
      await expect(resolveAddress([])).rejects.toThrowError('Contracts.Instantiated event not found');
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
