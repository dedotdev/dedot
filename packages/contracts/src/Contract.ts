import { ISubstrateClient } from '@dedot/api';
import { AccountId32, AccountId32Like, Bytes } from '@dedot/codecs';
import { IEventRecord } from '@dedot/types';
import { assert, HexString, toU8a } from '@dedot/utils';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import {
  ContractEvent,
  ContractMetadata,
  GenericContractApi,
  ExecutionOptions,
  GenericUnpackedStorage,
} from './types/index.js';
import { ensureSupportContractsPallet, newProxyChain, parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: TypinkRegistry;
  readonly #address: AccountId32;
  readonly #metadata: ContractMetadata;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: ContractMetadata | string,
    address: AccountId32Like,
    options?: ExecutionOptions,
  ) {
    ensureSupportContractsPallet(client);

    this.#address = new AccountId32(address);
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;

    const getStorage = this.#getStorage.bind(this);

    this.#registry = new TypinkRegistry(this.#metadata, getStorage);
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

  get address(): AccountId32 {
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
        const { ty, root_key } = this.metadata.storage.root;

        const rawValue = await this.#getStorage(root_key as HexString);

        return this.registry.findCodec(ty).tryDecode(rawValue);
      },
      unpacked: async (): Promise<GenericUnpackedStorage> => {
        const { ty, root_key } = this.metadata.storage.root;

        const typeDef = this.registry.findType(ty)!;
        console.dir(typeDef, { depth: null });
        // const typeDef = this.metadata.types.find(({ id }) => id === ty);
        assert(typeDef, 'Root TypeDef Not Found');

        // 1. clone this typeDef
        // 2. recursively look through the structure of this root typeDef
        //    - only keep type with path start with ['ink_storage', 'lazy']
        //    - remove all other types
        // 3. create a codec with the new typeDef after removal

        // Create a new type without primitive types, only lazy types
        // typeDef.type.

        throw new Error('To implement!');
      },
    };
  }

  #getStorage = async (key: Uint8Array | HexString): Promise<Bytes | undefined> => {
    const rawKey = toU8a(key);
    const result = await this.client.call.contractsApi.getStorage(this.address.address(), rawKey);

    // console.log('[getStorage]', result);

    if (result.isOk) {
      return result.value;
    }

    throw new Error(result.err);
  };
}
