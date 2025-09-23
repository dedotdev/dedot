import { ISubstrateClient } from '@dedot/api';
import { IEventRecord } from '@dedot/types';
import { DedotError, HexString, toHex, toU8a } from '@dedot/utils';
import { SolRegistry } from './SolRegistry.js';
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
  ensureStorageApiSupports,
  ensureSupportedContractMetadataVersion,
  ensureValidContractAddress,
  isInkAbi,
  isSolAbi,
  newProxyChain,
} from './utils/index.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: AB<ContractApi['metadataType'], TypinkRegistry, SolRegistry>;
  readonly #metadata: AB<ContractApi['metadataType'], ContractMetadata, SolAbi>;
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

    if (isInkAbi(this.metadata)) {
      this.#isInk = true;

      ensureSupportedContractMetadataVersion(this.metadata as ContractMetadata);
      const getStorage = this.#getStorage.bind(this);

      // @ts-ignore
      this.#registry = new TypinkRegistry(this.metadata as ContractMetadata, { getStorage });

      ensurePalletPresence(client, (this.registry as TypinkRegistry).isRevive());
      ensureValidContractAddress(address, (this.registry as TypinkRegistry).isRevive());
    } else if (isSolAbi(this.metadata)) {
      // @ts-ignore
      this.#registry = new SolRegistry(this.metadata as SolAbi);

      ensurePalletPresence(client, true);
      ensureValidContractAddress(address, true);
    } else {
      throw new DedotError('Unknown metadata format (neither ink! nor Solidity ABI)');
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

  get metadata(): AB<ContractApi['metadataType'], ContractMetadata, SolAbi> {
    return this.#metadata;
  }

  get registry(): AB<ContractApi['metadataType'], TypinkRegistry, SolRegistry> {
    return this.#registry;
  }

  get query(): ContractApi['query'] {
    const Executor = this.#isInk ? QueryExecutor : SolQueryExecutor;
    // @ts-ignore
    return newProxyChain(new Executor(this.client, this.registry, this.address, this.options)) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    const Executor = this.#isInk ? TxExecutor : SolTxExecutor;
    // @ts-ignore
    return newProxyChain(new Executor(this.client, this.registry, this.address, this.options)) as ContractApi['tx'];
  }

  get events(): ContractApi['events'] {
    const Executor = this.#isInk ? EventExecutor : SolEventExecutor;
    // @ts-ignore
    return newProxyChain(new Executor(this.client, this.registry, this.address, this.options)) as ContractApi['events'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }

  get storage(): ContractApi['storage'] {
    if (!this.#isInk) {
      throw new DedotError('Storage API is only available for ink! contracts');
    }

    return {
      root: async (): Promise<ContractApi['types']['RootStorage']> => {
        ensureStorageApiSupports((this.metadata as ContractMetadata).version);

        const { ty, root_key } = (this.metadata as ContractMetadata).storage.root as RootLayoutV5;

        const rawValue = await this.#getStorage(root_key as HexString);

        // @ts-ignore
        return (this.registry as TypinkRegistry).findCodec(ty).tryDecode(rawValue);
      },
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
