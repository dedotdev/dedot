import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32 } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMessageArg, ContractCallMessage } from '../types/index.js';
import { ContractMetadata } from '../types/index.js';

export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  readonly #api: ISubstrateClient<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #address?: AccountId32;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, address?: AccountId32) {
    this.#api = api;
    this.#registry = registry;
    if (address) {
      this.#address = new AccountId32(address);
    }
  }

  get api(): ISubstrateClient<ChainApi> {
    return this.#api;
  }

  get metadata(): ContractMetadata {
    return this.#registry.metadata;
  }

  get address(): AccountId32 | undefined {
    return this.#address;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  abstract doExecute(...paths: string[]): unknown;

  tryEncode(param: ContractMessageArg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(meta: ContractCallMessage, raw: any) {
    const {
      returnType: { type },
    } = meta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
