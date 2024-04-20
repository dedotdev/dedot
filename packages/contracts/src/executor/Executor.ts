import { AccountId32 } from '@dedot/codecs';
import { TypinkRegistry } from '@dedot/codecs/registry/TypinkRegistry';
import { Arg, ContractMessage, ContractMetadata } from '@dedot/types';
import { GenericSubstrateApi } from '@dedot/types';
import { Dedot } from 'dedot';

export default abstract class Executor<ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #address: AccountId32;
  readonly #registry: TypinkRegistry;

  constructor(api: Dedot<ChainApi>, address: AccountId32 | string, registry: TypinkRegistry) {
    this.#api = api;
    this.#address = new AccountId32(address);
    this.#registry = registry;
  }

  get api(): Dedot<ChainApi> {
    return this.#api;
  }

  get contractMetadata(): ContractMetadata {
    return this.#registry.metadata;
  }

  get address(): AccountId32 {
    return this.#address;
  }

  get registry() {
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
