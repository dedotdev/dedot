import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMessageArg, ContractMessage, Options } from '../types/index.js';
import { ContractMetadata } from '../types/index.js';

export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  readonly #api: ISubstrateClient<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #options: Options;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, options: Options = {}) {
    this.#api = api;
    this.#registry = registry;
    this.#options = options;
  }

  get api(): ISubstrateClient<ChainApi> {
    return this.#api;
  }

  get metadata(): ContractMetadata {
    return this.#registry.metadata;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get options(): Options {
    return this.#options;
  }

  abstract doExecute(...paths: string[]): unknown;

  tryEncode(param: ContractMessageArg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(meta: ContractMessage, raw: any) {
    const {
      returnType: { type },
    } = meta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
