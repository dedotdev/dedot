import { ISubstrateClient } from '@dedot/api';
import { IEventRecord } from '@dedot/types';
import { assert, DedotError, HexString, isEvmAddress, toHex, toU8a } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolRegistry } from './SolRegistry';
import { TypinkRegistry } from './TypinkRegistry.js';
import { SolEventExecutor, SolQueryExecutor, SolTxExecutor } from './executor';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/ink/index.js';
import {
  AB,
  ContractAddress,
  ContractEvent,
  ContractMetadata,
  ExecutionOptions,
  GenericContractApi,
  LooseContractMetadata,
  RootLayoutV5,
  SolAbi,
} from './types/index.js';
import {
  ensurePalletPresence,
  ensurePalletRevive,
  ensureStorageApiSupports,
  ensureSupportedContractMetadataVersion,
  ensureValidContractAddress,
  newProxyChain,
} from './utils/index.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: AB<ContractApi['types']['MetadataType'], TypinkRegistry, SolRegistry>;
  readonly #metadata: AB<ContractApi['types']['MetadataType'], ContractMetadata, SolAbi>;
  readonly #address: ContractAddress;
  readonly #isInk: boolean = false;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | SolAbi | string,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    this.#metadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    this.#isInk = !Array.isArray(metadata);

    if (this.#isInk) {
      ensureSupportedContractMetadataVersion(this.metadata as ContractMetadata);
      const getStorage = this.#getStorage.bind(this);

      // @ts-ignore
      this.#registry = new TypinkRegistry(this.metadata as ContractMetadata, { getStorage });

      ensurePalletPresence(client, this.registry as TypinkRegistry);
      ensureValidContractAddress(address, this.registry as TypinkRegistry);
    } else {
      // @ts-ignore
      this.#registry = new SolRegistry(new Interface(this.metadata as SolAbi));

      ensurePalletRevive(client);
      assert(
        isEvmAddress(address as HexString),
        `Invalid contract address: ${address}. Expected an EVM 20-byte address as a hex string or a Uint8Array`,
      );
    }

    this.#address = address;
    this.#options = options;
  }

  decodeEvent(eventRecord: IEventRecord): ContractEvent {
    return this.#registry.decodeEvent(eventRecord, this.address);
  }

  decodeEvents(eventRecords: IEventRecord[]): ContractEvent[] {
    return this.#registry.decodeEvents(eventRecords, this.address);
  }

  get address(): ContractAddress {
    return this.#address;
  }

  get metadata(): AB<ContractApi['types']['MetadataType'], ContractMetadata, SolAbi> {
    return this.#metadata;
  }

  get registry(): AB<ContractApi['types']['MetadataType'], TypinkRegistry, SolRegistry> {
    return this.#registry;
  }

  get query(): ContractApi['query'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new QueryExecutor(this.client, this.#registry as TypinkRegistry, this.#address, this.#options)
        : new SolQueryExecutor(this.client, this.#registry as SolRegistry, this.address, this.options),
    ) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new TxExecutor(this.client, this.#registry as TypinkRegistry, this.#address, this.#options)
        : new SolTxExecutor(this.client, this.#registry as SolRegistry, this.address, this.options),
    ) as ContractApi['tx'];
  }

  get events(): ContractApi['events'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new EventExecutor(this.client, this.#registry as TypinkRegistry, this.#address, this.#options)
        : new SolEventExecutor(this.client, this.#registry as SolRegistry, this.address, this.options),
    ) as ContractApi['events'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }

  get storage(): ContractApi['storage'] {
    if (!this.#isInk) {
      throw new Error('Storage API is only available for ink! contracts');
    }

    return {
      // @ts-ignore
      root: async (): Promise<ContractApi['types']['RootStorage']> => {
        ensureStorageApiSupports((this.metadata as ContractMetadata).version);

        const { ty, root_key } = (this.metadata as ContractMetadata).storage.root as RootLayoutV5;

        const rawValue = await this.#getStorage(root_key as HexString);

        // @ts-ignore
        return (this.registry as TypinkRegistry).findCodec(ty).tryDecode(rawValue);
      },
      // @ts-ignore
      lazy: (): ContractApi['types']['LazyStorage'] => {
        ensureStorageApiSupports((this.metadata as ContractMetadata).version);

        const { ty } = (this.metadata as ContractMetadata).storage.root as RootLayoutV5;

        const $lazyCodec = (this.registry as TypinkRegistry).createLazyCodec(ty);

        // @ts-ignore
        return $lazyCodec ? $lazyCodec.tryDecode('0x') : {};
      },
    };
  }

  #getStorage = async (key: Uint8Array | HexString): Promise<HexString | undefined> => {
    const result = await (async () => {
      if ((this.registry as TypinkRegistry).isRevive()) {
        return await this.client.call.reviveApi.getStorageVarKey(
          this.address as HexString, //--
          toHex(key),
        );
      } else {
        return await this.client.call.contractsApi.getStorage(
          this.address, //--
          toU8a(key),
        );
      }
    })();

    if (result.isOk) {
      return result.value;
    }

    throw new DedotError(result.err);
  };
}
