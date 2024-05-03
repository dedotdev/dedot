import { AccountId32 } from '@dedot/codecs';
import { Arg, ContractMessage } from '@dedot/contracts';
import { GenericSubstrateApi } from '@dedot/types';
import { Dedot } from 'dedot';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMetadata } from '../types/index.js';

export abstract class Executor<ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #address?: AccountId32;

  constructor(api: Dedot<ChainApi>, registry: TypinkRegistry, address?: AccountId32 | string) {
    this.#api = api;
    this.#registry = registry;
    if (address) {
      this.#address = new AccountId32(address);
    }
  }

  get api(): Dedot<ChainApi> {
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

  tryEncode(param: Arg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(messageMeta: ContractMessage, raw: any) {
    const {
      returnType: { type },
    } = messageMeta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
