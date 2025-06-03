import { ISubstrateClient } from '@dedot/api';
import { IEventRecord } from '@dedot/types';
import { DedotError, HexString, toHex, toU8a } from '@dedot/utils';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import {
  ContractAddress,
  ContractEvent,
  ContractMetadata,
  ExecutionOptions,
  GenericContractApi,
  LooseContractMetadata,
  RootLayoutV5,
} from './types/index.js';
import { checkStorageApiSupports, ensurePalletPresence, newProxyChain, parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: TypinkRegistry;
  readonly #address: ContractAddress;
  readonly #metadata: ContractMetadata;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | string,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    // TODO validate address depends on ink version
    this.#address = address;

    this.#metadata =
      typeof metadata === 'string' // --
        ? parseRawMetadata(metadata)
        : (metadata as ContractMetadata);

    const getStorage = this.#getStorage.bind(this);

    this.#registry = new TypinkRegistry(this.#metadata, { getStorage });

    ensurePalletPresence(client, this.registry);

    this.#options = options;
  }

  decodeEvent(eventRecord: IEventRecord): ContractEvent {
    return this.#registry.decodeEvent(eventRecord, this.address);
  }

  decodeEvents(eventRecords: IEventRecord[]): ContractEvent[] {
    return this.#registry.decodeEvents(eventRecords, this.address);
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get address(): ContractAddress {
    return this.#address;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get query(): ContractApi['query'] {
    return newProxyChain(
      new QueryExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return newProxyChain(
      new TxExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['tx'];
  }

  get events(): ContractApi['events'] {
    return newProxyChain(
      new EventExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['events'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }

  get storage(): ContractApi['storage'] {
    return {
      root: async (): Promise<ContractApi['types']['RootStorage']> => {
        checkStorageApiSupports(this.metadata.version);

        const { ty, root_key } = this.metadata.storage.root as RootLayoutV5;

        const rawValue = await this.#getStorage(root_key as HexString);

        return this.registry.findCodec(ty).tryDecode(rawValue);
      },
      lazy: (): ContractApi['types']['LazyStorage'] => {
        checkStorageApiSupports(this.metadata.version);

        const { ty } = this.metadata.storage.root as RootLayoutV5;

        const $lazyCodec = this.registry.createLazyCodec(ty);

        return $lazyCodec ? $lazyCodec.tryDecode('0x') : {};
      },
    };
  }

  #getStorage = async (key: Uint8Array | HexString): Promise<HexString | undefined> => {
    const result = await (async () => {
      if (this.registry.isRevive()) {
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
